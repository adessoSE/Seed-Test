// src/controllers/sanity.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

// --- Mock all service/helper dependencies ---

vi.mock('../services/repository.service', () => ({
	getOneStoryGroup: vi.fn(),
}));

vi.mock('../services/story.service', () => ({
	getOneStory: vi.fn(),
}));

vi.mock('../testing/test-runner.service', () => ({
	executeTest: vi.fn(),
}));

vi.mock('../services/report.service', () => ({
	resolveAndSaveReport: vi.fn(),
	updateLatestTestStatus: vi.fn(),
	scheduleReportDeletion: vi.fn(),
}));

vi.mock('../services/feature-file.service', () => ({
	cleanFileName: vi.fn((name: string) => name.replace(/[^a-zA-Z0-9_]/g, '_')),
}));

vi.mock('../models/models', () => ({
	ExecutionMode: { SCENARIO: 'scenario', STORY: 'feature', GROUP: 'group' },
	GroupReport: class {
		scenariosTested = { passed: 0, failed: 0 };
		groupTestResults = { passedSteps: 0, failedSteps: 0, skippedSteps: 0 };
	},
	PassedCount: class { passed = 0; failed = 0; },
}));

vi.mock('node:fs', () => ({
	default: {
		mkdirSync: vi.fn(),
		existsSync: vi.fn().mockReturnValue(false),
		rm: vi.fn(),
	},
	mkdirSync: vi.fn(),
	existsSync: vi.fn().mockReturnValue(false),
	rm: vi.fn(),
}));

vi.mock('node:path', () => ({
	default: { join: vi.fn((...args: string[]) => args.join('/')) },
	join: vi.fn((...args: string[]) => args.join('/')),
}));

vi.mock('../logging', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// --- Import controller under test and mocked modules ---

import * as controller from './sanity.controller.js';
import * as repositoryService from '../services/repository.service.js';
import * as storyService from '../services/story.service.js';
import * as testRunnerService from '../testing/test-runner.service.js';
import * as reportService from '../services/report.service.js';
import fs from 'node:fs';

// --- Test Helpers ---

const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_ID_2 = '507f1f77bcf86cd799439012';
const INVALID_ID = 'not-a-valid-id';

function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: { repoID: VALID_ID, groupID: VALID_ID_2 },
		query: {},
		user: { _id: new ObjectId(VALID_ID), email: 'test@seed.de' },
		...overrides,
	} as unknown as Request;
}

function createRes(): Response {
	const res = {} as Response;
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	res.send = vi.fn().mockReturnValue(res);
	return res;
}

function mockGroup(overrides: Record<string, any> = {}) {
	return {
		_id: new ObjectId(VALID_ID_2),
		name: 'Test Group',
		member_stories: [new ObjectId(VALID_ID)],
		isSequential: false,
		...overrides,
	};
}

function mockStory(overrides: Record<string, any> = {}) {
	return {
		_id: new ObjectId(VALID_ID),
		title: 'Test Story',
		scenarios: [{ scenario_id: 1, name: 'Scenario 1' }],
		...overrides,
	};
}

// --- Tests ---

