import { sha256Hex } from './crypto';

/** SHA-256 test vectors from FIPS 180-2 and a multi-byte UTF-8 input */
const ABC_DIGEST = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const EMPTY_DIGEST = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Runs `fn` with `window.crypto.subtle` hidden, simulating a non-secure http origin
 * where WebCrypto is not exposed. The own property shadows the prototype getter and is
 * removed again afterwards.
 */
async function withoutSubtle<T>(fn: () => Promise<T>): Promise<T> {
	Object.defineProperty(window.crypto, 'subtle', { value: undefined, configurable: true });
	try {
		return await fn();
	} finally {
		delete (window.crypto as unknown as { subtle?: unknown }).subtle;
	}
}

describe('sha256Hex', () => {

	it('should return the SHA-256 digest via WebCrypto when available', async () => {
		expect(await sha256Hex('abc')).toBe(ABC_DIGEST);
		expect(await sha256Hex('')).toBe(EMPTY_DIGEST);
	});

	// Regression: on http (non-secure context) crypto.subtle is undefined and the change-password
	// flow threw a TypeError, so the password hash was never sent.
	it('should return the same digest without crypto.subtle (non-secure http)', async () => {
		expect(await withoutSubtle(() => sha256Hex('abc'))).toBe(ABC_DIGEST);
		expect(await withoutSubtle(() => sha256Hex(''))).toBe(EMPTY_DIGEST);
	});

	it('should hash multi-byte UTF-8 identically with and without crypto.subtle', async () => {
		const input = 'Grüße € 🙂 <pw>';
		const withSubtle = await sha256Hex(input);
		const fallback = await withoutSubtle(() => sha256Hex(input));

		expect(fallback).toBe(withSubtle);
	});

	it('should hash inputs longer than one 64-byte block identically', async () => {
		const input = 'x'.repeat(200);
		const withSubtle = await sha256Hex(input);

		expect(await withoutSubtle(() => sha256Hex(input))).toBe(withSubtle);
	});
});
