/**
 * SHA-256 hex digest of the UTF-8 encoding of `data`, computed via WebCrypto.
 *
 * This is the single canonical credential-hash used across the login, register,
 * password-reset and change-password flows. The backend stores `bcrypt(SHA-256(pw))`,
 * so the controller's `bcrypt.compare` only matches a value produced by this helper —
 * sending a raw password never verifies. Both services must therefore use this one
 * implementation so the hex output is byte-for-byte identical everywhere.
 */
export async function sha256Hex(data: string): Promise<string> {
	const textAsBuffer = new TextEncoder().encode(data);
	const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}
