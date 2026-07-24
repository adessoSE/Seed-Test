import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const NONCE_LENGTH = 12; // GCM standard nonce length

const envSecret = process.env.ENCRYPTION_SECRET; // Must be 32 bytes (64 hex characters)
if (!envSecret || envSecret.length !== 64)
	throw new Error('Invalid ENCRYPTION_SECRET. It must be a 64-character hex string.');

const ENCRYPTION_KEY: string = envSecret;


/**
 * Encrypts a text string using AES-256-GCM.
 * @param text The text to encrypt.
 * @returns The encrypted text in format 'nonce:encrypted:authTag', or null if input is empty.
 */
export function encrypt(text: string): string | null {
	if (!text) return null;

	const nonce = crypto.randomBytes(NONCE_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), nonce);

	let encrypted = cipher.update(text, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	const authTag = cipher.getAuthTag().toString('hex');

	return `${nonce.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * @param encryptedText The text to decrypt (format 'nonce:encrypted:authTag').
 * @returns The original decrypted text, or null if decryption fails (tampered data).
 */
export function decrypt(encryptedText: string): string | null {
	if (!encryptedText) return null;

	try {
		const textParts = encryptedText.split(':');
		if (textParts.length !== 3) throw new Error('Invalid encrypted text format.');

		const nonce = Buffer.from(textParts[0], 'hex');
		const encrypted = textParts[1];
		const authTag = Buffer.from(textParts[2], 'hex');

		const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), nonce);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
		console.error('Decryption failed. Data might be tampered with or key is wrong.', error);
		return null;
	}
}