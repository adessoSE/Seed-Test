// src/services/report.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ExecutionMode, GroupReport, PassedCount } from '../models/models';

// --- 1. Import types only ---
import type * as ReportService from './report.service';
import type { StoryReport } from '../models/models';

// --- 2. Mock all dependencies ---
const mockDb = { collection: vi.fn() };
vi.mock('../database/DbConnector', () => ({
  getConnection: vi.fn(() => mockDb),
}));

// Mock services
const mockedStoryService = {
  updateStoryStatus: vi.fn().mockResolvedValue({}),
  updateScenarioStatus: vi.fn().mockResolvedValue({}),
};
vi.mock('./story.service', () => mockedStoryService);

// Mock external libraries
vi.mock('cucumber-html-reporter', () => ({
  default: { generate: vi.fn() },
}));

// Mock 'fs/promises'
const mockedFsPromises = {
  readFile: vi.fn(),
  unlink: vi.fn(),
};
vi.mock('fs/promises', () => ({
  default: mockedFsPromises,
}));

// --- 3. Define mock collections ---
const mockReportDataCollection = {
  find: vi.fn(),
  findOne: vi.fn(),
  deleteOne: vi.fn(),
};
const mockReportsCollection = {
  deleteOne: vi.fn(),
};
const mockGridFSBucket = {
  delete: vi.fn(),
};
vi.mock('mongodb', async (importOriginal) => {
  const originalMongodb = await importOriginal<typeof import('mongodb')>();
  return {
    ...originalMongodb,
    GridFSBucket: vi.fn(() => mockGridFSBucket),
  };
});

