import { describe, it, expect } from 'vitest';
import { AppError } from './AppError.js';

describe('AppError', () => {
	it('should be an instance of Error', () => {
		const err = new AppError('test', 400);
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(AppError);
	});

	it('should set message, statusCode, and isOperational', () => {
		const err = new AppError('Something went wrong', 500, 'INTERNAL');
		expect(err.message).toBe('Something went wrong');
		expect(err.statusCode).toBe(500);
		expect(err.isOperational).toBe(true);
		expect(err.code).toBe('INTERNAL');
	});

	it('should leave code undefined when not provided', () => {
		const err = new AppError('no code', 400);
		expect(err.code).toBeUndefined();
	});

	describe('static factory methods', () => {
		it('badRequest should return 400', () => {
			const err = AppError.badRequest('Invalid input', 'VALIDATION');
			expect(err.statusCode).toBe(400);
			expect(err.message).toBe('Invalid input');
			expect(err.code).toBe('VALIDATION');
		});

		it('unauthorized should return 401', () => {
			const err = AppError.unauthorized('Not logged in');
			expect(err.statusCode).toBe(401);
			expect(err.code).toBe('UNAUTHORIZED');
		});

		it('forbidden should return 403', () => {
			const err = AppError.forbidden('No access');
			expect(err.statusCode).toBe(403);
			expect(err.code).toBe('FORBIDDEN');
		});

		it('notFound should return 404', () => {
			const err = AppError.notFound('Missing resource');
			expect(err.statusCode).toBe(404);
			expect(err.code).toBe('NOT_FOUND');
		});

		it('conflict should return 409', () => {
			const err = AppError.conflict('Duplicate entry');
			expect(err.statusCode).toBe(409);
			expect(err.code).toBe('CONFLICT');
		});

		it('badGateway should return 502', () => {
			const err = AppError.badGateway('Upstream failed');
			expect(err.statusCode).toBe(502);
			expect(err.code).toBe('BAD_GATEWAY');
		});
	});

	it('should work with instanceof checks after setPrototypeOf', () => {
		try {
			throw AppError.notFound('test');
		} catch (err) {
			expect(err instanceof AppError).toBe(true);
			expect((err as AppError).statusCode).toBe(404);
		}
	});
});
