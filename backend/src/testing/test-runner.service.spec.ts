// src/testing/test-runner.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// --- Mock dependencies ---

const mockLoadConfiguration = vi.fn();
const mockRunCucumber = vi.fn();
const mockLoadSupport = vi.fn();

vi.mock('@cucumber/cucumber/api', () => ({
	loadConfiguration: (...args: any[]) => mockLoadConfiguration(...args),
	runCucumber: (...args: any[]) => mockRunCucumber(...args),
	loadSupport: (...args: any[]) => mockLoadSupport(...args)
}));

vi.mock('../services/repository.service', () => ({
	getRepoSettingsById: vi.fn()
}));

vi.mock('../services/feature-file.service', () => ({
	cleanFileName: vi.fn((name: string) => name.replace(/[^a-zA-Z0-9_]/g, '_')),
	updateFeatureFile: vi.fn()
}));

vi.mock('node:fs', () => ({
	default: {
		constants: { F_OK: 0 }
	},
	constants: { F_OK: 0 }
}));

vi.mock('node:fs/promises', () => ({
	default: {
		access: vi.fn()
	},
	access: vi.fn()
}));

vi.mock('node:path', () => ({
	default: {
		normalize: vi.fn((p: string) => p),
		resolve: vi.fn((...args: string[]) => args.join('/'))
	},
	normalize: vi.fn((p: string) => p),
	resolve: vi.fn((...args: string[]) => args.join('/'))
}));

