import { describe, it, expect } from 'vitest';
import { type Request } from 'express';
import { param } from './request-params.js';

/**
 * Builds a minimal Express-like request exposing only the params bag,
 * mirroring what controllers rely on through the `param()` helper.
 */
function mockParamRequest(params: Record<string, unknown>): Request {
	return { params } as unknown as Request;
}

describe('param', () => {
	it('returns a plain string param unchanged', () => {
		const req = mockParamRequest({ repo_id: '507f1f77bcf86cd799439011' });
		expect(param(req, 'repo_id')).toBe('507f1f77bcf86cd799439011');
	});

	// Express 5 captures a repeated route segment as string[]; helpers must
	// unwrap it to the first value so downstream code keeps getting a string.
	it('unwraps a string[] param to its first value', () => {
		const req = mockParamRequest({ _id: ['abc', 'def'] });
		expect(param(req, '_id')).toBe('abc');
	});

	it('returns undefined for a missing param', () => {
		const req = mockParamRequest({});
		expect(param(req, 'storyID')).toBeUndefined();
	});
});
