import { describe, it, expect } from 'vitest';

process.env.ENCRYPTION_SECRET = 'a'.repeat(64);

import { encrypt, decrypt } from './cryptoHelper.js';

describe('CryptoHelper', () => {

	describe('encrypt', () => {
		it('should return null for empty input', () => {
			expect(encrypt('')).toBeNull();
			expect(encrypt(null as any)).toBeNull();
		});

		it('should return nonce:encrypted:authTag format', () => {
			const result = encrypt('test-secret');
			expect(result).not.toBeNull();
			const parts = result!.split(':');
			expect(parts).toHaveLength(3);
			expect(parts[0]).toMatch(/^[0-9a-f]{24}$/);
			expect(parts[1]).toMatch(/^[0-9a-f]+$/);
			expect(parts[2]).toMatch(/^[0-9a-f]{32}$/);
		});

		it('should produce different ciphertexts for same input (random nonce)', () => {
			const a = encrypt('same-input');
			const b = encrypt('same-input');
			expect(a).not.toBe(b);
		});
	});

	describe('decrypt', () => {
		it('should return null for empty input', () => {
			expect(decrypt('')).toBeNull();
			expect(decrypt(null as any)).toBeNull();
		});

		it('should correctly round-trip encrypt/decrypt', () => {
			const original = 'my-api-key-12345';
			const encrypted = encrypt(original);
			const decrypted = decrypt(encrypted!);
			expect(decrypted).toBe(original);
		});

		it('should handle unicode text', () => {
			const original = 'Ü@ß€ñ日本語';
			const encrypted = encrypt(original);
			const decrypted = decrypt(encrypted!);
			expect(decrypted).toBe(original);
		});

		it('should return null for tampered ciphertext', () => {
			const encrypted = encrypt('secret')!;
			const parts = encrypted.split(':');
			parts[1] = 'ff' + parts[1].slice(2);
			const tampered = parts.join(':');
			expect(decrypt(tampered)).toBeNull();
		});

		it('should return null for invalid format', () => {
			expect(decrypt('not-valid-format')).toBeNull();
			expect(decrypt('only:two')).toBeNull();
		});
	});
});
