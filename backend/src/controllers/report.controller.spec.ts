// src/controllers/report.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedReportService,
	mockedLogger,
} = vi.hoisted(() => ({
	mockedReportService: {
		getReportDataById: vi.fn(),
		getReportByName: vi.fn(),
		generateHtmlReport: vi.fn(),
		getReportHistory: vi.fn(),
		deleteReport: vi.fn(),
		setIsSavedTestReport: vi.fn(),
		getTestReports: vi.fn(),
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock('../services/report.service', () => mockedReportService);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './report.controller.js';

// --- Test constants ---
const VALID_ID = '507f1f77bcf86cd799439011';
const INVALID_ID = 'invalid';

// --- Test helpers ---

/** Creates a minimal Express Request with sensible defaults and optional overrides. */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		user: {},
		...overrides,
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
describe('ReportController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn() as unknown as NextFunction;
	});

	// ---------------------------------------------------------------
	// getReportData
	// ---------------------------------------------------------------
	describe('getReportData', () => {
		it('returns report data for a valid report ID', async () => {
			const reportData = { _id: VALID_ID, name: 'TestReport', jsonReport: '{"steps":[]}' };
			mockedReportService.getReportDataById.mockResolvedValue(reportData);

			const req = createReq({ params: { reportId: VALID_ID } });
			await controller.getReportData(req, res, next);

			expect(mockedReportService.getReportDataById).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(reportData);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid report ID', async () => {
			const req = createReq({ params: { reportId: INVALID_ID } });
			await controller.getReportData(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing report ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 404 when report is not found', async () => {
			// Service returns null — no report with this ID exists
			mockedReportService.getReportDataById.mockResolvedValue(null);

			const req = createReq({ params: { reportId: VALID_ID } });
			await controller.getReportData(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404, message: 'Report not found' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// getReportHistory
	// Also covers the "getStoryReports" use case — the controller
	// fetches the full report history container for a given story ID.
	// ---------------------------------------------------------------
	describe('getReportHistory', () => {
		it('returns report history for a valid story ID', async () => {
			const history = { storyReports: [{ _id: VALID_ID }], scenarioReports: [] };
			mockedReportService.getReportHistory.mockResolvedValue(history);

			const req = createReq({ params: { storyId: VALID_ID } });
			await controller.getReportHistory(req, res, next);

			expect(mockedReportService.getReportHistory).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(history);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid story ID', async () => {
			const req = createReq({ params: { storyId: INVALID_ID } });
			await controller.getReportHistory(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing story ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// deleteReport
	// ---------------------------------------------------------------
	describe('deleteReport', () => {
		it('deletes a report and returns 200', async () => {
			mockedReportService.deleteReport.mockResolvedValue({ ok: 1 });

			const req = createReq({ params: { reportId: VALID_ID } });
			await controller.deleteReport(req, res, next);

			expect(mockedReportService.deleteReport).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Report deleted successfully' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid report ID', async () => {
			const req = createReq({ params: { reportId: INVALID_ID } });
			await controller.deleteReport(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing report ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// saveReport
	// ---------------------------------------------------------------
	describe('saveReport', () => {
		it('marks a report as saved and returns 200', async () => {
			mockedReportService.setIsSavedTestReport.mockResolvedValue({ ok: 1 });

			const req = createReq({ params: { reportId: VALID_ID } });
			await controller.saveReport(req, res, next);

			// Verify the service is called with isSaved=true
			expect(mockedReportService.setIsSavedTestReport).toHaveBeenCalledWith(VALID_ID, true);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Report marked as saved.' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid report ID', async () => {
			const req = createReq({ params: { reportId: INVALID_ID } });
			await controller.saveReport(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing report ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// unsaveReport
	// ---------------------------------------------------------------
	describe('unsaveReport', () => {
		it('marks a report as unsaved and returns 200', async () => {
			mockedReportService.setIsSavedTestReport.mockResolvedValue({ ok: 1 });

			const req = createReq({ params: { reportId: VALID_ID } });
			await controller.unsaveReport(req, res, next);

			// Verify the service is called with isSaved=false
			expect(mockedReportService.setIsSavedTestReport).toHaveBeenCalledWith(VALID_ID, false);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Report marked as unsaved.' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid report ID', async () => {
			const req = createReq({ params: { reportId: INVALID_ID } });
			await controller.unsaveReport(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing report ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
