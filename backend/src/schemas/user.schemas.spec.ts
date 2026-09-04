import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, mergeGithubSchema, updateUserSchema } from '@seed-test/shared/schemas/user.schemas.js';

describe('loginSchema', () => {
	it('accepts valid login', () => {
		const result = loginSchema.safeParse({ email: 'test@example.com', password: 'secret' });
		expect(result.success).toBe(true);
	});

	it('accepts login with stayLoggedIn', () => {
		const result = loginSchema.safeParse({ email: 'test@example.com', password: 'pw', stayLoggedIn: true });
		expect(result.success).toBe(true);
	});

	it('rejects invalid email', () => {
		const result = loginSchema.safeParse({ email: 'not-email', password: 'secret' });
		expect(result.success).toBe(false);
	});

	it('rejects missing password', () => {
		const result = loginSchema.safeParse({ email: 'test@example.com' });
		expect(result.success).toBe(false);
	});

	it('rejects empty password', () => {
		const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
		expect(result.success).toBe(false);
	});
});

describe('registerSchema', () => {
	it('accepts valid registration', () => {
		const result = registerSchema.safeParse({ email: 'new@example.com', password: 'secure123' });
		expect(result.success).toBe(true);
	});

	it('rejects short password', () => {
		const result = registerSchema.safeParse({ email: 'new@example.com', password: '12345' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid email', () => {
		const result = registerSchema.safeParse({ email: 'bad', password: 'secure123' });
		expect(result.success).toBe(false);
	});
});

describe('forgotPasswordSchema', () => {
	it('accepts valid email', () => {
		expect(forgotPasswordSchema.safeParse({ email: 'user@test.de' }).success).toBe(true);
	});

	it('rejects missing email', () => {
		expect(forgotPasswordSchema.safeParse({}).success).toBe(false);
	});
});

describe('resetPasswordSchema', () => {
	it('accepts valid UUID and password', () => {
		const result = resetPasswordSchema.safeParse({
			uuid: '550e8400-e29b-41d4-a716-446655440000',
			password: 'newpass123'
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid UUID', () => {
		const result = resetPasswordSchema.safeParse({ uuid: 'not-a-uuid', password: 'newpass123' });
		expect(result.success).toBe(false);
	});

	it('rejects short password', () => {
		const result = resetPasswordSchema.safeParse({
			uuid: '550e8400-e29b-41d4-a716-446655440000',
			password: '12345'
		});
		expect(result.success).toBe(false);
	});
});

describe('mergeGithubSchema', () => {
	it('accepts valid merge data', () => {
		const result = mergeGithubSchema.safeParse({ userId: 'abc123', login: 'ghuser', id: 12345 });
		expect(result.success).toBe(true);
	});

	it('rejects non-integer id', () => {
		const result = mergeGithubSchema.safeParse({ userId: 'abc123', login: 'ghuser', id: 1.5 });
		expect(result.success).toBe(false);
	});

	it('rejects missing fields', () => {
		expect(mergeGithubSchema.safeParse({ userId: 'abc' }).success).toBe(false);
		expect(mergeGithubSchema.safeParse({}).success).toBe(false);
	});
});

describe('updateUserSchema', () => {
	it('accepts currentPassword and newPassword', () => {
		const result = updateUserSchema.safeParse({ currentPassword: 'old-password', newPassword: 'new-password' });
		expect(result.success).toBe(true);
	});

	it('rejects missing currentPassword', () => {
		const result = updateUserSchema.safeParse({ newPassword: 'new-password' });
		expect(result.success).toBe(false);
	});

	it('rejects too-short newPassword', () => {
		const result = updateUserSchema.safeParse({ currentPassword: 'old-password', newPassword: '12345' });
		expect(result.success).toBe(false);
	});

	it('rejects unknown fields (no silent drop)', () => {
		// Email is not part of the schema — it must fail rather than be silently stripped
		const result = updateUserSchema.safeParse({ currentPassword: 'old-password', newPassword: 'new-password', email: 'x@x.com' });
		expect(result.success).toBe(false);
		// strict() flags the unrecognized key
		expect(result.error?.issues.some(i => i.code === 'unrecognized_keys' && i.message.toLowerCase().includes('email'))).toBe(true);
	});
});

