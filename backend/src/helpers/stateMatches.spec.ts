// src/helpers/stateMatches.spec.ts

import { describe, it, expect } from 'vitest';
import { stateMatches } from './stateMatches.js';

describe('stateMatches', () => {
	it('returns true for identical state values', () => {
		expect(stateMatches('abc-123', 'abc-123')).toBe(true);
	});

	it('returns false for same-length values that differ', () => {
		expect(stateMatches('abc-123', 'abc-124')).toBe(false);
	});

	// timingSafeEqual throws on buffers of different lengths; the helper must answer false instead
	it('returns false for values of different length without throwing', () => {
		expect(() => stateMatches('abc', 'abcd')).not.toThrow();
		expect(stateMatches('abc', 'abcd')).toBe(false);
		expect(stateMatches('abcd', 'abc')).toBe(false);
	});

	it('returns false when either side is empty', () => {
		expect(stateMatches('', 'x')).toBe(false);
		expect(stateMatches('x', '')).toBe(false);
	});
});
