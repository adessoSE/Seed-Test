import { createHash } from 'node:crypto';

/**
 * Hashes a plaintext password the way the frontend does before sending it to the login and register routes.
 * WHY: The backend stores bcrypt(digest), so a plaintext sent instead would fail every later login.
 * @param plain Plaintext password typed by the user.
 * @returns Lowercase hex SHA-256 digest of the UTF-8 bytes.
 */
export function sha256Hex(plain: string): string {
	return createHash('sha256').update(plain, 'utf8').digest('hex');
}
