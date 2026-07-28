// src/services/report.service.spec.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';

// --- Hoisted mocks (available before vi.mock factories run) ---

const {
	mockReportDataCol, mockReportsCol, mockDb, mockGridFSBucket,
	mockReporter, mockStoryService, mockFsPromises
} = vi.hoisted(() => {
	const mockReportDataCol = {
		find: vi.fn(),
		findOne: vi.fn(),
		insertOne: vi.fn(),
		deleteOne: vi.fn(),
		updateOne: vi.fn(),
	};
	const mockReportsCol = {
		findOne: vi.fn(),
		insertOne: vi.fn(),
		deleteOne: vi.fn(),
	};
	const mockDb = {
		collection: vi.fn((name: string) => {
			if (name === 'ReportData') return mockReportDataCol;
			if (name === 'Reports') return mockReportsCol;
			return mockReportDataCol;
		}),
	};
	return {
		mockReportDataCol,
		mockReportsCol,
		mockDb,
		mockGridFSBucket: { delete: vi.fn(), openDownloadStream: vi.fn(), openUploadStreamWithId: vi.fn() },
		mockReporter: { generate: vi.fn() },
		mockStoryService: {
			getOneStory: vi.fn(),
			updateStoryStatus: vi.fn().mockResolvedValue(undefined),
			updateScenarioStatus: vi.fn().mockResolvedValue(undefined),
		},
		mockFsPromises: { readFile: vi.fn() },
	};
});

vi.mock('../database/DbConnector', () => ({ getConnection: () => mockDb }));
vi.mock('./story.service', () => mockStoryService);
vi.mock('cucumber-html-reporter', () => ({ default: mockReporter }));
vi.mock('node:fs/promises', () => ({ default: mockFsPromises }));

vi.mock('node:fs', () => ({
	default: {
		existsSync: vi.fn().mockReturnValue(true),
		readFileSync: vi.fn().mockReturnValue('[]'),
		readdirSync: vi.fn().mockReturnValue([]),
		writeFileSync: vi.fn(),
		promises: { readFile: vi.fn().mockResolvedValue('{}') },
		rm: vi.fn(),
		unlink: vi.fn(),
	},
	existsSync: vi.fn().mockReturnValue(true),
	readFileSync: vi.fn().mockReturnValue('[]'),
	readdirSync: vi.fn().mockReturnValue([]),
	writeFileSync: vi.fn(),
	promises: { readFile: vi.fn().mockResolvedValue('{}') },
	rm: vi.fn(),
	unlink: vi.fn(),
}));

vi.mock('node:path', () => ({
	default: {
		join: vi.fn((...args: string[]) => args.join('/')),
		dirname: vi.fn((p: string) => p.split('/').slice(0, -1).join('/')),
		resolve: vi.fn((...args: string[]) => args.join('/')),
	},
	join: vi.fn((...args: string[]) => args.join('/')),
	dirname: vi.fn((p: string) => p.split('/').slice(0, -1).join('/')),
	resolve: vi.fn((...args: string[]) => args.join('/')),
}));