// --- 4. The Test Suite ---
describe('ReportService', () => {

  let reportService: typeof ReportService;

  beforeEach(async () => {
    // Dynamically import to handle circular dependency
    reportService = await vi.importActual<typeof ReportService>('./report.service');
    
    // --- FIX 1 (Error 1) ---
    // Use clearAllMocks, not restoreAllMocks
    vi.clearAllMocks(); 
    // *Manually* clear the call counts on the persistent mocks
    mockedStoryService.updateStoryStatus.mockClear();
    mockedStoryService.updateScenarioStatus.mockClear();
    // -----------------------

    // Re-apply mocks that need to exist for every test
    mockDb.collection.mockImplementation((name: string) => {
      if (name === 'ReportData') return mockReportDataCollection;
      if (name === 'Reports') return mockReportsCollection;
      throw new Error(`Unexpected collection access: ${name}`);
    });

    // Re-apply the chainable mock for 'find'
    (mockReportDataCollection.find as any).mockImplementation((query: any) => ({
      projection: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockImplementation(() => {
        // Return specific mock data based on the query
        if (query.storyId) {
          // This is for the 'getReportHistory' test
          const now = Date.now();
          const mockReports = [
            { _id: '111111111111111111111111', reportTime: now - 100, isSaved: true, mode: 'scenario' }, 
            { _id: '222222222222222222222222', reportTime: now - 50, isSaved: false, mode: 'scenario' }, 
            { _id: '333333333333333333333333', reportTime: now - 200, isSaved: true, mode: 'scenario' }, 
            { _id: '444444444444444444444444', reportTime: now - 86400000, isSaved: false, mode: 'scenario' }, 
          ];
          return Promise.resolve(mockReports);
        }
        // Default for getGroupTestReports
        return Promise.resolve([]);
      }),
    }));

    // Re-apply other mocks
    mockedFsPromises.readFile.mockClear();
    mockReportDataCollection.findOne.mockReset();
    mockReportDataCollection.deleteOne.mockReset();
    mockGridFSBucket.delete.mockReset();
  });

  // --- Test 1: updateLatestTestStatus ---
  describe('updateLatestTestStatus', () => {
    it('should correctly update status for ExecutionMode.STORY', async () => {
      // A. Arrange
      const storyId = 'story123';
      
      // Assuming you fixed the bug in report.service.ts
      // and it now correctly reads 'featureId'
      const mockReport: StoryReport = {
          reportName: 'test',
          reportTime: 123,
          reportOptions: {},
          mode: ExecutionMode.STORY,
          status: true,
          scenariosTested: new PassedCount(),
          featureTestResults: {} as any,
          scenarioStatuses: [
              { scenarioId: 1, status: true, stepResults: {} as any },
              { scenarioId: 2, status: true, stepResults: {} as any },
          ],
          featureId: storyId, // The correct property
          storiesTested: undefined,
          smallReport: ''
      };

      // B. Act
      await reportService.updateLatestTestStatus(mockReport, ExecutionMode.STORY);

      // C. Assert
      expect(mockedStoryService.updateStoryStatus).toHaveBeenCalledWith(storyId, true);
      // Call count is now 2 (resets correctly)
      expect(mockedStoryService.updateScenarioStatus).toHaveBeenCalledTimes(2);
      expect(mockedStoryService.updateScenarioStatus).toHaveBeenCalledWith(storyId, 1, true);
      expect(mockedStoryService.updateScenarioStatus).toHaveBeenCalledWith(storyId, 2, true);
    });

    it('should correctly update status for ExecutionMode.GROUP', async () => {
      // A. Arrange
      const storyId1 = 'story111';
      const storyId2 = 'story222';
      const mockReport: GroupReport = {
          reportName: 'group-test',
          reportTime: 123,
          reportOptions: {},
          mode: ExecutionMode.GROUP,
          status: false,
          scenariosTested: new PassedCount(),
          groupTestResults: {} as any,
          storyStatuses: [
              {
                  storyId: storyId1, status: true, scenarioStatuses: [
                      { scenarioId: 10, status: true, stepResults: {} as any }
                  ], featureTestResults: {} as any, scenariosTested: new PassedCount()
              },
              {
                  storyId: storyId2, status: false, scenarioStatuses: [
                      { scenarioId: 20, status: true, stepResults: {} as any },
                      { scenarioId: 21, status: false, stepResults: {} as any }
                  ], featureTestResults: {} as any, scenariosTested: new PassedCount()
              },
          ],
          storiesTested: undefined,
          smallReport: ''
      };
      
      // B. Act
      await reportService.updateLatestTestStatus(mockReport, ExecutionMode.GROUP);

      // C. Assert
      // Call count is now 2 (resets correctly)
      expect(mockedStoryService.updateStoryStatus).toHaveBeenCalledTimes(2);
      expect(mockedStoryService.updateScenarioStatus).toHaveBeenCalledTimes(3);
    });
  });

  // --- Test 2: getReportHistory (Pruning Logic) ---
  describe('getReportHistory (deleteOldReports logic)', () => {
    it('should prune old, unsaved reports and keep saved or new reports', async () => {
      // A. Arrange
      const storyId = new ObjectId().toHexString();
      const reportIdToDelete = '444444444444444444444444';

      // *** FIX 2 (Error 2) ***
      // Mock the 'findOne' call that deleteReport makes
      mockReportDataCollection.findOne.mockImplementation((query: any) => {
        if (query._id.toString() === reportIdToDelete) {
          return Promise.resolve({ 
            _id: new ObjectId(reportIdToDelete), 
            smallReport: new ObjectId() // Provide metadata for deleteReport to proceed
          });
        }
        return Promise.resolve(null);
      });
      // Mock the 'deleteOne' calls
      mockReportDataCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockReportsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      // --------------------
      
      // B. Act
      process.env.MAX_SAVED_REPORTS = '1';
      const result = await reportService.getReportHistory(storyId);
      
      // C. Assert
      expect(mockReportDataCollection.findOne).toHaveBeenCalledWith({ 
          _id: new ObjectId(reportIdToDelete) 
      });
      expect(mockReportDataCollection.deleteOne).toHaveBeenCalledTimes(1);
      expect(mockReportDataCollection.deleteOne).toHaveBeenCalledWith({ 
          _id: new ObjectId(reportIdToDelete) 
      });
      expect(mockReportsCollection.deleteOne).toHaveBeenCalledTimes(1);
      
      expect(result.groupReports).toHaveLength(0);
      expect(result.scenarioReports).toHaveLength(3); 
      expect(result.scenarioReports.map((r: any) => r._id)).toEqual(expect.arrayContaining([
        '111111111111111111111111', 
        '222222222222222222222222', 
        '333333333333333333333333'
      ]));
    });
  });

  // --- Test 3: analyzeGroupReport (Analysis Logic) ---
  describe('analyzeGroupReport', () => {
    it('should correctly aggregate results from a Cucumber JSON', async () => {
      // A. Arrange
      const mockCucumberJson = [
        { 
          uri: 'story_abc1234567890123456789012.feature',
          name: 'Story 1',
          elements: [
            { type: 'scenario', name: 'Scenario 1.1', tags: [{name: '@abc1234567890123456789012_1'}], steps: [
              { result: { status: 'passed' } }, { result: { status: 'passed' } }
            ]}
          ]
        },
        {
          uri: 'story_def4567890123456789012345.feature',
          name: 'Story 2',
          elements: [
            { type: 'scenario', name: 'Scenario 2.1', tags: [{name: '@def4567890123456789012345_10'}], steps: [
              { result: { status: 'passed' } }
            ]},
            { type: 'scenario', name: 'Scenario 2.2', tags: [{name: '@def4567890123456789012345_11'}], steps: [
              { result: { status: 'passed' } }, { result: { status: 'failed' } }, { result: { status: 'skipped' } }
            ]}
          ]
        }
      ];
      const mockStories = [
        { _id: 'abc1234567890123456789012', title: 'Story 1', scenarios: [{scenario_id: 1, name: 'Scenario 1.1'}] },
        { _id: 'def4567890123456789012345', title: 'Story 2', scenarios: [{scenario_id: 10, name: 'Scenario 2.1'}, {scenario_id: 11, name: 'Scenario 2.2'}] }
      ] as any;
      
      mockedFsPromises.readFile.mockResolvedValue(JSON.stringify(mockCucumberJson));

      // B. Act
      const result = await reportService.analyzeGroupReport('group-test', mockStories, 'fake/path.json');

      // C. Assert
      expect(result.status).toBe(false); 
      expect(result.scenariosTested.passed).toBe(2);
      expect(result.scenariosTested.failed).toBe(1);
    });
  });

});