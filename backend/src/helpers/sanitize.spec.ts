import { describe, it, expect } from 'vitest';
import { sanitize, hasDangerousKeys } from './sanitize.js';

describe('sanitize', () => {
	it('strips keys starting with $', () => {
		const input = { $gt: 1, $ne: null, safe: 'value' };
		sanitize(input);
		expect(input).toEqual({ safe: 'value' });
	});

	it('strips keys containing dots', () => {
		const input = { 'a.b': 1, 'foo.bar.baz': 2, safe: 'value' };
		sanitize(input);
		expect(input).toEqual({ safe: 'value' });
	});

	it('handles classic NoSQL injection: { email: { $ne: null } }', () => {
		const input = { email: { $ne: null } };
		sanitize(input);
		expect(input).toEqual({ email: {} });
	});

	it('handles classic NoSQL injection: { password: { $gt: "" } }', () => {
		const input = { password: { $gt: '' } };
		sanitize(input);
		expect(input).toEqual({ password: {} });
	});

	it('recursively sanitizes nested objects', () => {
		const input = { user: { name: 'test', role: { $in: ['admin'] } } };
		sanitize(input);
		expect(input).toEqual({ user: { name: 'test', role: {} } });
	});

	it('sanitizes objects inside arrays', () => {
		const input = [{ $gt: 1 }, { safe: 'ok' }, { nested: { $ne: null } }];
		sanitize(input);
		expect(input).toEqual([{}, { safe: 'ok' }, { nested: {} }]);
	});

	it('handles deeply nested structures (object in array in object)', () => {
		const input = { items: [{ filters: { price: { $gte: 100 } } }] };
		sanitize(input);
		expect(input).toEqual({ items: [{ filters: { price: {} } }] });
	});

	it('returns the same reference (mutates in place)', () => {
		const input = { $gt: 1, safe: 'value' };
		const result = sanitize(input);
		expect(result).toBe(input);
	});

	it('leaves safe objects untouched', () => {
		const input = { name: 'test', count: 42, nested: { ok: true } };
		sanitize(input);
		expect(input).toEqual({ name: 'test', count: 42, nested: { ok: true } });
	});

	it('does not crash on primitives', () => {
		expect(sanitize(null)).toBeNull();
		expect(sanitize(undefined)).toBeUndefined();
		expect(sanitize('string')).toBe('string');
		expect(sanitize(42)).toBe(42);
	});
});

describe('hasDangerousKeys', () => {
	it('returns true for $-prefixed keys', () => {
		expect(hasDangerousKeys({ $ne: null })).toBe(true);
		expect(hasDangerousKeys({ $gt: 1 })).toBe(true);
		expect(hasDangerousKeys({ $where: 'function(){}' })).toBe(true);
	});

	it('returns true for dot-containing keys', () => {
		expect(hasDangerousKeys({ 'a.b': 1 })).toBe(true);
	});

	it('returns false for safe objects', () => {
		expect(hasDangerousKeys({ name: 'test', count: 42 })).toBe(false);
		expect(hasDangerousKeys({})).toBe(false);
	});

	it('detects nested dangerous keys', () => {
		expect(hasDangerousKeys({ user: { email: { $ne: null } } })).toBe(true);
	});

	it('detects dangerous keys in arrays', () => {
		expect(hasDangerousKeys([{ safe: 1 }, { $gt: 0 }])).toBe(true);
	});

	it('returns false for primitives', () => {
		expect(hasDangerousKeys(null)).toBe(false);
		expect(hasDangerousKeys(undefined)).toBe(false);
		expect(hasDangerousKeys('string')).toBe(false);
		expect(hasDangerousKeys(42)).toBe(false);
	});
});
