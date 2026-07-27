// src/controllers/story.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock all service/helper dependencies ---
// These are hoisted by Vitest and run before all imports.

vi.mock('../services/story.service', () => ({
	getOneStory: vi.fn(),
	getAllStoriesOfRepo: vi.fn(),
	createStory: vi.fn(),
	updateStory: vi.fn(),
	deleteStory: vi.fn(),
	getOneScenario: vi.fn(),
	createScenario: vi.fn(),
	updateScenario: vi.fn(),
	deleteScenario: vi.fn(),
	updateScenarioList: vi.fn(),
	updateOneDriver: vi.fn(),
	getOneStoryByIssueKey: vi.fn()
}));

vi.mock('../services/feature-file.service', () => ({
	updateFeatureFile: vi.fn(),
	deleteFeatureFile: vi.fn(),
	exportSingleFeatureFile: vi.fn(),
	exportProjectFeatureFiles: vi.fn(),
	cleanFileName: vi.fn((name: string) => name.replace(/[^a-zA-Z0-9]/g, '_'))
}));

vi.mock('../services/import-export.service', () => ({
	exportProject: vi.fn(),
	importProject: vi.fn()
}));

vi.mock('../services/repository.service', () => ({
	getOneRepositoryById: vi.fn(),
	insertStoryIdIntoRepo: vi.fn(),
	updateStoriesArrayInRepo: vi.fn()
}));

vi.mock('../services/ai.service', () => ({
	isAiParserAvailable: vi.fn(),
	queueAiScenarioGeneration: vi.fn(),
	aiJobEmitter: { on: vi.fn(), removeListener: vi.fn() }
}));

vi.mock('../services/xray.service', () => ({
	deleteXrayStep: vi.fn()
}));

vi.mock('../services/externalSync.service', () => ({
	getStoriesFromSource: vi.fn(),
	matchStoryOrder: vi.fn()
}));

vi.mock('../helpers/specialCommandParser', () => ({
	applySpecialCommands: vi.fn()
}));