vi.mock('node:stream/consumers', () => ({ text: vi.fn() }));
vi.mock('../logging', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('mongodb', async (importOriginal) => {
	const orig = await importOriginal<typeof import('mongodb')>();
	// Must use regular function — arrow functions cannot be called with `new`
	return { ...orig, GridFSBucket: vi.fn(function () { return mockGridFSBucket; }) };
});

// --- Top-level import (mocks hoisted, module imports with mocks in place) ---

import * as reportService from './report.service.js';
import { ExecutionMode, PassedCount, type StoryReport, type GroupReport } from '../models/models.js';
import fs from 'node:fs';

// --- Helpers ---

const VALID_ID = '507f1f77bcf86cd799439011';

function mockStory(overrides: Record<string, any> = {}) {
	return {
		_id: new ObjectId(VALID_ID),
		title: 'Test Story',
		scenarios: [{ scenario_id: 1, name: 'Scenario 1', lastTestPassed: false }],
		...overrides,
	};
}

/** Minimal Cucumber JSON report with one scenario */
function cucumberJson(storyId: string, stepStatus = 'passed') {
	return [{
		name: 'Test Story',
		uri: `TestStory_${storyId}.feature`,
		elements: [{
			type: 'scenario',
			name: 'Scenario 1',
			tags: [{ name: `@${storyId}_1` }],
			steps: [
				{ keyword: 'Given ', name: 'step 1', result: { status: stepStatus } },
				{ keyword: 'When ', name: 'step 2', result: { status: stepStatus } },
				{ keyword: 'Then ', name: 'step 3', result: { status: stepStatus } },
			],
		}],
	}];
}

// --- Tests ---

describe('report.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReportDataCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
		mockReportDataCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
		mockReportDataCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
		mockReportsCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
		mockReportsCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
	});

	// --- CRUD ---

	describe('getTestReports', () => {
		it('should query by both storyId and featureId', async () => {
			mockReportDataCol.find.mockReturnValue({
				toArray: vi.fn().mockResolvedValue([]),
			});

			await reportService.getTestReports(VALID_ID);

			expect(mockReportDataCol.find).toHaveBeenCalledWith(
				{ $or: [{ storyId: expect.any(ObjectId) }, { featureId: expect.any(ObjectId) }] },
				expect.objectContaining({ projection: expect.objectContaining({ jsonReport: 0 }) })
			);
		});
	});

	describe('getReportById', () => {
		it('should throw 404 when report not found', async () => {
			mockReportDataCol.findOne.mockResolvedValue(null);
			await expect(reportService.getReportById(VALID_ID)).rejects.toThrow('not found');
		});

		it('should fetch from Reports collection for smallReport', async () => {
			const smallReportId = new ObjectId();
			mockReportDataCol.findOne.mockResolvedValue({ _id: new ObjectId(VALID_ID), smallReport: smallReportId });
			mockReportsCol.findOne.mockResolvedValue({ jsonReport: '{"data": true}' });

			const result = await reportService.getReportById(VALID_ID);

			expect(result.jsonReport).toBe('{"data": true}');
		});
	});

	describe('getReportByName', () => {
		it('should throw 404 when report not found', async () => {
			mockReportDataCol.findOne.mockResolvedValue(null);
			await expect(reportService.getReportByName('missing')).rejects.toThrow('not found');
		});
	});

	describe('uploadReport', () => {
		it('should store metadata only when no JSON file exists', async () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);
			const report = { reportName: 'test', reportOptions: { jsonFile: '/missing.json' } };

			await reportService.uploadReport(report);

			expect(mockReportDataCol.insertOne).toHaveBeenCalledTimes(1);
			expect(mockReportsCol.insertOne).not.toHaveBeenCalled();
		});

		it('should store small reports in Reports collection', async () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.promises.readFile).mockResolvedValue('{"small": true}');

			const report = { reportName: 'test', reportOptions: { jsonFile: '/report.json' } };
			await reportService.uploadReport(report);

			expect(mockReportsCol.insertOne).toHaveBeenCalledTimes(1);
			expect(mockReportDataCol.insertOne).toHaveBeenCalledTimes(1);
		});
	});

	describe('deleteReport', () => {
		it('should throw 404 when report not found', async () => {
			mockReportDataCol.findOne.mockResolvedValue(null);
			await expect(reportService.deleteReport(VALID_ID)).rejects.toThrow('not found');
		});

		it('should delete smallReport from Reports collection', async () => {
			const smallId = new ObjectId();
			mockReportDataCol.findOne.mockResolvedValue({ _id: new ObjectId(VALID_ID), smallReport: smallId });

			await reportService.deleteReport(VALID_ID);

			expect(mockReportsCol.deleteOne).toHaveBeenCalledWith({ _id: smallId });
			expect(mockReportDataCol.deleteOne).toHaveBeenCalled();
		});

		it('should delete bigReport from GridFS', async () => {
			const bigId = new ObjectId();
			mockReportDataCol.findOne.mockResolvedValue({ _id: new ObjectId(VALID_ID), bigReport: bigId });

			await reportService.deleteReport(VALID_ID);

			expect(mockGridFSBucket.delete).toHaveBeenCalledWith(expect.any(ObjectId));
			expect(mockReportDataCol.deleteOne).toHaveBeenCalled();
		});
	});

	describe('setIsSavedTestReport', () => {
		it('should update isSaved flag', async () => {
			await reportService.setIsSavedTestReport(VALID_ID, true);

			expect(mockReportDataCol.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(VALID_ID) },
				{ $set: { isSaved: true } }
			);
		});
	});

	// --- Status Updates ---

	describe('updateLatestTestStatus', () => {
		it('should update story and all scenario statuses for STORY mode', async () => {
			const report: StoryReport = {
				reportName: 'test', reportTime: 123, reportOptions: {},
				mode: ExecutionMode.STORY, status: true, storiesTested: undefined, smallReport: '',
				scenariosTested: new PassedCount(),
				featureTestResults: { passedSteps: 0, failedSteps: 0, skippedSteps: 0 },
				scenarioStatuses: [
					{ scenarioId: 1, status: true, stepResults: { passedSteps: 1, failedSteps: 0, skippedSteps: 0 } },
					{ scenarioId: 2, status: false, stepResults: { passedSteps: 0, failedSteps: 1, skippedSteps: 0 } },
				],
				featureId: VALID_ID,
			};

			await reportService.updateLatestTestStatus(report, ExecutionMode.STORY);

			expect(mockStoryService.updateStoryStatus).toHaveBeenCalledWith(VALID_ID, true);
			expect(mockStoryService.updateScenarioStatus).toHaveBeenCalledTimes(2);
			expect(mockStoryService.updateScenarioStatus).toHaveBeenCalledWith(VALID_ID, 1, true);
			expect(mockStoryService.updateScenarioStatus).toHaveBeenCalledWith(VALID_ID, 2, false);
		});

		it('should update all stories and scenarios for GROUP mode', async () => {
			const report: GroupReport = {
				reportName: 'group', reportTime: 123, reportOptions: {},
				mode: ExecutionMode.GROUP, status: false, storiesTested: undefined, smallReport: '',
				scenariosTested: new PassedCount(),
				groupTestResults: { passedSteps: 0, failedSteps: 0, skippedSteps: 0 },
				storyStatuses: [
					{
						storyId: 'story1', status: true, scenariosTested: new PassedCount(),
						featureTestResults: { passedSteps: 0, failedSteps: 0, skippedSteps: 0 },
						scenarioStatuses: [{ scenarioId: 1, status: true, stepResults: { passedSteps: 1, failedSteps: 0, skippedSteps: 0 } }],
					},
					{
						storyId: 'story2', status: false, scenariosTested: new PassedCount(),
						featureTestResults: { passedSteps: 0, failedSteps: 0, skippedSteps: 0 },
						scenarioStatuses: [
							{ scenarioId: 10, status: true, stepResults: { passedSteps: 1, failedSteps: 0, skippedSteps: 0 } },
							{ scenarioId: 11, status: false, stepResults: { passedSteps: 0, failedSteps: 1, skippedSteps: 0 } },
						],
					},
				],
			};

			await reportService.updateLatestTestStatus(report, ExecutionMode.GROUP);

			expect(mockStoryService.updateStoryStatus).toHaveBeenCalledTimes(2);
			expect(mockStoryService.updateScenarioStatus).toHaveBeenCalledTimes(3);
		});

		it('should mark story passed when all scenarios pass in SCENARIO mode', async () => {
			const story = mockStory({
				scenarios: [
					{ scenario_id: 1, lastTestPassed: false },
					{ scenario_id: 2, lastTestPassed: true },
				],
			});
			mockStoryService.getOneStory.mockResolvedValue(story);

			await reportService.updateLatestTestStatus(
				{ storyId: VALID_ID, scenarioId: 1, status: true },
				ExecutionMode.SCENARIO
			);

			// Scenario 1 just passed + scenario 2 was already passing → story passes
			expect(mockStoryService.updateStoryStatus).toHaveBeenCalledWith(VALID_ID, true);
			expect(mockStoryService.updateScenarioStatus).toHaveBeenCalledWith(VALID_ID, 1, true);
		});

		it('should mark story failed immediately when scenario fails in SCENARIO mode', async () => {
			await reportService.updateLatestTestStatus(
				{ storyId: VALID_ID, scenarioId: 1, status: false },
				ExecutionMode.SCENARIO
			);

			expect(mockStoryService.updateStoryStatus).toHaveBeenCalledWith(VALID_ID, false);
			// No need to fetch the full story when scenario failed
			expect(mockStoryService.getOneStory).not.toHaveBeenCalled();
		});

		it('should keep story failed if not all scenarios pass in SCENARIO mode', async () => {
			const story = mockStory({
				scenarios: [
					{ scenario_id: 1, lastTestPassed: false },
					{ scenario_id: 2, lastTestPassed: false },
				],
			});
			mockStoryService.getOneStory.mockResolvedValue(story);

			await reportService.updateLatestTestStatus(
				{ storyId: VALID_ID, scenarioId: 1, status: true },
				ExecutionMode.SCENARIO
			);

			// Scenario 1 passed but scenario 2 still failing → story still fails
			expect(mockStoryService.updateStoryStatus).toHaveBeenCalledWith(VALID_ID, false);
		});
	});

	// --- Analysis ---

	describe('analyzeGroupReport', () => {
		it('should aggregate passing results correctly', async () => {
			const story = mockStory();
			mockFsPromises.readFile.mockResolvedValue(JSON.stringify(cucumberJson(VALID_ID)));

			const result = await reportService.analyzeGroupReport('group', [story as any], '/test.json');

			expect(result.status).toBe(true);
			expect(result.scenariosTested.passed).toBe(1);
			expect(result.scenariosTested.failed).toBe(0);
			expect(result.groupTestResults.passedSteps).toBe(3);
			expect(result.groupTestResults.failedSteps).toBe(0);
			expect(result.storyStatuses).toHaveLength(1);
		});

		it('should aggregate failing results correctly', async () => {
			const story = mockStory();
			mockFsPromises.readFile.mockResolvedValue(JSON.stringify(cucumberJson(VALID_ID, 'failed')));

			const result = await reportService.analyzeGroupReport('group', [story as any], '/test.json');

			expect(result.status).toBe(false);
			expect(result.scenariosTested.failed).toBe(1);
			expect(result.groupTestResults.failedSteps).toBe(3);
		});

		it('should handle multiple stories with mixed results', async () => {
			const id2 = '507f1f77bcf86cd799439012';
			const stories = [
				mockStory(),
				mockStory({ _id: new ObjectId(id2), title: 'Story 2', scenarios: [{ scenario_id: 1, name: 'S2-Scenario' }] }),
			];
			const report = [
				...cucumberJson(VALID_ID, 'passed'),
				...cucumberJson(id2, 'failed'),
			];
			mockFsPromises.readFile.mockResolvedValue(JSON.stringify(report));

			const result = await reportService.analyzeGroupReport('group', stories as any, '/test.json');

			expect(result.status).toBe(false);
			expect(result.scenariosTested.passed).toBe(1);
			expect(result.scenariosTested.failed).toBe(1);
			expect(result.storyStatuses).toHaveLength(2);
		});

		it('should return error state when JSON read fails', async () => {
			mockFsPromises.readFile.mockRejectedValue(new Error('ENOENT'));

			const result = await reportService.analyzeGroupReport('group', [mockStory() as any], '/missing.json');

			expect(result.status).toBe(false);
			expect(result.reportName).toBe('group');
		});

		it('should skip unmatched stories', async () => {
			const report = [{ name: 'Unknown', uri: 'unknown.feature', elements: [{ type: 'scenario', name: 'X', steps: [{ result: { status: 'passed' } }] }] }];
			mockFsPromises.readFile.mockResolvedValue(JSON.stringify(report));

			const result = await reportService.analyzeGroupReport('group', [mockStory() as any], '/test.json');

			expect(result.storyStatuses).toHaveLength(0);
		});

		it('should handle skipped and undefined step statuses', async () => {
			const story = mockStory();
			const report = [{
				name: 'Test Story', uri: `TestStory_${VALID_ID}.feature`,
				elements: [{
					type: 'scenario', name: 'Scenario 1', tags: [{ name: `@${VALID_ID}_1` }],
					steps: [
						{ keyword: 'Given ', name: 's1', result: { status: 'passed' } },
						{ keyword: 'When ', name: 's2', result: { status: 'skipped' } },
						{ keyword: 'Then ', name: 's3', result: { status: 'undefined' } },
					],
				}],
			}];
			mockFsPromises.readFile.mockResolvedValue(JSON.stringify(report));

			const result = await reportService.analyzeGroupReport('group', [story as any], '/test.json');

			expect(result.groupTestResults.passedSteps).toBe(1);
			expect(result.groupTestResults.skippedSteps).toBe(1);
			// 'undefined' is treated as failed
			expect(result.groupTestResults.failedSteps).toBe(1);
		});
	});

	// --- HTML Generation ---

	describe('generateHtmlReport', () => {
		it('should call reporter.generate for non-group report', () => {
			vi.mocked(fs.readFileSync).mockReturnValue('[]');

			const result = reportService.generateHtmlReport('test', '/features/test.json', false);

			expect(mockReporter.generate).toHaveBeenCalled();
			expect(result).not.toBeNull();
		});

		it('should return null when no valid JSON files for group', () => {
			vi.mocked(fs.readdirSync).mockReturnValue([]);

			const result = reportService.generateHtmlReport('group', '/features/group/group.html.json', true);

			expect(result).toBeNull();
		});

		it('should validate and generate for group with files', () => {
			vi.mocked(fs.readdirSync).mockReturnValue(['r1.json', 'r2.json'] as any);
			vi.mocked(fs.readFileSync).mockReturnValue('[]');

			const result = reportService.generateHtmlReport('group', '/features/group/group.html.json', true);

			expect(mockReporter.generate).toHaveBeenCalled();
			expect(result).not.toBeNull();
		});

		it('should return null when reporter throws', () => {
			vi.mocked(fs.readFileSync).mockReturnValue('[]');
			mockReporter.generate.mockImplementationOnce(() => { throw new Error('crash'); });

			const result = reportService.generateHtmlReport('test', '/features/test.json');

			expect(result).toBeNull();
		});

		it('should repair corrupt JSON files in group directory', () => {
			vi.mocked(fs.readdirSync).mockReturnValue(['good.json', 'bad.json'] as any);
			vi.mocked(fs.readFileSync)
				.mockReturnValueOnce('[]')
				.mockImplementationOnce(() => { throw new SyntaxError('parse error'); });

			reportService.generateHtmlReport('group', '/features/group/group.html.json', true);

			// Bad file gets repaired with placeholder JSON
			expect(fs.writeFileSync).toHaveBeenCalled();
			expect(mockReporter.generate).toHaveBeenCalled();
		});
	});

	// --- Scheduled Deletion ---

	describe('scheduleReportDeletion', () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('should schedule group directory deletion', () => {
			reportService.scheduleReportDeletion('my_group', true, 5000);

			expect(fs.rm).not.toHaveBeenCalled();
			vi.advanceTimersByTime(5000);
			expect(fs.rm).toHaveBeenCalledWith(
				expect.stringContaining('my_group'),
				{ recursive: true, force: true },
				expect.any(Function)
			);
		});

		it('should schedule individual file deletion for non-group', () => {
			reportService.scheduleReportDeletion('test_report', false, 3000);

			expect(fs.unlink).not.toHaveBeenCalled();
			vi.advanceTimersByTime(3000);
			expect(fs.unlink).toHaveBeenCalledTimes(2);
		});
	});

	// --- resolveAndSaveReport ---

	describe('resolveAndSaveReport', () => {
		beforeEach(() => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.promises.readFile).mockResolvedValue('[]');
			vi.mocked(fs.readFileSync).mockReturnValue('[]');
			vi.mocked(fs.readdirSync).mockReturnValue(['report.json'] as any);
		});

		it('should process GROUP mode and use executionParams.name as directory', async () => {
			const story = mockStory();
			mockFsPromises.readFile.mockResolvedValue(JSON.stringify(cucumberJson(VALID_ID)));

			const result = await reportService.resolveAndSaveReport(
				{ reportName: 'reporting_123', reportTime: 100 },
				ExecutionMode.GROUP,
				[story as any],
				{ name: 'sanity_group_123' }
			);

			expect(result).toBeDefined();
			expect(mockReportDataCol.insertOne).toHaveBeenCalled();
		});

		it('should process STORY mode', async () => {
			const story = mockStory();
			mockFsPromises.readFile.mockResolvedValue(JSON.stringify(cucumberJson(VALID_ID)));

			const result = await reportService.resolveAndSaveReport(
				{ reportName: 'reporting_story', reportTime: 100 },
				ExecutionMode.STORY,
				[story as any],
				{}
			);

			expect(result).toBeDefined();
		});

		it('should process SCENARIO mode', async () => {
			const story = mockStory();
			mockFsPromises.readFile.mockResolvedValue(JSON.stringify(cucumberJson(VALID_ID)));

			const result = await reportService.resolveAndSaveReport(
				{ reportName: 'reporting_scen', reportTime: 100, scenarioId: '1' },
				ExecutionMode.SCENARIO,
				[story as any],
				{}
			);

			expect(result).toBeDefined();
		});
	});
});
