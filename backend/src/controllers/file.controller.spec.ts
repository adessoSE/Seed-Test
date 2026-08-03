// src/controllers/file.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { ObjectId } from 'mongodb';
// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedFileService,
	mockedLogger
} = vi.hoisted(() => ({
	mockedFileService: {
		fileUpload: vi.fn(),
		getFileList: vi.fn(),
		deleteFile: vi.fn()
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

vi.mock('../services/file.service', () => mockedFileService);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './file.controller.js';

// --- Test constants ---
const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_ID_2 = '507f1f77bcf86cd799439022';
const INVALID_ID = 'invalid';

// --- Test helpers ---

/** Creates a minimal Express Request with sensible defaults and optional overrides. */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		user: { _id: new ObjectId(VALID_ID), email: 'test@seed.de' },
		...overrides
	} as unknown as Request;
}

/** Creates a mock Express Response with chainable status() and json(). */
function createRes(): Response {
	const res = {} as Response;
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
}


// --- Test Suite ---
describe('FileController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn();
	});

	// ---------------------------------------------------------------
	// fileUpload
	// ---------------------------------------------------------------
	describe('fileUpload', () => {
		it('uploads a file and returns metadata for a valid request', async () => {
			const metadata = { _id: VALID_ID_2, filename: 'test.txt', repoId: VALID_ID };
			mockedFileService.fileUpload.mockResolvedValue(metadata);

			const req = createReq({
				params: { repoId: VALID_ID },
				file: { buffer: Buffer.from('test'), originalname: 'test.txt' }
			});
			await controller.fileUpload(req, res, next);

			expect(mockedFileService.fileUpload).toHaveBeenCalledWith(
				'test.txt',
				VALID_ID,
				req.file.buffer
			);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(metadata);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 when no file is attached (req.file missing)', async () => {
			// Multer did not attach a file — controller should reject early
			const req = createReq({ params: { repoId: VALID_ID } });
			await controller.fileUpload(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'No file uploaded.' })
			);
			expect(mockedFileService.fileUpload).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({
				params: { repoId: INVALID_ID },
				file: { buffer: Buffer.from('test'), originalname: 'test.txt' }
			});
			await controller.fileUpload(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(mockedFileService.fileUpload).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('GridFS write failed');
			mockedFileService.fileUpload.mockRejectedValue(serviceError);

			const req = createReq({
				params: { repoId: VALID_ID },
				file: { buffer: Buffer.from('test'), originalname: 'test.txt' }
			});
			await controller.fileUpload(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// getFileList
	// ---------------------------------------------------------------
	describe('getFileList', () => {
		it('returns a list of files for a valid repository ID', async () => {
			const files = [
				{ title: 'file1.txt', id: VALID_ID },
				{ title: 'file2.txt', id: VALID_ID_2 }
			];
			mockedFileService.getFileList.mockResolvedValue(files);

			const req = createReq({ params: { repoId: VALID_ID } });
			await controller.getFileList(req, res, next);

			expect(mockedFileService.getFileList).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(files);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repoId: INVALID_ID } });
			await controller.getFileList(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('DB connection lost');
			mockedFileService.getFileList.mockRejectedValue(serviceError);

			const req = createReq({ params: { repoId: VALID_ID } });
			await controller.getFileList(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// deleteFile
	// ---------------------------------------------------------------
	describe('deleteFile', () => {
		it('deletes a file and returns success message', async () => {
			mockedFileService.deleteFile.mockResolvedValue(undefined);

			const req = createReq({ params: { repoId: VALID_ID, fileId: VALID_ID_2 } });
			await controller.deleteFile(req, res, next);

			expect(mockedFileService.deleteFile).toHaveBeenCalledWith(VALID_ID_2, VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'File deleted successfully' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid file ID', async () => {
			const req = createReq({ params: { repoId: VALID_ID, fileId: INVALID_ID } });
			await controller.deleteFile(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing file ID' })
			);
			expect(mockedFileService.deleteFile).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID (with valid file ID)', async () => {
			// fileId passes validation but repoId is checked second and fails
			const req = createReq({ params: { repoId: INVALID_ID, fileId: VALID_ID_2 } });
			await controller.deleteFile(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(mockedFileService.deleteFile).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('GridFS delete failed');
			mockedFileService.deleteFile.mockRejectedValue(serviceError);

			const req = createReq({ params: { repoId: VALID_ID, fileId: VALID_ID_2 } });
			await controller.deleteFile(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