vi.mock('../logging', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

// --- Import the controller under test and mocked modules ---

import * as controller from './story.controller.js';
import * as storyService from '../services/story.service.js';
import * as featureFileService from '../services/feature-file.service.js';
import * as importExportService from '../services/import-export.service.js';
import * as repositoryService from '../services/repository.service.js';
import * as aiService from '../services/ai.service.js';
import * as xrayService from '../services/xray.service.js';
import * as externalSyncService from '../services/externalSync.service.js';
import * as specialCommandParser from '../helpers/specialCommandParser.js';

// --- Test Helpers ---

/** Valid 24-char hex ObjectId strings for use in tests */
const VALID_STORY_ID = new ObjectId().toHexString();
const VALID_REPO_ID = new ObjectId().toHexString();
const INVALID_ID = 'not-a-valid-id';

/** Creates a mock Express Request with sensible defaults */
function mockRequest(overrides: Partial<{
	params: Record<string, string>;
	query: Record<string, string>;
	body: any;
	headers: Record<string, string>;
	user: any;
	file: any;
	method: string;
}> = {}): any {
	return {
		params: {},
		query: {},
		body: {},
		headers: {},
		user: { _id: new ObjectId().toHexString() },
		file: undefined,
		method: 'GET',
		on: vi.fn(),
		...overrides
	};
}

/** Creates a mock Express Response with chainable .status() */
function mockResponse(): any {
	const res: any = {
		statusCode: 200,
		json: vi.fn(),
		send: vi.fn(),
		write: vi.fn(),
		end: vi.fn(),
		setHeader: vi.fn(),
		flushHeaders: vi.fn(),
		charset: ''
	};
	res.status = vi.fn((code: number) => {
		res.statusCode = code;
		return res;
	});
	return res;
}

// --- Test Suite ---

describe('StoryController', () => {
	let req: ReturnType<typeof mockRequest>;
	let res: ReturnType<typeof mockResponse>;
	let next: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		req = mockRequest();
		res = mockResponse();
		next = vi.fn();
	});

	// === getStories ===

	describe('getStories', () => {
		it('should return stories from DB source with valid repoId', async () => {
			const stories = [{ _id: VALID_STORY_ID, title: 'Story 1' }];
			const repo = { _id: VALID_REPO_ID, repoName: 'TestRepo' };
			req.query = { source: 'db', id: VALID_REPO_ID };

			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue(stories as any);
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(repo as any);
			vi.mocked(externalSyncService.matchStoryOrder).mockResolvedValue(stories as any);

			await controller.getStories(req, res, next);

			expect(storyService.getAllStoriesOfRepo).toHaveBeenCalledWith(VALID_REPO_ID);
			expect(repositoryService.getOneRepositoryById).toHaveBeenCalledWith(VALID_REPO_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(stories);
		});

		it('should pass AppError to next when DB source has invalid repoId', async () => {
			req.query = { source: 'db', id: INVALID_ID };

			await controller.getStories(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			const error = next.mock.calls[0][0] as AppError;
			expect(error.statusCode).toBe(400);
		});

		it('should pass AppError to next when DB source has missing id', async () => {
			req.query = { source: 'db', id: '' };

			await controller.getStories(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should return stories from GitHub source', async () => {
			const stories = [{ title: 'GH Story' }];
			req.query = { source: 'github', id: '123' };
			req.user = { _id: 'user1', github: { login: 'test' } };

			vi.mocked(externalSyncService.getStoriesFromSource).mockResolvedValue(stories as any);

			await controller.getStories(req, res, next);

			expect(externalSyncService.getStoriesFromSource).toHaveBeenCalledWith(req.user, req.query);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(stories);
		});

		it('should return stories from Jira source', async () => {
			const stories = [{ title: 'Jira Story' }];
			req.query = { source: 'jira', id: '456' };
			req.user = { _id: 'user1', jira: { AccountName: 'test' } };

			vi.mocked(externalSyncService.getStoriesFromSource).mockResolvedValue(stories as any);

			await controller.getStories(req, res, next);

			expect(externalSyncService.getStoriesFromSource).toHaveBeenCalledWith(req.user, req.query);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(stories);
		});

		it('should pass AppError to next for invalid source parameter', async () => {
			req.query = { source: 'unknown', id: VALID_REPO_ID };

			await controller.getStories(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should still return stories when repo is not found (null)', async () => {
			// When the repo lookup returns null, the ordering step is skipped
			const stories = [{ _id: VALID_STORY_ID, title: 'Story 1' }];
			req.query = { source: 'db', id: VALID_REPO_ID };

			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue(stories as any);
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(null);

			await controller.getStories(req, res, next);

			expect(externalSyncService.matchStoryOrder).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(stories);
		});

		it('should pass service errors to next', async () => {
			req.query = { source: 'db', id: VALID_REPO_ID };
			const serviceError = new Error('DB connection failed');

			vi.mocked(storyService.getAllStoriesOfRepo).mockRejectedValue(serviceError);

			await controller.getStories(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
		});
	});

	// === getStoryById ===

	describe('getStoryById', () => {
		it('should return a story when found', async () => {
			const story = { _id: VALID_STORY_ID, title: 'Found Story' };
			req.params = { _id: VALID_STORY_ID };

			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);

			await controller.getStoryById(req, res, next);

			expect(storyService.getOneStory).toHaveBeenCalledWith(VALID_STORY_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(story);
		});

		it('should pass 404 AppError to next when story is not found', async () => {
			req.params = { _id: VALID_STORY_ID };

			vi.mocked(storyService.getOneStory).mockResolvedValue(null);

			await controller.getStoryById(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(404);
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { _id: INVALID_ID };

			await controller.getStoryById(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === getStoryByIssueKey ===

	describe('getStoryByIssueKey', () => {
		it('should return a story when found by issue key', async () => {
			const story = { _id: VALID_STORY_ID, title: 'Jira Story', issue_number: 42 };
			req.params = { issue_key: 'PROJ-123' };

			vi.mocked(storyService.getOneStoryByIssueKey).mockResolvedValue(story as any);

			await controller.getStoryByIssueKey(req, res, next);

			expect(storyService.getOneStoryByIssueKey).toHaveBeenCalledWith('PROJ-123');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(story);
		});

		it('should pass 404 AppError to next when story is not found', async () => {
			req.params = { issue_key: 'PROJ-999' };

			vi.mocked(storyService.getOneStoryByIssueKey).mockResolvedValue(null);

			await controller.getStoryByIssueKey(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(404);
		});

		it('should pass 400 AppError to next for empty issue key', async () => {
			req.params = { issue_key: '' };

			await controller.getStoryByIssueKey(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === createStory ===

	describe('createStory', () => {
		it('should create a story and return the new ID', async () => {
			const newId = new ObjectId();
			req.body = { title: 'New Story', description: 'Description', _id: VALID_REPO_ID };

			vi.mocked(storyService.createStory).mockResolvedValue(newId);
			vi.mocked(repositoryService.insertStoryIdIntoRepo).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.createStory(req, res, next);

			expect(storyService.createStory).toHaveBeenCalledWith('New Story', 'Description', VALID_REPO_ID);
			expect(repositoryService.insertStoryIdIntoRepo).toHaveBeenCalledWith(newId.toString(), VALID_REPO_ID);
			expect(featureFileService.updateFeatureFile).toHaveBeenCalledWith(newId.toString());
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ _id: newId });
		});

		it('should use empty string for description when not provided', async () => {
			const newId = new ObjectId();
			req.body = { title: 'No Desc Story', _id: VALID_REPO_ID };

			vi.mocked(storyService.createStory).mockResolvedValue(newId);
			vi.mocked(repositoryService.insertStoryIdIntoRepo).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.createStory(req, res, next);

			// Description defaults to empty string when omitted
			expect(storyService.createStory).toHaveBeenCalledWith('No Desc Story', '', VALID_REPO_ID);
		});

		it('should pass 400 AppError to next when title is missing', async () => {
			req.body = { description: 'No title', _id: VALID_REPO_ID };

			await controller.createStory(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next when repoId is invalid', async () => {
			req.body = { title: 'Story', _id: INVALID_ID };

			await controller.createStory(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next when repoId is missing', async () => {
			req.body = { title: 'Story' };

			await controller.createStory(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === updateStory ===

	describe('updateStory', () => {
		it('should update a story and trigger feature file update', async () => {
			req.params = { _id: VALID_STORY_ID };
			req.body = { title: 'Updated Title', scenarios: [] };
			const updateResult = { modifiedCount: 1 };

			vi.mocked(storyService.updateStory).mockResolvedValue(updateResult);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.updateStory(req, res, next);

			// Controller should set _id on body to match URL parameter
			expect(storyService.updateStory).toHaveBeenCalled();
			expect(featureFileService.updateFeatureFile).toHaveBeenCalledWith(VALID_STORY_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updateResult);
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { _id: INVALID_ID };
			req.body = { title: 'Updated Title' };

			await controller.updateStory(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass service errors to next', async () => {
			req.params = { _id: VALID_STORY_ID };
			req.body = { title: 'Updated' };
			const dbError = new Error('Update failed');

			vi.mocked(storyService.updateStory).mockRejectedValue(dbError);

			await controller.updateStory(req, res, next);

			expect(next).toHaveBeenCalledWith(dbError);
		});
	});

	// === deleteStory ===

	describe('deleteStory', () => {
		it('should delete a story and its feature file', async () => {
			const story = { _id: VALID_STORY_ID, title: 'To Delete' };
			req.params = { repo_id: VALID_REPO_ID, _id: VALID_STORY_ID };

			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);
			vi.mocked(storyService.deleteStory).mockResolvedValue(undefined);
			vi.mocked(featureFileService.deleteFeatureFile).mockResolvedValue(undefined);

			await controller.deleteStory(req, res, next);

			expect(storyService.getOneStory).toHaveBeenCalledWith(VALID_STORY_ID);
			expect(storyService.deleteStory).toHaveBeenCalledWith(VALID_REPO_ID, VALID_STORY_ID);
			expect(featureFileService.deleteFeatureFile).toHaveBeenCalledWith('To Delete', VALID_STORY_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'success' });
		});

		it('should pass 400 AppError to next for invalid repo ID', async () => {
			req.params = { repo_id: INVALID_ID, _id: VALID_STORY_ID };

			await controller.deleteStory(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { repo_id: VALID_REPO_ID, _id: INVALID_ID };

			await controller.deleteStory(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 404 AppError to next when story is not found', async () => {
			req.params = { repo_id: VALID_REPO_ID, _id: VALID_STORY_ID };

			vi.mocked(storyService.getOneStory).mockResolvedValue(null);

			await controller.deleteStory(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(404);
		});
	});

	// === updateStoryOrder ===

	describe('updateStoryOrder', () => {
		it('should update the story order for a valid repo', async () => {
			const storyIds = [new ObjectId().toHexString(), new ObjectId().toHexString()];
			req.params = { repo_id: VALID_REPO_ID };
			req.body = storyIds;

			vi.mocked(repositoryService.updateStoriesArrayInRepo).mockResolvedValue(null);

			await controller.updateStoryOrder(req, res, next);

			expect(repositoryService.updateStoriesArrayInRepo).toHaveBeenCalledWith(VALID_REPO_ID, storyIds);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Story order updated' });
		});

		it('should pass 400 AppError to next for invalid repo ID', async () => {
			req.params = { repo_id: INVALID_ID };
			req.body = [];

			await controller.updateStoryOrder(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === getScenario ===

	describe('getScenario', () => {
		it('should return a scenario when found', async () => {
			const scenario = { scenario_id: 1, name: 'Test Scenario' };
			req.params = { story_id: VALID_STORY_ID, _id: '1' };

			vi.mocked(storyService.getOneScenario).mockResolvedValue(scenario as any);

			await controller.getScenario(req, res, next);

			expect(storyService.getOneScenario).toHaveBeenCalledWith(VALID_STORY_ID, 1);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(scenario);
		});

		it('should pass 404 AppError to next when scenario is not found', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '99' };

			vi.mocked(storyService.getOneScenario).mockResolvedValue(undefined);

			await controller.getScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(404);
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { story_id: INVALID_ID, _id: '1' };

			await controller.getScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next for non-numeric scenario ID', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: 'abc' };

			await controller.getScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === createScenario ===

	describe('createScenario', () => {
		it('should create a scenario with the provided name', async () => {
			const scenario = { scenario_id: 1, name: 'Login Scenario' };
			req.params = { story_id: VALID_STORY_ID };
			req.body = { name: 'Login Scenario' };

			vi.mocked(storyService.createScenario).mockResolvedValue(scenario as any);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.createScenario(req, res, next);

			expect(storyService.createScenario).toHaveBeenCalledWith(VALID_STORY_ID, 'Login Scenario');
			expect(featureFileService.updateFeatureFile).toHaveBeenCalledWith(VALID_STORY_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(scenario);
		});

		it('should default to "New Scenario" when name is not provided', async () => {
			const scenario = { scenario_id: 1, name: 'New Scenario' };
			req.params = { story_id: VALID_STORY_ID };
			req.body = {};

			vi.mocked(storyService.createScenario).mockResolvedValue(scenario as any);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.createScenario(req, res, next);

			expect(storyService.createScenario).toHaveBeenCalledWith(VALID_STORY_ID, 'New Scenario');
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { story_id: INVALID_ID };

			await controller.createScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === updateScenario ===

	describe('updateScenario', () => {
		it('should update a scenario and trigger feature file update', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '1' };
			req.body = {
				scenario_id: 1,
				name: 'Updated Scenario',
				stepDefinitions: { given: [], when: [], then: [] }
			};

			vi.mocked(storyService.updateScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.updateScenario(req, res, next);

			expect(storyService.updateScenario).toHaveBeenCalledWith(VALID_STORY_ID, expect.objectContaining({
				scenario_id: 1
			}));
			expect(featureFileService.updateFeatureFile).toHaveBeenCalledWith(VALID_STORY_ID);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should clean null entries from multipleScenarios', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '2' };
			req.body = {
				scenario_id: 2,
				name: 'With Nulls',
				stepDefinitions: { given: [], when: [], then: [] },
				multipleScenarios: [{ name: 'valid' }, null, undefined, { name: 'also valid' }]
			};

			vi.mocked(storyService.updateScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.updateScenario(req, res, next);

			// Null/undefined entries should be filtered out before saving
			const savedScenario = vi.mocked(storyService.updateScenario).mock.calls[0][1];
			expect(savedScenario.multipleScenarios).toEqual([{ name: 'valid' }, { name: 'also valid' }]);
		});

		it('should migrate old stepDefinitions.example to multipleScenarios when multipleScenarios is empty', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '3' };
			req.body = {
				scenario_id: 3,
				name: 'Migration Test',
				stepDefinitions: { given: [], when: [], then: [], example: [{ name: 'ex1' }, { name: 'ex2' }] },
				multipleScenarios: []
			};

			vi.mocked(storyService.updateScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.updateScenario(req, res, next);

			// Old examples should be migrated to multipleScenarios and example field deleted
			const savedScenario = vi.mocked(storyService.updateScenario).mock.calls[0][1];
			expect(savedScenario.multipleScenarios).toEqual([{ name: 'ex1' }, { name: 'ex2' }]);
			expect((savedScenario.stepDefinitions as any).example).toBeUndefined();
		});

		it('should NOT overwrite existing multipleScenarios when old example exists', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '4' };
			req.body = {
				scenario_id: 4,
				name: 'No Overwrite',
				stepDefinitions: { given: [], when: [], then: [], example: [{ name: 'old' }] },
				multipleScenarios: [{ name: 'existing' }]
			};

			vi.mocked(storyService.updateScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.updateScenario(req, res, next);

			// Existing multipleScenarios should be preserved; only the old example field is deleted
			const savedScenario = vi.mocked(storyService.updateScenario).mock.calls[0][1];
			expect(savedScenario.multipleScenarios).toEqual([{ name: 'existing' }]);
			expect((savedScenario.stepDefinitions as any).example).toBeUndefined();
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { story_id: INVALID_ID, _id: '1' };
			req.body = { scenario_id: 1, stepDefinitions: {} };

			await controller.updateScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next for non-numeric scenario ID', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: 'abc' };
			req.body = { stepDefinitions: {} };

			await controller.updateScenario(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === deleteScenario ===

	describe('deleteScenario', () => {
		it('should delete a scenario from DB successfully (no XRay)', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '1' };
			req.headers = {};

			vi.mocked(storyService.deleteScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.deleteScenario(req, res, next);

			expect(storyService.deleteScenario).toHaveBeenCalledWith(VALID_STORY_ID, 1);
			expect(featureFileService.updateFeatureFile).toHaveBeenCalledWith(VALID_STORY_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Scenario deleted successfully.' });
		});

		it('should delete from both DB and XRay when xray-enabled header is true', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '2' };
			req.headers = { 'x-xray-enabled': 'true', 'x-test-key': 'TEST-123' };
			req.user = { _id: 'user1', jira: { AccountName: 'test', Host: 'jira.example.com' } };

			vi.mocked(storyService.deleteScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);
			vi.mocked(xrayService.deleteXrayStep).mockResolvedValue(undefined);

			await controller.deleteScenario(req, res, next);

			expect(xrayService.deleteXrayStep).toHaveBeenCalledWith(req.user, 'TEST-123', 2);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should throw when invalid story ID is provided', async () => {
			req.params = { story_id: INVALID_ID, _id: '1' };

			// deleteScenario throws directly (no try/catch wrapping for validation)
			await expect(controller.deleteScenario(req, res, next)).rejects.toThrow();
		});

		it('should throw when non-numeric scenario ID is provided', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: 'abc' };

			await expect(controller.deleteScenario(req, res, next)).rejects.toThrow();
		});

		it('should throw when DB deletion fails', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '1' };
			req.headers = {};
			const dbError = new Error('DB failed');

			vi.mocked(storyService.deleteScenario).mockRejectedValue(dbError);

			await expect(controller.deleteScenario(req, res, next)).rejects.toThrow('Error during deletion');
		});

		it('should throw when XRay deletion fails', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '3' };
			req.headers = { 'x-xray-enabled': 'true', 'x-test-key': 'TEST-456' };
			req.user = { _id: 'user1', jira: { AccountName: 'test', Host: 'jira.example.com' } };

			vi.mocked(storyService.deleteScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);
			vi.mocked(xrayService.deleteXrayStep).mockRejectedValue(new Error('XRay API down'));

			await expect(controller.deleteScenario(req, res, next)).rejects.toThrow('XRay error');
		});

		it('should not call XRay when xray-enabled header is absent', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '1' };
			req.headers = {};
			req.user = { _id: 'user1', jira: { AccountName: 'test' } };

			vi.mocked(storyService.deleteScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.deleteScenario(req, res, next);

			expect(xrayService.deleteXrayStep).not.toHaveBeenCalled();
		});

		it('should not call XRay when user has no jira config', async () => {
			req.params = { story_id: VALID_STORY_ID, _id: '1' };
			req.headers = { 'x-xray-enabled': 'true' };
			req.user = { _id: 'user1' };

			vi.mocked(storyService.deleteScenario).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.deleteScenario(req, res, next);

			expect(xrayService.deleteXrayStep).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
		});
	});

	// === updateScenarioList ===

	describe('updateScenarioList', () => {
		it('should update the scenario list for a valid story', async () => {
			const scenarioList = [{ scenario_id: 1, name: 'S1' }, { scenario_id: 2, name: 'S2' }];
			req.params = { story_id: VALID_STORY_ID };
			req.body = scenarioList;

			vi.mocked(storyService.updateScenarioList).mockResolvedValue(undefined);
			vi.mocked(featureFileService.updateFeatureFile).mockResolvedValue(undefined);

			await controller.updateScenarioList(req, res, next);

			expect(storyService.updateScenarioList).toHaveBeenCalledWith(VALID_STORY_ID, scenarioList);
			expect(featureFileService.updateFeatureFile).toHaveBeenCalledWith(VALID_STORY_ID);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { story_id: INVALID_ID };
			req.body = [];

			await controller.updateScenarioList(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === downloadSingleFeature ===

	describe('downloadSingleFeature', () => {
		it('should stream a feature file as an attachment', async () => {
			const story = { _id: VALID_STORY_ID, title: 'Login Feature' };
			req.params = { _id: VALID_STORY_ID };

			vi.mocked(featureFileService.exportSingleFeatureFile).mockResolvedValue('Feature: Login');
			vi.mocked(storyService.getOneStory).mockResolvedValue(story as any);

			await controller.downloadSingleFeature(req, res, next);

			expect(featureFileService.exportSingleFeatureFile).toHaveBeenCalledWith(VALID_STORY_ID);
			expect(res.setHeader).toHaveBeenCalledWith('Content-disposition', expect.stringContaining('attachment'));
			expect(res.setHeader).toHaveBeenCalledWith('Content-type', 'text/plain');
			expect(res.write).toHaveBeenCalledWith('Feature: Login');
			expect(res.end).toHaveBeenCalled();
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { _id: INVALID_ID };

			await controller.downloadSingleFeature(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === downloadProjectFeatures ===

	describe('downloadProjectFeatures', () => {
		it('should send a zip file of project features', async () => {
			const zipBuffer = Buffer.from('zip-content');
			const repo = { _id: VALID_REPO_ID, repoName: 'TestProject' };
			req.params = { repo_id: VALID_REPO_ID };
			req.query = {};

			vi.mocked(featureFileService.exportProjectFeatureFiles).mockResolvedValue(zipBuffer);
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(repo as any);

			await controller.downloadProjectFeatures(req, res, next);

			expect(featureFileService.exportProjectFeatureFiles).toHaveBeenCalledWith(VALID_REPO_ID, undefined);
			expect(res.setHeader).toHaveBeenCalledWith('Content-type', 'application/zip');
			expect(res.send).toHaveBeenCalledWith(zipBuffer);
		});

		it('should pass version_id query param to export service', async () => {
			const zipBuffer = Buffer.from('zip');
			req.params = { repo_id: VALID_REPO_ID };
			req.query = { version_id: 'v1.0' };

			vi.mocked(featureFileService.exportProjectFeatureFiles).mockResolvedValue(zipBuffer);
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(null);

			await controller.downloadProjectFeatures(req, res, next);

			expect(featureFileService.exportProjectFeatureFiles).toHaveBeenCalledWith(VALID_REPO_ID, 'v1.0');
		});

		it('should pass 400 AppError to next for invalid repo ID', async () => {
			req.params = { repo_id: INVALID_ID };

			await controller.downloadProjectFeatures(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === exportProjectArchive ===

	describe('exportProjectArchive', () => {
		it('should export and send a project archive zip', async () => {
			const zipBuffer = Buffer.from('archive-zip');
			const repo = { _id: VALID_REPO_ID, repoName: 'ExportProject' };
			req.params = { repo_id: VALID_REPO_ID };

			vi.mocked(importExportService.exportProject).mockResolvedValue(zipBuffer);
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(repo as any);

			await controller.exportProjectArchive(req, res, next);

			expect(importExportService.exportProject).toHaveBeenCalledWith(VALID_REPO_ID);
			expect(res.setHeader).toHaveBeenCalledWith('Content-type', 'application/zip');
			expect(res.send).toHaveBeenCalledWith(zipBuffer);
		});

		it('should pass 400 AppError to next for invalid repo ID', async () => {
			req.params = { repo_id: INVALID_ID };

			await controller.exportProjectArchive(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === importProjectArchive ===

	describe('importProjectArchive', () => {
		it('should pass 400 AppError to next when no file is uploaded', async () => {
			req.file = undefined;

			await controller.importProjectArchive(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should import a new project (POST) with valid projectName', async () => {
			const importResult = { repoId: VALID_REPO_ID, storiesCount: 5 };
			req.method = 'POST';
			req.file = { buffer: Buffer.from('archive-data'), originalname: 'project.zip' };
			req.query = { projectName: 'NewProject' };
			req.user = { _id: 'user123' };

			vi.mocked(importExportService.importProject).mockResolvedValue(importResult as any);

			await controller.importProjectArchive(req, res, next);

			expect(importExportService.importProject).toHaveBeenCalledWith(
				req.file, undefined, 'NewProject', false, 'user123'
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(importResult);
		});

		it('should pass 400 AppError to next for POST without projectName', async () => {
			req.method = 'POST';
			req.file = { buffer: Buffer.from('data') };
			req.query = {};

			await controller.importProjectArchive(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should update an existing project (PUT) with valid repoId', async () => {
			const importResult = { updated: true };
			req.method = 'PUT';
			req.file = { buffer: Buffer.from('updated-data') };
			req.query = { repo_id: VALID_REPO_ID, importMode: 'true' };
			req.user = { _id: 'user456' };

			vi.mocked(importExportService.importProject).mockResolvedValue(importResult as any);

			await controller.importProjectArchive(req, res, next);

			expect(importExportService.importProject).toHaveBeenCalledWith(
				req.file, VALID_REPO_ID, undefined, true, 'user456'
			);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should pass 400 AppError to next for PUT without valid repoId', async () => {
			req.method = 'PUT';
			req.file = { buffer: Buffer.from('data') };
			req.query = { repo_id: INVALID_ID };

			await controller.importProjectArchive(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === setOneDriver ===

	describe('setOneDriver', () => {
		it('should toggle oneDriver and return the result', async () => {
			const result = { _id: VALID_STORY_ID, oneDriver: true };
			req.params = { storyID: VALID_STORY_ID };
			req.body = { oneDriver: false };

			vi.mocked(storyService.updateOneDriver).mockResolvedValue(result as any);

			await controller.setOneDriver(req, res, next);

			expect(storyService.updateOneDriver).toHaveBeenCalledWith(VALID_STORY_ID, false);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(result);
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { storyID: INVALID_ID };

			await controller.setOneDriver(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === resolveSpecialCommands ===

	describe('resolveSpecialCommands', () => {
		it('should resolve a valid command string', () => {
			req.body = { command: '{random_url}' };

			vi.mocked(specialCommandParser.applySpecialCommands).mockReturnValue('https://example.com');

			controller.resolveSpecialCommands(req, res, next);

			expect(specialCommandParser.applySpecialCommands).toHaveBeenCalledWith('{random_url}');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ resolved: 'https://example.com' });
		});

		it('should pass 400 AppError to next when command is not a string', () => {
			req.body = { command: 12345 };

			controller.resolveSpecialCommands(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next when command is missing', () => {
			req.body = {};

			controller.resolveSpecialCommands(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should wrap non-AppError parser exceptions as 400 AppError', () => {
			req.body = { command: 'invalid{broken' };

			vi.mocked(specialCommandParser.applySpecialCommands).mockImplementation(() => {
				throw new Error('Parse failed');
			});

			controller.resolveSpecialCommands(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
			expect((next.mock.calls[0][0] as AppError).message).toBe('Parse failed');
		});

		it('should pass through AppError instances from the parser unchanged', () => {
			req.body = { command: 'test' };
			const appError = AppError.badRequest('Custom parser error');

			vi.mocked(specialCommandParser.applySpecialCommands).mockImplementation(() => {
				throw appError;
			});

			controller.resolveSpecialCommands(req, res, next);

			expect(next).toHaveBeenCalledWith(appError);
		});
	});

	// === generateAiScenarios ===

	describe('generateAiScenarios', () => {
		const aiConfig = {
			textPreparation: { provider: 'custom', name: 'local', modelName: 'test-model', baseURL: 'http://localhost:1234' },
			jsonConversion: { provider: 'custom', name: 'cloud', modelName: 'test-model-2', baseURL: 'http://localhost:5678' }
		};

		it('should accept and queue a valid AI generation request', async () => {
			req.params = { story_id: VALID_STORY_ID };
			req.body = { aiConfig };
			req.headers = { repoid: VALID_REPO_ID };

			vi.mocked(aiService.isAiParserAvailable).mockResolvedValue(true);

			await controller.generateAiScenarios(req, res, next);

			expect(aiService.queueAiScenarioGeneration).toHaveBeenCalledWith(VALID_STORY_ID, aiConfig, VALID_REPO_ID);
			expect(res.status).toHaveBeenCalledWith(202);
			expect(res.json).toHaveBeenCalledWith({ message: 'AI generation task accepted and queued.' });
		});

		it('should return 501 when AI parser is not available', async () => {
			req.params = { story_id: VALID_STORY_ID };
			req.body = { aiConfig };
			req.headers = { repoid: VALID_REPO_ID };

			vi.mocked(aiService.isAiParserAvailable).mockResolvedValue(false);

			await controller.generateAiScenarios(req, res, next);

			expect(res.status).toHaveBeenCalledWith(501);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('not available') }));
			// Should not attempt to queue
			expect(aiService.queueAiScenarioGeneration).not.toHaveBeenCalled();
		});

		it('should pass 400 AppError to next for invalid story ID', async () => {
			req.params = { story_id: INVALID_ID };
			req.body = { aiConfig };
			req.headers = { repoid: VALID_REPO_ID };

			vi.mocked(aiService.isAiParserAvailable).mockResolvedValue(true);

			await controller.generateAiScenarios(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next when aiConfig is missing', async () => {
			req.params = { story_id: VALID_STORY_ID };
			req.body = {};
			req.headers = { repoid: VALID_REPO_ID };

			vi.mocked(aiService.isAiParserAvailable).mockResolvedValue(true);

			await controller.generateAiScenarios(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next when repoid header is missing', async () => {
			req.params = { story_id: VALID_STORY_ID };
			req.body = { aiConfig };
			req.headers = {};

			vi.mocked(aiService.isAiParserAvailable).mockResolvedValue(true);

			await controller.generateAiScenarios(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});

		it('should pass 400 AppError to next when repoid header is invalid', async () => {
			req.params = { story_id: VALID_STORY_ID };
			req.body = { aiConfig };
			req.headers = { repoid: INVALID_ID };

			vi.mocked(aiService.isAiParserAvailable).mockResolvedValue(true);

			await controller.generateAiScenarios(req, res, next);

			expect(next).toHaveBeenCalledWith(expect.any(AppError));
			expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
		});
	});

	// === getAiGenerationStatus ===

	describe('getAiGenerationStatus', () => {
		it('should set up SSE headers and register an event listener', () => {
			req.params = { story_id: VALID_STORY_ID };

			controller.getAiGenerationStatus(req, res, next);

			// SSE headers should be set
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
			expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
			expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
			expect(res.flushHeaders).toHaveBeenCalled();

			// Should register listener on the AI job emitter
			expect(aiService.aiJobEmitter.on).toHaveBeenCalledWith(
				`job-done-${VALID_STORY_ID}`,
				expect.any(Function)
			);

			// Should register a cleanup handler on request close
			expect(req.on).toHaveBeenCalledWith('close', expect.any(Function));
		});

		it('should throw for invalid story ID', () => {
			req.params = { story_id: INVALID_ID };

			// getAiGenerationStatus throws directly (not wrapped in try/catch)
			expect(() => controller.getAiGenerationStatus(req, res, next)).toThrow();
		});
	});
});
