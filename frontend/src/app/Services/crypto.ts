/**
 * SHA-256 hex digest of the UTF-8 encoding of `data`.
 *
 * This is the single canonical credential-hash used across the login, register,
 * password-reset and change-password flows. The backend stores `bcrypt(SHA-256(pw))`,
 * so the controller's `bcrypt.compare` only matches a value produced by this helper —
 * sending a raw password never verifies. Both services must therefore use this one
 * implementation so the hex output is byte-for-byte identical everywhere.
 *
 * Uses WebCrypto when available. On non-secure http origins `window.crypto.subtle` is
 * undefined, so the pure-TypeScript fallback below produces the same digest instead of
 * throwing (which previously broke change-password on http).
 *
 * WHY: Over plain http the digest is password-equivalent. The backend accepts it as the
 * credential, so anyone who sees it on the wire can log in without the password. Hashing
 * adds no protection there. It is kept on every origin only so that login, register and
 * change-password send the same value that the stored bcrypt(SHA-256) hash was made from.
 * Real protection needs https.
 */
export async function sha256Hex(data: string): Promise<string> {
	const textAsBuffer = new TextEncoder().encode(data);
	// CASE 1: WebCrypto available (secure context)
	if (window.crypto?.subtle) {
		const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);
		return Array.from(new Uint8Array(hashBuffer))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');
	}
	// CASE 2: non-secure http origin — no WebCrypto, use the pure-JS implementation
	return sha256Fallback(textAsBuffer);
}

/** SHA-256 round constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes) */
const SHA256_K = new Uint32Array([
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

/**
 * Rotate a 32-bit word right by `n` bits (FIPS 180-4 ROTR).
 * @param x 32-bit word
 * @param n rotation count, 0 < n < 32
 */
function rotr(x: number, n: number): number {
	return (x >>> n) | (x << (32 - n));
}

/**
 * Pure-TypeScript SHA-256 (FIPS 180-4) used only when WebCrypto is unavailable.
 * Must stay byte-identical to `crypto.subtle.digest('SHA-256', ...)`, because the backend
 * compares against hashes produced by either path.
 * @param bytes UTF-8 encoded message
 * @returns lowercase hex digest
 */
function sha256Fallback(bytes: Uint8Array): string {
	// Padding: 0x80, zeros, then the 64-bit big-endian bit length; total length is a multiple of 64 bytes
	const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
	const padded = new Uint8Array(paddedLength);
	padded.set(bytes);
	padded[bytes.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(paddedLength - 8, Math.floor(bytes.length / 0x20000000));
	view.setUint32(paddedLength - 4, (bytes.length * 8) >>> 0);

	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	]);
	const w = new Uint32Array(64);

	for (let offset = 0; offset < paddedLength; offset += 64) {
		for (let i = 0; i < 16; i++)
			w[i] = view.getUint32(offset + i * 4);
		for (let i = 16; i < 64; i++) {
			const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
			const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
			w[i] = w[i - 16] + s0 + w[i - 7] + s1;
		}

		let [a, b, c, d, e, f, g, h] = hash;
		for (let i = 0; i < 64; i++) {
			const bigS1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = (e & f) ^ (~e & g);
			// Each working variable is wrapped with >>> 0 so the sums never exceed 2^32 by more than one term
			const t1 = (h + bigS1 + ch + SHA256_K[i] + w[i]) >>> 0;
			const bigS0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const t2 = (bigS0 + maj) >>> 0;
			h = g;
			g = f;
			f = e;
			e = (d + t1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (t1 + t2) >>> 0;
		}
		// Typed-array stores wrap modulo 2^32, which is the SHA-256 addition
		hash[0] += a;
		hash[1] += b;
		hash[2] += c;
		hash[3] += d;
		hash[4] += e;
		hash[5] += f;
		hash[6] += g;
		hash[7] += h;
	}

	return Array.from(hash)
		.map(word => word.toString(16).padStart(8, '0'))
		.join('');
}