vi.mock('../logging', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

// --- Import modules under test and mocked modules ---

import { executeTest } from './test-runner.service.js';
import * as repositoryService from '../services/repository.service.js';
import * as featureFileService from '../services/feature-file.service.js';
import pfs from 'node:fs/promises';

// --- Test Helpers ---

const VALID_ID = '507f1f77bcf86cd799439011';

function createReq(overrides: Record<string, any> = {}) {
	return {
		body: {
			repositoryId: VALID_ID,
			testRunner: 'seleniumWebdriver',
			...overrides.body
		},
		params: {
			...overrides.params
		},
		user: overrides.user ?? { _id: new ObjectId(VALID_ID), email: 'test@seed.de' }
	};
}

function mockStory(overrides: Record<string, any> = {}) {
	return {
		_id: new ObjectId(VALID_ID),
		title: 'Test Story',
		scenarios: [{
			scenario_id: 1,
			name: 'Scenario 1',
			browser: 'chromium',
			stepWaitTime: 0,
			stepDefinitions: { given: [], when: [], then: [], example: [] }
		}],
		...overrides
	};
}

// --- Tests ---

describe('test-runner.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: feature file exists, cucumber runs successfully
		vi.mocked(pfs.access).mockResolvedValue(undefined);
		vi.mocked(repositoryService.getRepoSettingsById).mockResolvedValue({});
		mockLoadConfiguration.mockResolvedValue({ runConfiguration: {} });
		mockLoadSupport.mockResolvedValue({ supportCode: true });
		mockRunCucumber.mockResolvedValue({ success: true });
	});

	describe('executeTest', () => {
		it('should throw when repositoryId is missing', async () => {
			const req = createReq({ body: { repositoryId: undefined, repoId: undefined } });
			const story = mockStory();

			await expect(executeTest(req as any, 'feature', story as any))
				.rejects.toThrow('Repository ID is missing');
		});

		it('should accept repoId as fallback for repositoryId', async () => {
			const req = createReq({ body: { repositoryId: undefined, repoId: VALID_ID } });
			const story = mockStory();

			const result = await executeTest(req, 'feature', story as any);

			expect(result.success).toBe(true);
			expect(repositoryService.getRepoSettingsById).toHaveBeenCalledWith(VALID_ID);
		});

		it('should return success result for feature mode', async () => {
			const req = createReq();
			const story = mockStory();

			const result = await executeTest(req, 'feature', story as any);

			expect(result.success).toBe(true);
			expect(result.story).toBe(story);
			expect(result.reportName).toContain('reporting_');
			expect(result.reportTime).toBeTypeOf('number');
		});

		it('should throw when scenario not found in scenario mode', async () => {
			const req = createReq({ params: { scenarioId: '999' } });
			const story = mockStory();

			await expect(executeTest(req as any, 'scenario', story as any))
				.rejects.toThrow('Scenario with ID 999 not found');
		});

		it('should return success result for scenario mode', async () => {
			const req = createReq({ params: { scenarioId: '1', issueID: 'ISSUE-1' } });
			const story = mockStory();

			const result = await executeTest(req, 'scenario', story as any);

			expect(result.success).toBe(true);
			expect(result.scenarioId).toBe('1');
		});

		it('should write report to group subdirectory in group mode', async () => {
			const req = createReq({ body: { repositoryId: VALID_ID, name: 'my_group' } });
			const story = mockStory();

			const result = await executeTest(req, 'group', story as any);

			expect(result.success).toBe(true);
			// Verify cucumber config uses group subdirectory for report output
			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.format[0]).toContain('my_group/');
		});

		it('should regenerate feature file when not found on disk', async () => {
			vi.mocked(pfs.access).mockRejectedValue(new Error('ENOENT'));
			const req = createReq();
			const story = mockStory();

			await executeTest(req, 'feature', story as any);

			expect(featureFileService.updateFeatureFile).toHaveBeenCalledWith(VALID_ID);
		});

		it('should not regenerate feature file when it exists', async () => {
			vi.mocked(pfs.access).mockResolvedValue(undefined);
			const req = createReq();
			const story = mockStory();

			await executeTest(req, 'feature', story as any);

			expect(featureFileService.updateFeatureFile).not.toHaveBeenCalled();
		});

		it('should include github login in report name when available', async () => {
			const req = createReq({ user: { github: { login: 'octocat' } } });
			const story = mockStory();

			const result = await executeTest(req, 'feature', story as any);

			expect(result.reportName).toContain('octocat_');
		});

		it('should use "reporting_" prefix when no github user', async () => {
			const req = createReq({ user: { email: 'test@seed.de' } });
			const story = mockStory();

			const result = await executeTest(req, 'feature', story as any);

			expect(result.reportName).toMatch(/^reporting_/);
		});

		it('should return success: false when cucumber throws', async () => {
			mockRunCucumber.mockRejectedValue(new Error('Cucumber crashed'));
			const req = createReq();
			const story = mockStory();

			const result = await executeTest(req, 'feature', story as any);

			expect(result.success).toBe(false);
			expect(result.reportName).toBeDefined();
		});

		it('should return success: false when cucumber reports failure', async () => {
			mockRunCucumber.mockResolvedValue({ success: false });
			const req = createReq();
			const story = mockStory();

			const result = await executeTest(req, 'feature', story as any);

			expect(result.success).toBe(false);
		});

		it('should default to seleniumWebdriver when testRunner not specified', async () => {
			const req = createReq({ body: { repositoryId: VALID_ID, testRunner: undefined } });
			const story = mockStory();

			await executeTest(req, 'feature', story as any);

			// Verify require path uses selenium-webdriver
			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.require[0]).toContain('selenium-webdriver');
		});

		it('should use playwright path when testRunner is playwright', async () => {
			const req = createReq({ body: { repositoryId: VALID_ID, testRunner: 'playwright' } });
			const story = mockStory();

			await executeTest(req, 'feature', story as any);

			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.require[0]).toContain('playwright');
		});

		it('should multiply parameters for scenarios with examples', async () => {
			const req = createReq({ params: { scenarioId: '1', issueID: 'ISSUE-1' } });
			const story = mockStory({
				scenarios: [{
					scenario_id: 1,
					name: 'Scenario 1',
					browser: 'chromium',
					stepWaitTime: 0,
					stepDefinitions: { given: [], when: [], then: [], example: [{ values: {} }, { values: {} }, { values: {} }] }
				}]
			});

			await executeTest(req, 'scenario', story as any);

			// Verify worldParameters has 3 scenario entries for 3 examples
			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.worldParameters.scenarios).toHaveLength(3);
		});

		it('should apply global settings when activated', async () => {
			vi.mocked(repositoryService.getRepoSettingsById).mockResolvedValue({
				activated: true,
				browser: 'firefox',
				stepWaitTime: 500
			});
			const req = createReq({ params: { scenarioId: '1', issueID: 'ISSUE-1' } });
			const story = mockStory();

			await executeTest(req, 'scenario', story as any);

			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.worldParameters.scenarios[0].browser).toBe('firefox');
			expect(configArg.worldParameters.scenarios[0].waitTime).toBe(500);
		});

		it('should use request overrides in scenario mode when global settings not activated', async () => {
			vi.mocked(repositoryService.getRepoSettingsById).mockResolvedValue({});
			const req = createReq({
				body: { repositoryId: VALID_ID, browser: 'webkit', stepWaitTime: 200 },
				params: { scenarioId: '1', issueID: 'ISSUE-1' }
			});
			const story = mockStory();

			await executeTest(req, 'scenario', story as any);

			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.worldParameters.scenarios[0].browser).toBe('webkit');
			expect(configArg.worldParameters.scenarios[0].waitTime).toBe(200);
		});

		it('should set tags for scenario mode', async () => {
			const req = createReq({ params: { scenarioId: '1', issueID: 'ISSUE-42' } });
			const story = mockStory();

			await executeTest(req, 'scenario', story as any);

			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.tags).toBe('@ISSUE-42_1');
		});

		it('should not set tags for feature mode', async () => {
			const req = createReq();
			const story = mockStory();

			await executeTest(req, 'feature', story as any);

			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.tags).toBeUndefined();
		});

		it('should handle emulator in global settings', async () => {
			vi.mocked(repositoryService.getRepoSettingsById).mockResolvedValue({
				activated: true,
				emulator: 'iPhone 12'
			});
			const req = createReq({ params: { scenarioId: '1', issueID: 'ISSUE-1' } });
			const story = mockStory();

			await executeTest(req, 'scenario', story as any);

			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.worldParameters.scenarios[0].emulator).toBe('iPhone 12');
			expect(configArg.worldParameters.scenarios[0].windowSize).toBeUndefined();
		});

		it('should handle window size in global settings when no emulator', async () => {
			vi.mocked(repositoryService.getRepoSettingsById).mockResolvedValue({
				activated: true,
				width: 1920,
				height: 1080
			});
			const req = createReq({ params: { scenarioId: '1', issueID: 'ISSUE-1' } });
			const story = mockStory();

			await executeTest(req, 'scenario', story as any);

			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			expect(configArg.worldParameters.scenarios[0].windowSize).toEqual({ width: 1920, height: 1080 });
		});

		it('should prepare multiple scenarios in feature mode via scenarioPrep', async () => {
			const req = createReq();
			const story = mockStory({
				scenarios: [
					{ scenario_id: 1, name: 'S1', browser: 'chromium', stepWaitTime: 0, stepDefinitions: { given: [], when: [], then: [] } },
					{ scenario_id: 2, name: 'S2', browser: 'firefox', stepWaitTime: 100, stepDefinitions: { given: [], when: [], then: [] } }
				]
			});

			await executeTest(req, 'feature', story as any);

			const configArg = mockLoadConfiguration.mock.calls[0][0].provided;
			// Both scenarios should have their own parameters
			expect(configArg.worldParameters.scenarios).toHaveLength(2);
			expect(configArg.worldParameters.scenarios[0].browser).toBe('chromium');
			expect(configArg.worldParameters.scenarios[1].browser).toBe('firefox');
		});
	});
});
