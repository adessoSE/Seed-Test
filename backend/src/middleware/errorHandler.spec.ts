import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../helpers/AppError.js';

const { mockLogger } = vi.hoisted(() => ({
	mockLogger: { error: vi.fn(), warn: vi.fn() }
}));
vi.mock('../logging.js', () => ({ logger: mockLogger }));

import { errorHandler } from './errorHandler.js';

/** Builds a minimal Express response double that records status and body. */
function createRes(headersSent = false) {
	const res = { headersSent } as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
}

/** Mimics the http-errors objects body-parser passes to next() (status + expose). */
function bodyParserError(message: string, status: number): Error {
	return Object.assign(new Error(message), { status, statusCode: status, expose: true });
}

describe('errorHandler', () => {
	const req = {} as Request;
	const next = vi.fn() as NextFunction;

	beforeEach(() => vi.clearAllMocks());

	it('maps an AppError to its status code and message', () => {
		const res = createRes();
		errorHandler(AppError.notFound('Story not found'), req, res, next);
		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({ error: 'Story not found' });
	});

	it('attaches AppError data to the response body', () => {
		const res = createRes();
		errorHandler(AppError.badRequest('Invalid', undefined, { data: { field: 'x' } }), req, res, next);
		expect(res.json).toHaveBeenCalledWith({ error: 'Invalid', data: { field: 'x' } });
	});

	it('keeps body-parser 400 for malformed JSON', () => {
		const res = createRes();
		errorHandler(bodyParserError('Unexpected token } in JSON', 400), req, res, next);
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected token } in JSON' });
	});

	it('keeps body-parser 413 for a payload that is too large', () => {
		const res = createRes();
		errorHandler(bodyParserError('request entity too large', 413), req, res, next);
		expect(res.status).toHaveBeenCalledWith(413);
		expect(res.json).toHaveBeenCalledWith({ error: 'request entity too large' });
	});

	it('maps a multer file-size error to 413 and other multer errors to 400', () => {
		const tooLarge = createRes();
		errorHandler(new multer.MulterError('LIMIT_FILE_SIZE', 'file'), req, tooLarge, next);
		expect(tooLarge.status).toHaveBeenCalledWith(413);

		const unexpected = createRes();
		errorHandler(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'other'), req, unexpected, next);
		expect(unexpected.status).toHaveBeenCalledWith(400);
	});

	it('maps plain errors to a generic 500 without leaking the message', () => {
		const res = createRes();
		errorHandler(new Error('db password is wrong'), req, res, next);
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it('ignores a non-4xx status on a plain error', () => {
		const res = createRes();
		errorHandler(Object.assign(new Error('upstream'), { status: 502 }), req, res, next);
		expect(res.status).toHaveBeenCalledWith(500);
	});

	it('does not respond when headers were already sent', () => {
		const res = createRes(true);
		errorHandler(new Error('late'), req, res, next);
		expect(res.status).not.toHaveBeenCalled();
	});
});
