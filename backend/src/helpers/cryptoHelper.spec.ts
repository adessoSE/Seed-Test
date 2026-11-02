import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.ENCRYPTION_SECRET = 'a'.repeat(64);

// Import config module and call validateConfig before cryptoHelper
// to ensure validatedConfig.value is set
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let cryptoHelper: typeof import('./cryptoHelper.js');
beforeEach(async () => {
	const config = await import('../config.js');
	config.validateConfig();
	cryptoHelper = await vi.importActual('./cryptoHelper.js');
});

describe('CryptoHelper', () => {

	describe('encrypt', () => {
		it('should return null for empty input', () => {
			expect(cryptoHelper.encrypt('')).toBeNull();
			expect(cryptoHelper.encrypt(null as any)).toBeNull();
		});

		it('should return nonce:encrypted:authTag format', () => {
			const result = cryptoHelper.encrypt('test-secret');
			expect(result).not.toBeNull();
			const parts = result!.split(':');
			expect(parts).toHaveLength(3);
			expect(parts[0]).toMatch(/^[0-9a-f]{24}$/);
			expect(parts[1]).toMatch(/^[0-9a-f]+$/);
			expect(parts[2]).toMatch(/^[0-9a-f]{32}$/);
		});

		it('should produce different ciphertexts for same input (random nonce)', () => {
			const a = cryptoHelper.encrypt('same-input');
			const b = cryptoHelper.encrypt('same-input');
			expect(a).not.toBe(b);
		});
	});

	describe('decrypt', () => {
		it('should return null for empty input', () => {
			expect(cryptoHelper.decrypt('')).toBeNull();
			expect(cryptoHelper.decrypt(null as any)).toBeNull();
		});

		it('should correctly round-trip encrypt/decrypt', () => {
			const original = 'my-api-key-12345';
			const encrypted = cryptoHelper.encrypt(original);
			const decrypted = cryptoHelper.decrypt(encrypted!);
			expect(decrypted).toBe(original);
		});

		it('should handle unicode text', () => {
			const original = 'Ü@ß€ñ日本語';
			const encrypted = cryptoHelper.encrypt(original);
			const decrypted = cryptoHelper.decrypt(encrypted!);
			expect(decrypted).toBe(original);
		});

		it('should return null for tampered ciphertext', () => {
			const encrypted = cryptoHelper.encrypt('secret')!;
			const parts = encrypted.split(':');
			parts[1] = 'ff' + parts[1].slice(2);
			const tampered = parts.join(':');
			expect(cryptoHelper.decrypt(tampered)).toBeNull();
		});

		it('should return null for invalid format', () => {
			expect(cryptoHelper.decrypt('not-valid-format')).toBeNull();
			expect(cryptoHelper.decrypt('only:two')).toBeNull();
		});
	});
});