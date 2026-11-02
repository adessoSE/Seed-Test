import { describe, it, expect, vi } from 'vitest';
import { z } from '@seed-test/shared';
import { validate } from './validate.js';

// Suppress logger output during tests
vi.mock('../logging', () => ({
	logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

function mockReqResNext(body: unknown = {}) {
	const req = { body, method: 'POST', originalUrl: '/test' } as any;
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis()
	};
	const next = vi.fn();
	return { req, res: res as any, next };
}

const testSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1),
	age: z.number().int().optional()
});

describe('validate middleware', () => {
	it('calls next() and replaces body on valid input', () => {
		const { req, res, next } = mockReqResNext({ email: 'a@b.com', name: 'Test' });
		validate(testSchema)(req, res, next);

		expect(next).toHaveBeenCalledWith();
		expect(res.status).not.toHaveBeenCalled();
		expect(req.body).toEqual({ email: 'a@b.com', name: 'Test' });
	});

	it('strips unknown keys from body', () => {
		const { req, res, next } = mockReqResNext({ email: 'a@b.com', name: 'Test', malicious: 'payload' });
		validate(testSchema)(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(req.body).toEqual({ email: 'a@b.com', name: 'Test' });
		expect(req.body.malicious).toBeUndefined();
	});

	it('applies defaults from schema', () => {
		const schemaWithDefault = z.object({
			role: z.string().default('user')
		});
		const { req, res, next } = mockReqResNext({});
		validate(schemaWithDefault)(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(req.body.role).toBe('user');
	});

	it('returns 400 with field details on invalid input', () => {
		const { req, res, next } = mockReqResNext({ email: 'not-an-email', name: '' });
		validate(testSchema)(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: 'Validation failed',
				details: expect.arrayContaining([
					expect.objectContaining({ path: 'email' }),
					expect.objectContaining({ path: 'name' })
				])
			})
		);
	});

	it('returns 400 on missing required fields', () => {
		const { req, res, next } = mockReqResNext({});
		validate(testSchema)(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it('returns 400 on wrong types', () => {
		const { req, res, next } = mockReqResNext({ email: 'a@b.com', name: 'Test', age: 'not-a-number' });
		validate(testSchema)(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(400);
		const details = res.json.mock.calls[0][0].details;
		expect(details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: 'age' })])
		);
	});

	it('passes optional fields through when present', () => {
		const { req, res, next } = mockReqResNext({ email: 'a@b.com', name: 'Test', age: 25 });
		validate(testSchema)(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(req.body.age).toBe(25);
	});

	// PATCH /story/:story_id sends a bare array; the middleware must not assume an object body.
	it('accepts a bare array body and replaces it with the parsed array', () => {
		const { req, res, next } = mockReqResNext([{ email: 'a@b.com', extra: 'dropped' }]);
		validate(z.array(z.object({ email: z.string().email() })))(req, res, next);

		expect(next).toHaveBeenCalledWith();
		expect(res.status).not.toHaveBeenCalled();
		expect(req.body).toEqual([{ email: 'a@b.com' }]);
	});
});
