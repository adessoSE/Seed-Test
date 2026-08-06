// src/controllers/testExecution.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock all service/helper dependencies ---

vi.mock('../testing/test-runner.service', () => ({
	executeTest: vi.fn()
}));

vi.mock('../services/story.service', () => ({
	getOneStory: vi.fn()
}));

vi.mock('../services/repository.service', () => ({
	getOneStoryGroup: vi.fn(),
	getRepoSettingsById: vi.fn()
}));

vi.mock('../services/report.service', () => ({
	resolveAndSaveReport: vi.fn(),
	scheduleReportDeletion: vi.fn(),
	updateLatestTestStatus: vi.fn()
}));

vi.mock('../services/feature-file.service', () => ({
	cleanFileName: vi.fn((name: string) => name)
}));

vi.mock('../models/IssueTracker', () => ({
	IssueTracker: { getIssueTracker: vi.fn() },
	IssueTrackerOption: { JIRA: 'jira', GITHUB: 'github', NONE: 'db' },
	Github: class {}
}));

vi.mock('../models/models', () => ({
	ExecutionMode: { SCENARIO: 'scenario', STORY: 'feature', GROUP: 'group' }
}));

vi.mock('node:fs', () => ({
	default: {
		mkdirSync: vi.fn(),
		existsSync: vi.fn(),
		rmSync: vi.fn(),
		promises: { readFile: vi.fn() }
	},
	mkdirSync: vi.fn(),
	existsSync: vi.fn(),
	rmSync: vi.fn(),
	promises: { readFile: vi.fn() }
}));

vi.mock('node:path', () => ({
	default: { join: vi.fn((...args: string[]) => args.join('/')) },
	join: vi.fn((...args: string[]) => args.join('/'))
}));

vi.mock('../logging', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

// --- Import the controller under test and mocked modules ---

import * as controller from './testExecution.controller.js';
import * as testRunnerService from '../testing/test-runner.service.js';
import * as storyService from '../services/story.service.js';
import * as repositoryService from '../services/repository.service.js';
import * as reportService from '../services/report.service.js';
import fs from 'node:fs';

// --- Test Helpers ---

const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_ID_2 = '507f1f77bcf86cd799439012';
const INVALID_ID = 'not-a-valid-id';

/** Creates a mock Express Request with sensible defaults */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		user: { _id: new ObjectId(VALID_ID), email: 'test@seed.de' },
		...overrides
	} as unknown as Request;
}

/** Creates a mock Express Response with chainable .status() */
function createRes(): Response {
	const res = {} as Response;
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
}

/** Builds a mock story object with configurable scenarios */
function mockStory(overrides: Record<string, any> = {}) {
	return {
		_id: new ObjectId(VALID_ID),
		title: 'Test Story',
		storySource: 'db',
		scenarios: [{ scenario_id: 1, name: 'Scenario 1' }],
		...overrides
	};
}

/** Sets up the full happy-path mock chain for report handling */
function setupReportMocks(reportName = 'test-report') {
	const story = mockStory();
	vi.mocked(testRunnerService.executeTest).mockResolvedValue({ reportName, story });
	vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue({
		_id: 'reportId',
		reportName
	});
	vi.mocked(fs.promises.readFile).mockResolvedValue('<html>report</html>');
	vi.mocked(reportService.scheduleReportDeletion).mockImplementation(() => {});
	vi.mocked(reportService.updateLatestTestStatus).mockResolvedValue(undefined);
	return story;
}

// --- Test Suite ---

