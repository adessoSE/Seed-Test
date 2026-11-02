import { randomBytes, randomInt } from 'node:crypto';
import { renameSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { request, type APIRequestContext, type FullConfig } from '@playwright/test';
import { ACCOUNT_PATH, API_URL, AUTH_DIR, BASE_URL, STORAGE_STATE_PATH } from './helpers/config';
import { sha256Hex } from './helpers/crypto';

/** A saved session younger than this is reused; the backend session itself lasts one day. */
const MAX_SESSION_AGE_MS = 6 * 60 * 60 * 1000;

/** Extra read attempts when the session file does not parse; another run may be replacing it at that moment. */
const SESSION_READ_RETRIES = 5;

/** Pause between session-file read attempts. */
const SESSION_READ_RETRY_MS = 500;

/** How long GET /user/ may keep failing on network errors (backend restarting) before the run stops with an error. */
const PROBE_TIMEOUT_MS = 90_000;

/** Pause between GET /user/ attempts while the backend is unreachable. */
const PROBE_RETRY_MS = 2_000;

/** Shape of a Playwright storageState object (cookies plus per-origin localStorage). */
type Session = Awaited<ReturnType<APIRequestContext['storageState']>>;

/** Alphabet for the random test password. */
const PASSWORD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generates a random 16-character password for the throwaway test account.
 * @returns Plaintext password (stored only in the git-ignored .auth directory).
 */
function randomPassword(): string {
	let out = '';
	for (let i = 0; i < 16; i++)
		out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
	return out;
}

/**
 * Waits for the given number of milliseconds.
 * @param ms Duration to wait.
 */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Writes a file so that readers see either the old or the new content, never a partial write.
 * WHY: other runs read these files while they are written; a half-written JSON would look like a corrupt session.
 * A temp file per process renamed over the target is atomic on the same volume.
 * @param target Destination path.
 * @param content File content.
 */
async function writeFileAtomic(target: string, content: string): Promise<void> {
	const temp = `${target}.tmp-${process.pid}`;
	await writeFile(temp, content);
	// Windows refuses the rename with EPERM while another run has the target open; that lock lasts milliseconds
	for (let attempt = 1; ; attempt++) {
		try {
			renameSync(temp, target);
			return;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EPERM' || attempt === 10) throw error;
			await new Promise(resolve => setTimeout(resolve, 100 * attempt));
		}
	}
}

/**
 * Writes the session to STORAGE_STATE_PATH with the frontend's login flag for the app origin.
 * WHY: the session cookie alone is not enough. AuthGuard.isLoggedIn() reads localStorage.login, and storageState
 * restores localStorage only when it is listed under origins. Without it every spec is redirected to /login.
 * Side effect: overwrites the session file.
 * @param session Session from APIRequestContext.storageState() or a previously saved file.
 */
async function saveSession(session: Session): Promise<void> {
	const otherOrigins = session.origins.filter(entry => entry.origin !== BASE_URL);
	const origins = [...otherOrigins, { origin: BASE_URL, localStorage: [{ name: 'login', value: 'true' }] }];
	await writeFileAtomic(STORAGE_STATE_PATH, JSON.stringify({ ...session, origins }, null, '\t'));
}

/**
 * Reads the saved session file, retrying while it does not parse.
 * WHY: a concurrent run may be replacing the file; a parse failure during that window is transient. A missing file
 * is not retried because it means there is no session to reuse.
 * @returns The parsed session, or undefined when the file is missing or still does not parse after all retries.
 */
async function readSessionFile(): Promise<Session | undefined> {
	for (let attempt = 0; ; attempt++) {
		let text: string;
		try {
			text = await readFile(STORAGE_STATE_PATH, 'utf8');
		} catch {
			return undefined;
		}
		try {
			return JSON.parse(text) as Session;
		} catch {
			if (attempt >= SESSION_READ_RETRIES)
				return undefined;
			await sleep(SESSION_READ_RETRY_MS);
		}
	}
}

/**
 * Checks a saved session against the backend with GET /user/.
 * WHY: only a definite rejection (401/403) means the session is gone. Any other failure (connection refused or reset
 * while the backend restarts, a 5xx from a proxy) is retried, because registering a new user here would spend the
 * shared auth rate-limit budget for nothing.
 * @param session Saved session to send as cookies.
 * @returns 'valid' when the backend accepts the session, 'expired' when it rejects it with 401/403.
 * @throws When the backend keeps failing for PROBE_TIMEOUT_MS, so the run stops instead of registering.
 */
async function probeSession(session: Session): Promise<'valid' | 'expired'> {
	const deadline = Date.now() + PROBE_TIMEOUT_MS;
	const api = await request.newContext({ storageState: session });
	try {
		let lastFailure = '';
		for (;;) {
			try {
				const response = await api.get(`${API_URL}/user/`);
				if (response.status() === 200)
					return 'valid';
				if (response.status() === 401 || response.status() === 403)
					return 'expired';
				lastFailure = `HTTP ${response.status()}`;
			} catch (error) {
				lastFailure = error instanceof Error ? error.message : String(error);
			}
			if (Date.now() >= deadline)
				throw new Error(`global-setup: GET /user/ kept failing for ${PROBE_TIMEOUT_MS / 1000} s (${lastFailure}); backend down? No new user was registered.`);
			await sleep(PROBE_RETRY_MS);
		}
	} finally {
		await api.dispose();
	}
}

/**
 * Returns true when a saved session can be reused: the file is fresh and the backend still accepts it.
 * WHY: Reusing the session saves the auth rate-limit budget across repeated runs.
 * @param session Parsed session from readSessionFile.
 * @returns True when the existing storageState is still valid.
 */
async function canReuseSession(session: Session): Promise<boolean> {
	try {
		const info = await stat(STORAGE_STATE_PATH);
		await stat(ACCOUNT_PATH);
		if (Date.now() - info.mtimeMs > MAX_SESSION_AGE_MS)
			return false;
	} catch {
		return false;
	}
	return (await probeSession(session)) === 'valid';
}

/**
 * Registers one fresh test user, logs it in and stores the session as storageState for all tests.
 * Runs once before the suite (playwright config globalSetup). Side effect: creates a user in the
 * backend database the stack points to (test data only, never Atlas).
 * WHY: login and register share the `authLimiter` (backend/src/routes/user.routes.ts), so a run spends at most two of those requests.
 * @param config Playwright config (unused, required by the globalSetup signature).
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
	void config;
	await mkdir(AUTH_DIR, { recursive: true });

	const session = await readSessionFile();
	if (session && await canReuseSession(session)) {
		// Session files saved before the login flag existed are upgraded in place, so no auth request is spent
		await saveSession(session);
		return;
	}

	const email = `e2e-${randomBytes(4).toString('hex')}@seedtest.test`;
	const password = randomPassword();
	const api = await request.newContext();
	try {
		// The frontend sends the SHA-256 digest, never the plaintext, to register and login
		const register = await api.post(`${API_URL}/user/register`, { data: { email, password: sha256Hex(password) } });
		if (register.status() !== 201)
			throw new Error(`global-setup: register failed with HTTP ${register.status()}: ${await register.text()}`);

		const login = await api.post(`${API_URL}/user/login`, { data: { email, password: sha256Hex(password) } });
		if (login.status() !== 200)
			throw new Error(`global-setup: login failed with HTTP ${login.status()}: ${await login.text()}`);

		// The session cookie is host-scoped (localhost), so the frontend on port 4200 sends it to the API on 8080
		await saveSession(await api.storageState());
	} finally {
		await api.dispose();
	}
	await writeFileAtomic(ACCOUNT_PATH, JSON.stringify({ email, password }, null, '\t'));
}
