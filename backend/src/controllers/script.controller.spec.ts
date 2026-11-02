// src/controllers/script.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedRepositoryService,
	mockedStoryService,
	mockedTestRunnerService,
	mockedFeatureFileService,
	mockedTestExecutionController,
	mockedFs,
	mockedPath,
	mockedLogger
} = vi.hoisted(() => ({
	mockedRepositoryService: {
		getOneStoryGroup: vi.fn()
	},
	mockedStoryService: {
		getOneStory: vi.fn()
	},
	mockedTestRunnerService: {
		executeTest: vi.fn()
	},
	mockedFeatureFileService: {
		cleanFileName: vi.fn()
	},
	mockedTestExecutionController: {
		handleReportResult: vi.fn()
	},
	mockedFs: {
		default: {
			mkdirSync: vi.fn(),
			existsSync: vi.fn(),
			rmSync: vi.fn()
		}
	},
	mockedPath: {
		default: {
			join: vi.fn((..._args: string[]) => '/stable/path')
		}
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

vi.mock('../services/repository.service', () => mockedRepositoryService);
vi.mock('../services/story.service', () => mockedStoryService);
vi.mock('../testing/test-runner.service', () => mockedTestRunnerService);
vi.mock('../services/feature-file.service', () => mockedFeatureFileService);
vi.mock('./testExecution.controller', () => mockedTestExecutionController);
vi.mock('../models/models', () => ({
	ExecutionMode: { STORY: 'story', SCENARIO: 'scenario', GROUP: 'group' }
}));
vi.mock('node:fs', () => mockedFs);
vi.mock('node:path', () => mockedPath);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './script.controller.js';

// --- Test constants ---
const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_ID_2 = '507f1f77bcf86cd799439012';
const INVALID_ID = 'not-a-valid-id';

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

/** Builds a mock story object for testing. */
function mockStory(id: string = VALID_ID) {
	return { _id: id, title: 'Test Story', scenarios: [] };
}

/** Builds a mock group object for testing. */
function mockGroup(overrides: Record<string, any> = {}) {
	return {
		name: 'TestGroup',
		member_stories: [VALID_ID],
		isSequential: false,
		...overrides
	};
}

// --- Test Suite ---
describe('ScriptController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn();

		// Sensible defaults for happy-path mocks
		mockedFeatureFileService.cleanFileName.mockImplementation((s: string) => s);
		mockedTestRunnerService.executeTest.mockResolvedValue({ reportName: 'report' });
		mockedTestExecutionController.handleReportResult.mockResolvedValue(undefined);
	});

	// ---------------------------------------------------------------
	// runGroupViaScript
	// ---------------------------------------------------------------
	describe('runGroupViaScript', () => {
		it('forwards AppError to next when repoID is invalid', async () => {
			const req = createReq({ body: { repoID: INVALID_ID, groupID: VALID_ID } });

			await controller.runGroupViaScript(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
			expect(err.statusCode).toBe(400);
			expect(err.message).toContain('repository ID');
		});

		it('forwards AppError to next when groupID is invalid', async () => {
			const req = createReq({ body: { repoID: VALID_ID, groupID: INVALID_ID } });

			await controller.runGroupViaScript(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
			expect(err.statusCode).toBe(400);
			expect(err.message).toContain('group ID');
		});

		it('returns 404 via next when group is not found', async () => {
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue(null);
			const req = createReq({ body: { repoID: VALID_ID, groupID: VALID_ID_2 } });

			await controller.runGroupViaScript(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
			expect(err.statusCode).toBe(404);
			expect(err.message).toBe('Group not found');
		});

		it('returns 400 via next when group has no valid stories', async () => {
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue(mockGroup());
			// All stories resolve to null — none are valid
			mockedStoryService.getOneStory.mockResolvedValue(null);
			const req = createReq({ body: { repoID: VALID_ID, groupID: VALID_ID_2 } });

			await controller.runGroupViaScript(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
			expect(err.statusCode).toBe(400);
			expect(err.message).toBe('No valid stories found in the group');
		});

		it('executes tests in parallel when group is not sequential', async () => {
			const group = mockGroup({ isSequential: false, member_stories: [VALID_ID, VALID_ID_2] });
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue(group);
			mockedStoryService.getOneStory.mockResolvedValue(mockStory());
			const req = createReq({ body: { repoID: VALID_ID, groupID: VALID_ID_2 } });

			await controller.runGroupViaScript(req, res, next);

			// Two stories → two executeTest calls via Promise.all
			expect(mockedTestRunnerService.executeTest).toHaveBeenCalledTimes(2);
			expect(mockedTestExecutionController.handleReportResult).toHaveBeenCalledOnce();
			expect(next).not.toHaveBeenCalled();
		});

		it('executes tests sequentially when group.isSequential is true', async () => {
			const group = mockGroup({ isSequential: true, member_stories: [VALID_ID, VALID_ID_2] });
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue(group);
			mockedStoryService.getOneStory.mockResolvedValue(mockStory());
			const req = createReq({ body: { repoID: VALID_ID, groupID: VALID_ID_2 } });

			await controller.runGroupViaScript(req, res, next);

			// Sequential: still called twice, but one at a time (for loop)
			expect(mockedTestRunnerService.executeTest).toHaveBeenCalledTimes(2);
			// Each call receives ExecutionMode.GROUP
			expect(mockedTestRunnerService.executeTest).toHaveBeenCalledWith(
				expect.anything(), 'group', expect.objectContaining({ title: 'Test Story' })
			);
			expect(mockedTestExecutionController.handleReportResult).toHaveBeenCalledOnce();
			expect(next).not.toHaveBeenCalled();
		});

		it('creates a features directory via fs.mkdirSync on happy path', async () => {
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue(mockGroup());
			mockedStoryService.getOneStory.mockResolvedValue(mockStory());
			const req = createReq({ body: { repoID: VALID_ID, groupID: VALID_ID_2 } });

			await controller.runGroupViaScript(req, res, next);

			expect(mockedFs.default.mkdirSync).toHaveBeenCalledWith('/stable/path', { recursive: true });
		});

		it('cleans up temp folder via fs.rmSync when executeTest throws', async () => {
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue(mockGroup());
			mockedStoryService.getOneStory.mockResolvedValue(mockStory());
			mockedTestRunnerService.executeTest.mockRejectedValue(new Error('execution failed'));
			// existsSync returns true so the cleanup branch runs
			mockedFs.default.existsSync.mockReturnValue(true);
			const req = createReq({ body: { repoID: VALID_ID, groupID: VALID_ID_2 } });

			await controller.runGroupViaScript(req, res, next);

			expect(mockedFs.default.rmSync).toHaveBeenCalledWith('/stable/path', { recursive: true, force: true });
			expect(next).toHaveBeenCalledWith(expect.any(Error));
		});

		it('skips cleanup when req.body.name is not set (error before name assignment)', async () => {
			// Group not found throws before req.body.name is assigned
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue(null);
			const req = createReq({ body: { repoID: VALID_ID, groupID: VALID_ID_2 } });

			await controller.runGroupViaScript(req, res, next);

			expect(mockedFs.default.rmSync).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// runFeatureViaScript
	// ---------------------------------------------------------------
	describe('runFeatureViaScript', () => {
		it('forwards AppError to next when issueID param is invalid', async () => {
			const req = createReq({ params: { issueID: INVALID_ID } });

			await controller.runFeatureViaScript(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
			expect(err.statusCode).toBe(400);
			expect(err.message).toContain('story ID');
		});

		it('returns 404 via next when story is not found', async () => {
			mockedStoryService.getOneStory.mockResolvedValue(null);
			const req = createReq({ params: { issueID: VALID_ID } });

			await controller.runFeatureViaScript(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
			expect(err.statusCode).toBe(404);
			expect(err.message).toBe('Story not found');
		});

		it('executes test and calls handleReportResult on happy path', async () => {
			const story = mockStory();
			mockedStoryService.getOneStory.mockResolvedValue(story);
			const req = createReq({
				params: { issueID: VALID_ID },
				body: { repositoryId: VALID_ID_2 }
			});

			await controller.runFeatureViaScript(req, res, next);

			expect(mockedTestRunnerService.executeTest).toHaveBeenCalledWith(
				expect.anything(), 'story', story
			);
			expect(mockedTestExecutionController.handleReportResult).toHaveBeenCalledWith(
				res,
				{ reportName: 'report' },
				'story',
				expect.objectContaining({ repositoryId: VALID_ID_2, stories: [story] }),
				expect.objectContaining({ email: 'test@seed.de' })
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('forwards errors from executeTest to next', async () => {
			mockedStoryService.getOneStory.mockResolvedValue(mockStory());
			mockedTestRunnerService.executeTest.mockRejectedValue(new Error('runner crashed'));
			const req = createReq({ params: { issueID: VALID_ID } });

			await controller.runFeatureViaScript(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(Error));
			const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as Error;
			expect(err.message).toBe('runner crashed');
		});
	});
});
