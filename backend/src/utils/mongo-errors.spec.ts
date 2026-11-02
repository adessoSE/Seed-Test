import { describe, it, expect } from 'vitest';
import { MongoServerError } from 'mongodb';
import { isDuplicateKeyError } from './mongo-errors.js';

describe('isDuplicateKeyError', () => {
	it('is true for a MongoServerError with code 11000', () => {
		expect(isDuplicateKeyError(new MongoServerError({ message: 'E11000 duplicate key', code: 11000 }))).toBe(true);
	});

	it('is false for other server errors and non-Mongo errors', () => {
		expect(isDuplicateKeyError(new MongoServerError({ message: 'WriteConflict', code: 112 }))).toBe(false);
		expect(isDuplicateKeyError(new Error('E11000'))).toBe(false);
		expect(isDuplicateKeyError(undefined)).toBe(false);
	});
});