describe('sanity.controller', () => {
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		next = vi.fn();
	});

	describe('runSanityTest', () => {
		it('should reject invalid repoID', async () => {
			const req = createReq({ params: { repoID: INVALID_ID, groupID: VALID_ID_2 } });
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
		});

		it('should reject invalid groupID', async () => {
			const req = createReq({ params: { repoID: VALID_ID, groupID: INVALID_ID } });
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
		});

		it('should return 404 when group not found', async () => {
			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(undefined);
			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
		});

		it('should return 400 when group has no valid stories', async () => {
			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(mockGroup() as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(null);
			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
		});

		it('should execute tests and return formatted notification', async () => {
			const group = mockGroup();
			const story = mockStory();
			const reportResult = { reportName: 'test_report', reportTime: 123, success: true };
			const finalReport = {
				reportName: 'sanity_Test_Group_123',
				scenariosTested: { passed: 2, failed: 1 },
				groupTestResults: { passedSteps: 5, failedSteps: 1, skippedSteps: 0 },
			};

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(testRunnerService.executeTest).mockResolvedValue(reportResult);
			vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue(finalReport);
			vi.mocked(reportService.updateLatestTestStatus).mockResolvedValue(undefined);

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Scenarios: 1 failed, 2 passed, 3 total'));
			expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Steps: 1 failed, 5 passed, 0 skipped, 6 total'));
			expect(next).not.toHaveBeenCalled();
		});

		it('should pass sanitized folder name to resolveAndSaveReport', async () => {
			const group = mockGroup({ name: 'My Group!' });
			const story = mockStory();
			const reportResult = { reportName: 'test_report', reportTime: 123, success: true };
			const finalReport = {
				reportName: 'sanity_My_Group__123',
				scenariosTested: { passed: 1, failed: 0 },
				groupTestResults: { passedSteps: 3, failedSteps: 0, skippedSteps: 0 },
			};

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(testRunnerService.executeTest).mockResolvedValue(reportResult);
			vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue(finalReport);
			vi.mocked(reportService.updateLatestTestStatus).mockResolvedValue(undefined);

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			// Verify the parameters passed to resolveAndSaveReport use the sanitized name, not the raw group name
			const callArgs = vi.mocked(reportService.resolveAndSaveReport).mock.calls[0];
			const executionParams = callArgs[3];
			expect(executionParams.name).not.toBe('My Group!');
			expect(executionParams.name).toContain('sanity_');
		});

		it('should run stories sequentially when group.isSequential is true', async () => {
			const group = mockGroup({ isSequential: true, member_stories: [new ObjectId(VALID_ID)] });
			const story = mockStory();
			const reportResult = { reportName: 'test_report', reportTime: 123, success: true };
			const finalReport = {
				reportName: 'sanity_report',
				scenariosTested: { passed: 1, failed: 0 },
				groupTestResults: { passedSteps: 1, failedSteps: 0, skippedSteps: 0 },
			};

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(testRunnerService.executeTest).mockResolvedValue(reportResult);
			vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue(finalReport);
			vi.mocked(reportService.updateLatestTestStatus).mockResolvedValue(undefined);

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(testRunnerService.executeTest).toHaveBeenCalledTimes(1);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should run stories in parallel when group.isSequential is false', async () => {
			const storyId2 = '507f1f77bcf86cd799439013';
			const group = mockGroup({
				isSequential: false,
				member_stories: [new ObjectId(VALID_ID), new ObjectId(storyId2)]
			});
			const story1 = mockStory();
			const story2 = mockStory({ _id: new ObjectId(storyId2), title: 'Story 2' });
			const reportResult = { reportName: 'test_report', reportTime: 123, success: true };
			const finalReport = {
				reportName: 'sanity_report',
				scenariosTested: { passed: 2, failed: 0 },
				groupTestResults: { passedSteps: 4, failedSteps: 0, skippedSteps: 0 },
			};

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory)
				.mockResolvedValueOnce(story1 as any)
				.mockResolvedValueOnce(story2 as any);
			vi.mocked(testRunnerService.executeTest).mockResolvedValue(reportResult);
			vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue(finalReport);
			vi.mocked(reportService.updateLatestTestStatus).mockResolvedValue(undefined);

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			// Both stories should be executed
			expect(testRunnerService.executeTest).toHaveBeenCalledTimes(2);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should forward error to next when executeTest fails', async () => {
			const group = mockGroup();
			const story = mockStory();

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(testRunnerService.executeTest).mockRejectedValue(new Error('Cucumber crashed'));

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should return 500 when executeTest returns no reportName', async () => {
			const group = mockGroup();
			const story = mockStory();

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(testRunnerService.executeTest).mockResolvedValue({ success: true });

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
		});

		it('should clean up sanity folder on error', async () => {
			const group = mockGroup();
			const story = mockStory();

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(testRunnerService.executeTest).mockRejectedValue(new Error('fail'));
			vi.mocked(fs.existsSync).mockReturnValue(true);

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(fs.rm).toHaveBeenCalled();
		});

		it('should schedule report deletion after successful response', async () => {
			const group = mockGroup();
			const story = mockStory();
			const reportResult = { reportName: 'test_report', reportTime: 123, success: true };
			const finalReport = {
				reportName: 'sanity_report',
				scenariosTested: { passed: 1, failed: 0 },
				groupTestResults: { passedSteps: 1, failedSteps: 0, skippedSteps: 0 },
			};

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(testRunnerService.executeTest).mockResolvedValue(reportResult);
			vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue(finalReport);
			vi.mocked(reportService.updateLatestTestStatus).mockResolvedValue(undefined);

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			expect(reportService.scheduleReportDeletion).toHaveBeenCalledWith(
				'sanity_report',
				true,
				expect.any(Number)
			);
		});

		it('should not crash when post-response cleanup fails', async () => {
			const group = mockGroup();
			const story = mockStory();
			const reportResult = { reportName: 'test_report', reportTime: 123, success: true };
			const finalReport = {
				reportName: 'sanity_report',
				scenariosTested: { passed: 1, failed: 0 },
				groupTestResults: { passedSteps: 1, failedSteps: 0, skippedSteps: 0 },
			};

			vi.mocked(repositoryService.getOneStoryGroup).mockResolvedValue(group as any);
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(testRunnerService.executeTest).mockResolvedValue(reportResult);
			vi.mocked(reportService.resolveAndSaveReport).mockResolvedValue(finalReport);
			vi.mocked(reportService.updateLatestTestStatus).mockRejectedValue(new Error('DB down'));

			const req = createReq();
			const res = createRes();

			await controller.runSanityTest(req, res, next);

			// Response was already sent before cleanup failed
			expect(res.status).toHaveBeenCalledWith(200);
			expect(next).not.toHaveBeenCalled();
		});
	});
});
