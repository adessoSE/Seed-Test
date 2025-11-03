import { ObjectId } from 'mongodb';
import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import * as userService from './user.service'; // To fetch/update the user document
import { User } from '@shared/models/User';

const cryptoAlgorithm = 'aes-256-ccm';
// It's recommended to move secrets to environment variables or a config service
const jiraSecret = process.env.JIRA_SECRET || "anotherUnsaveSecret";
const jiraSalt = process.env.JIRA_SALT || "9bNyV23AbaC7";
const key = scryptSync(jiraSecret, jiraSalt, 32);

// --- Jira Credential Encryption/Decryption (Specific to this service) ---

function jiraEncryptPassword(pass: string): { ciphertext: Buffer, nonce: Buffer, tag: Buffer } {
    const nonce = randomBytes(13);
    const cipher = createCipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
    const ciphertext = Buffer.concat([cipher.update(pass, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext, nonce, tag };
}

export function jiraDecryptPassword(
    ciphertext: { $binary: { base64: string, subType: string } } | Buffer,
    nonce: { $binary: { base64: string, subType: string } } | Buffer,
    tag: { $binary: { base64: string, subType: string } } | Buffer
): string {
    // Ensure inputs are Buffers
    const cipherBuffer = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext.$binary.base64, 'base64');
    const nonceBuffer = Buffer.isBuffer(nonce) ? nonce : Buffer.from(nonce.$binary.base64, 'base64');
    const tagBuffer = Buffer.isBuffer(tag) ? tag : Buffer.from(tag.$binary.base64, 'base64');

    try {
        const decipher = createDecipheriv(cryptoAlgorithm, key, nonceBuffer, { authTagLength: 16 });
        decipher.setAuthTag(tagBuffer);
        const receivedPlaintext = Buffer.concat([decipher.update(cipherBuffer), decipher.final()]).toString('utf8');
        return receivedPlaintext;
    } catch (err) {
        console.error(`Jira Decryption Failed: ${err}`); // Log appropriately
        throw new Error('Jira password decryption failed!');
    }
}

/**
 * Builds the Authorization header string for Jira/Github API requests.
 * @param accountName The Jira/Github username.
 * @param clearPass The decrypted Jira/Github password or API token.
 * @param authMethod The authentication method ('basic' or 'bearer').
 * @returns The formatted Authorization header value.
 */
export function buildAuthString(accountName: string, clearPass: string, authMethod?: string): string {
    if (authMethod === 'basic') {
        const auth = Buffer.from(`${accountName}:${clearPass}`).toString('base64');
        return `Basic ${auth}`;
    }
    // Default to Bearer or PAT
    return `Bearer ${clearPass}`;
}

// --- Jira Account Linking ---

export async function updateJiraCredential(
    userId: string | ObjectId,
    username: string,
    jiraClearPassword: string,
    host: string,
    jiraAuthMethod: string
): Promise<void> {
    const { ciphertext, nonce, tag } = jiraEncryptPassword(jiraClearPassword);
    const jiraCredentials = {
        AccountName: username,
        Password: ciphertext, // Store Buffer directly if possible, or handle binary structure
        Password_Nonce: nonce,
        Password_Tag: tag,
        Host: host,
		AuthMethod: jiraAuthMethod
    };

    const user = await userService.getUserById(userId);
    if (!user) {
        throw new Error('User not found for updating Jira credentials.');
    }

    const updatedUser: User = { ...user, jira: jiraCredentials as any }; // Cast needed due to Buffer/Binary discrepancy
    await userService.updateUser(userId, updatedUser);
}

export async function disconnectJira(userId: string | ObjectId): Promise<void> {
    const user = await userService.getUserById(userId);
	if (!user) {
        throw new Error('User not found for disconnecting Jira.');
    }
    // Create a new object without the jira property
    const { jira, ...userWithoutJira } = user;
	await userService.updateUser(userId, userWithoutJira as User);
}

// --- GitHub Account Linking ---
// Note: GitHub linking often involves OAuth redirects handled directly in routes/controllers,
// but saving/removing the token would happen here.

export async function updateGithubToken(userId: string | ObjectId, token: string, githubProfile: { login: string; id: number }): Promise<void> {
     const user = await userService.getUserById(userId);
    if (!user) {
        throw new Error('User not found for updating GitHub token.');
    }
     const updatedUser: User = {
        ...user,
        github: {
            githubToken: token,
            login: githubProfile.login,
            id: githubProfile.id
        }
    };
    await userService.updateUser(userId, updatedUser);
}


export async function disconnectGithub(userId: string | ObjectId): Promise<void> {
     const user = await userService.getUserById(userId);
	if (!user) {
        throw new Error('User not found for disconnecting GitHub.');
    }
    const { github, ...userWithoutGithub } = user;
	await userService.updateUser(userId, userWithoutGithub as User);
}

// --- GitHub Validation (Helper - could also be in a general 'validation' helper) ---

/**
* Validates Github username and reponame format.
* @returns boolean, true if they are valid.
*/
export function checkValidGithubFormat(userName?: string, repoName?: string): boolean {
    if (!userName || !repoName) return false;
    const githubUsernameCheck = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
    const githubReponameCheck = /^([a-z\d._-]){0,100}$/i;
    return !!(githubUsernameCheck.test(userName) && githubReponameCheck.test(repoName));
}