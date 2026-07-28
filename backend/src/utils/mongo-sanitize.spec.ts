import { describe, it, expect } from 'vitest';
import { mongoSanitize } from './mongo-sanitize.js';

describe('mongoSanitize', () => {
	it('should strip keys starting with $', () => {
		const input = { email: 'test@test.de', $gt: 'injected' };
		const result = mongoSanitize(input);
		expect(result).toEqual({ email: 'test@test.de' });
		expect(result.$gt).toBeUndefined();
	});

	it('should strip nested $ keys', () => {
		const input = { user: { name: 'Alice', $ne: null } };
		mongoSanitize(input);
		expect(input.user).toEqual({ name: 'Alice' });
	});

	it('should handle deeply nested objects', () => {
		const input = { a: { b: { c: { $where: 'malicious' }, safe: true } } };
		mongoSanitize(input);
		expect(input.a.b.c).toEqual({});
		expect(input.a.b.safe).toBe(true);
	});

	it('should return primitives unchanged', () => {
		expect(mongoSanitize('hello')).toBe('hello');
		expect(mongoSanitize(42)).toBe(42);
		expect(mongoSanitize(null)).toBeNull();
		expect(mongoSanitize(undefined)).toBeUndefined();
	});

	it('should handle arrays with objects', () => {
		const input = [{ $gt: 1, valid: true }, { name: 'ok' }];
		mongoSanitize(input);
		expect(input[0]).toEqual({ valid: true });
		expect(input[1]).toEqual({ name: 'ok' });
	});

	it('should return empty object when all keys are operators', () => {
		const input = { $gt: 1, $lt: 10, $ne: 5 };
		mongoSanitize(input);
		expect(input).toEqual({});
	});
});
