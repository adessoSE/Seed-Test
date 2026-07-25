import { ObjectId, Binary } from 'mongodb';
import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import * as userService from './user.service'; // To fetch/update the user document
import { User } from '@shared/models/User';
import { logger } from '../logging';

const cryptoAlgorithm = 'aes-256-ccm';
// It's recommended to move secrets to environment variables or a config service
const jiraSecret = process.env.JIRA_SECRET;
const jiraSalt = process.env.JIRA_SALT;
if (!jiraSecret || !jiraSalt) {
	logger.error('FATAL: JIRA_SECRET and JIRA_SALT environment variables must be set.');
	process.exit(1);
}
const key = scryptSync(jiraSecret, jiraSalt, 32);

/**
 * Represents the BSON format for binary data
 * (often seen in manual queries or stringified output).
 */
type BsonBinary = {
	$binary: {
		base64: string;
		subType: string;
	}
};

/**
 * Defines the possible input types for the encrypted data, which can be:
 * 1. A raw Buffer.
 * 2. A BSON object (from stringify/parse).
 * 3. A Binary object (directly from the mongodb 6.x+ driver).
 */
type CipherInput = Buffer | BsonBinary | Binary;

// --- Jira Credential Encryption/Decryption (Specific to this service) ---

function jiraEncryptPassword(pass: string): { ciphertext: Buffer, nonce: Buffer, tag: Buffer } {
	const nonce = randomBytes(13);
	const cipher = createCipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
	const ciphertext = Buffer.concat([cipher.update(pass, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return { ciphertext, nonce, tag };
}

export function jiraDecryptPassword(
	ciphertext: CipherInput,
	nonce: CipherInput,
	tag: CipherInput
): string {
    
	// Ensure all inputs are Buffers using the helper
	const cipherBuffer = toBuffer(ciphertext);
	const nonceBuffer = toBuffer(nonce);
	const tagBuffer = toBuffer(tag);

	try {
		const decipher = createDecipheriv(cryptoAlgorithm, key, nonceBuffer, { authTagLength: 16 });
		decipher.setAuthTag(tagBuffer);
		const receivedPlaintext = Buffer.concat([decipher.update(cipherBuffer), decipher.final()]).toString('utf8');
		return receivedPlaintext;
	} catch (err) {
		logger.error(`Jira Decryption Failed: ${err}`);
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
	if (!user) 
		throw new Error('User not found for updating Jira credentials.');
    

	const updatedUser: User = { ...user, jira: jiraCredentials as any }; // Cast needed due to Buffer/Binary discrepancy
	await userService.updateUser(userId, updatedUser);
}

export async function disconnectJira(userId: string | ObjectId): Promise<void> {
	const user = await userService.getUserById(userId);
	if (!user) 
		throw new Error('User not found for disconnecting Jira.');
    
	// Create a new object without the jira property
	const { jira: _jira, ...userWithoutJira } = user;
	await userService.updateUser(userId, userWithoutJira as User);
}

// --- GitHub Account Linking ---
// Note: GitHub linking often involves OAuth redirects handled directly in routes/controllers,
// but saving/removing the token would happen here.

export async function updateGithubToken(userId: string | ObjectId, token: string, githubProfile: { login: string; id: number }): Promise<void> {
	const user = await userService.getUserById(userId);
	if (!user) 
		throw new Error('User not found for updating GitHub token.');
    
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
	if (!user) 
		throw new Error('User not found for disconnecting GitHub.');
    
	const { github: _github, ...userWithoutGithub } = user;
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

// --- Helper functions ---
/**
 * Helper function to safely convert any supported crypto input type into a Buffer.
 * @param input The data to convert.
 * @returns A Buffer instance.
 */
function toBuffer(input: CipherInput): Buffer {
	// Priority 1: Already a Buffer
	if (Buffer.isBuffer(input)) 
		return input;
    
    
	// Priority 2: MongoDB v6+ Binary type (has a .buffer property)
	// We check for 'instanceof' for robustness.
	if (input instanceof Binary) 
	// input.buffer is a standard Uint8Array. We must convert it to a full Node.js Buffer
		return Buffer.from(input.buffer);
    

	// Priority 3: BSON object structure (e.g., from logs or older drivers)
	// Check if input is a plain object and has the $binary key
	if (typeof input === 'object' && input !== null && (input as BsonBinary).$binary) 
		return Buffer.from((input as BsonBinary).$binary.base64, 'base64');
    

	// Fallback/Error
	logger.error(`Failed to convert crypto input to Buffer. Input type: ${typeof input}`);
	throw new Error('Invalid crypto input type: unable to convert to Buffer.');
}