describe('TestExecutionController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn();
	});

	// ==================== runFeature ====================

	describe('runFeature', () => {
		it('should forward AppError to next when story ID is invalid', async () => {
			const req = createReq({ params: { issueID: INVALID_ID } });

			await controller.runFeature(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(400);
		});

		it('should forward 404 to next when story is not found', async () => {
			const req = createReq({ params: { issueID: VALID_ID } });
			vi.mocked(storyService.getOneStory).mockResolvedValue(null);

			await controller.runFeature(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(404);
		});

		it('should execute test and return report on happy path', async () => {
			const story = setupReportMocks();
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			const req = createReq({
				params: { issueID: VALID_ID },
				body: { repositoryId: VALID_ID_2 }
			});

			await controller.runFeature(req, res, next);

			expect(testRunnerService.executeTest).toHaveBeenCalled();
			expect(reportService.resolveAndSaveReport).toHaveBeenCalled();
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
				htmlFile: '<html>report</html>',
				reportId: 'reportId'
			}));
			expect(next).not.toHaveBeenCalled();
		});
	});

	// ==================== runScenario ====================

	describe('runScenario', () => {
		it('should forward AppError to next when story ID is invalid', async () => {
			const req = createReq({ params: { issueID: INVALID_ID, scenarioId: '1' } });

			await controller.runScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(400);
		});

		it('should forward 400 when scenario ID is non-numeric', async () => {
			const req = createReq({ params: { issueID: VALID_ID, scenarioId: 'abc' } });

			await controller.runScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(400);
			expect(error.message).toContain('Scenario ID');
		});

		it('should forward 404 when story is not found', async () => {
			const req = createReq({ params: { issueID: VALID_ID, scenarioId: '1' } });
			vi.mocked(storyService.getOneStory).mockResolvedValue(null);

			await controller.runScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(404);
		});

		it('should forward 404 when scenario is not in story', async () => {
			const story = mockStory({ scenarios: [{ scenario_id: 99, name: 'Other' }] });
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			const req = createReq({ params: { issueID: VALID_ID, scenarioId: '1' } });

			await controller.runScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(404);
			expect(error.message).toContain('Scenario not found');
		});

		it('should execute test and return report on happy path', async () => {
			const story = setupReportMocks();
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			const req = createReq({
				params: { issueID: VALID_ID, scenarioId: '1' },
				body: { repositoryId: VALID_ID_2 }
			});

			await controller.runScenario(req, res, next);

			expect(testRunnerService.executeTest).toHaveBeenCalled();
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
				htmlFile: '<html>report</html>',
				reportId: 'reportId'
			}));
			expect(next).not.toHaveBeenCalled();
		});
	});

	// ==================== runGroup ====================

	describe('runGroup', () => {
		it('should forward AppError when group ID is invalid', async () => {
			const req = createReq({
				params: { groupID: INVALID_ID, repoID: VALID_ID }
			});

			await controller.runGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(400);
		});

		it('should forward 404 when group is not found', async () => {
			const req = createReq({
				params: { groupID: VALID_ID_2, repoID: VALID_ID }
			});
			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(undefined);

			await controller.runGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(404);
		});

		it('should forward 400 when group has no valid stories', async () => {
			const req = createReq({
				params: { groupID: VALID_ID_2, repoID: VALID_ID }
			});
			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue({
				name: 'Empty Group',
				member_stories: [new ObjectId()],
				isSequential: false
			} as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(null);

			await controller.runGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(400);
		});

		it('should run stories sequentially when group.isSequential is true', async () => {
			const story = setupReportMocks();
			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue({
				name: 'Sequential Group',
				member_stories: [new ObjectId(VALID_ID)],
				isSequential: true
			} as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			const req = createReq({
				params: { groupID: VALID_ID_2, repoID: VALID_ID }
			});

			await controller.runGroup(req, res, next);

			expect(testRunnerService.executeTest).toHaveBeenCalledTimes(1);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
				htmlFile: '<html>report</html>'
			}));
			expect(next).not.toHaveBeenCalled();
		});

		it('should run stories in parallel when group.isSequential is false', async () => {
			const story = setupReportMocks();
			const story2 = mockStory({ _id: new ObjectId(VALID_ID_2), title: 'Story 2' });
			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue({
				name: 'Parallel Group',
				member_stories: [new ObjectId(VALID_ID), new ObjectId(VALID_ID_2)],
				isSequential: false
			} as any);
			vi.mocked(storyService.getOneStory)
				.mockResolvedValueOnce(story as any)
				.mockResolvedValueOnce(story2 as any);
			const req = createReq({
				params: { groupID: VALID_ID_2, repoID: VALID_ID }
			});

			await controller.runGroup(req, res, next);

			// Both stories executed
			expect(testRunnerService.executeTest).toHaveBeenCalledTimes(2);
			expect(res.json).toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		});
	});

	// ==================== runTempGroup ====================

	describe('runTempGroup', () => {
		it('should forward 400 when no stories are provided', async () => {
			const req = createReq({
				params: { repoID: VALID_ID },
				body: { id: VALID_ID, group: { member_stories: [], isSequential: false } }
			});

			await controller.runTempGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(400);
		});

		it('should forward 400 when member_stories contains only null entries', async () => {
			const req = createReq({
				params: { repoID: VALID_ID },
				body: { id: VALID_ID, group: { member_stories: [null, null], isSequential: false } }
			});

			await controller.runTempGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = vi.mocked(next).mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(400);
		});

		it('should execute test and return report on happy path', async () => {
			const story = setupReportMocks();
			const req = createReq({
				params: { repoID: VALID_ID },
				body: {
					id: VALID_ID,
					repository: 'owner/repo',
					group: { member_stories: [story], isSequential: false }
				}
			});

			await controller.runTempGroup(req, res, next);

			expect(testRunnerService.executeTest).toHaveBeenCalledTimes(1);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
				htmlFile: '<html>report</html>',
				reportId: 'reportId'
			}));
			expect(next).not.toHaveBeenCalled();
		});
	});

	// ==================== handleReportResult ====================

	describe('handleReportResult', () => {
		it('should throw AppError when report result is null', async () => {
			const parameters = { stories: [] };

			// handleReportResult now throws instead of sending a direct error response
			const error = await controller.handleReportResult(res, null, 'feature' as any, parameters)
				.catch((e: any) => e);
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(500);
			expect(error.message).toContain('failed to produce');
		});

		it('should throw AppError when reportName is missing', async () => {
			const parameters = { stories: [] };

			const error = await controller.handleReportResult(res, { someField: 'value' }, 'feature' as any, parameters)
				.catch((e: any) => e);
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(500);
			expect(error.message).toContain('failed to produce');
		});

		it('should resolve report, read HTML, and return JSON on happy path', async () => {
			vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue({
				_id: 'reportId',
				reportName: 'test-report'
			});
			vi.mocked(fs.promises.readFile).mockResolvedValue('<html>report</html>');
			vi.mocked(reportService.scheduleReportDeletion).mockImplementation(() => {});
			vi.mocked(reportService.updateLatestTestStatus).mockResolvedValue(undefined);

			const reportResult = { reportName: 'test-report', story: mockStory() };
			const parameters = { stories: [mockStory()] };

			await controller.handleReportResult(res, reportResult, 'feature' as any, parameters);

			expect(reportService.resolveAndSaveReport).toHaveBeenCalled();
			expect(fs.promises.readFile).toHaveBeenCalled();
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
				htmlFile: '<html>report</html>',
				reportId: 'reportId'
			}));
			expect(reportService.scheduleReportDeletion).toHaveBeenCalled();
		});

		it('should throw AppError when reading the HTML file fails', async () => {
			vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue({
				_id: 'reportId',
				reportName: 'test-report'
			});
			vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('ENOENT'));
			vi.mocked(reportService.scheduleReportDeletion).mockImplementation(() => {});
			vi.mocked(reportService.updateLatestTestStatus).mockResolvedValue(undefined);

			const reportResult = { reportName: 'test-report', story: mockStory() };
			const parameters = { stories: [mockStory()] };

			// handleReportResult now throws instead of sending a direct error response
			const error = await controller.handleReportResult(res, reportResult, 'feature' as any, parameters)
				.catch((e: any) => e);
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(500);
			expect(error.message).toContain('Failed to read HTML');
			// AppError carries reportId in its data property
			expect(error.data).toEqual({ reportId: 'reportId' });
			// scheduleReportDeletion still called in the finally block
			expect(reportService.scheduleReportDeletion).toHaveBeenCalled();
		});
	});

	describe('runGroup', () => {
		it('should use the repository ID from the route when the body only contains group settings', async () => {
			const story = setupReportMocks();
			const req = createReq({
				params: { repoID: VALID_ID, groupID: VALID_ID },
				body: { repository: 'owner/repo', source: 'github' }
			});
			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue({
				_id: VALID_ID,
				name: 'Group',
				member_stories: [story._id],
				isSequential: true
			} as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story);

			await controller.runGroup(req, res, next);

			expect(repositoryService.getOneStoryGroup).toHaveBeenCalledWith(VALID_ID, VALID_ID);
			expect(next).not.toHaveBeenCalled();
		});
	});
});
