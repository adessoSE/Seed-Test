// src/services/story.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// --- 1. Import types only ---
import type * as StoryService from './story.service';
import type { Story } from '@shared/models/Story';
import type { Repository } from '@shared/models/Repository';

// --- 2. Mock all dependencies ---
// These are hoisted by Vitest and run before all imports.

const mockDb = {
	collection: vi.fn()
};
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));

// Mock services that are called by story.service
const mockedRepoService = {
	// We don't need to mock functions *called by* repoService,
	// just the functions *called by* storyService.
};
vi.mock('./repository.service', () => mockedRepoService);

const mockedReportService = {
	deleteReport: vi.fn().mockResolvedValue({ deletedCount: 1 })
};
vi.mock('./report.service', () => mockedReportService);

// --- 3. Define mock collections ---
const mockStoriesCollection = {
	findOne: vi.fn(),
	find: vi.fn(),
	insertOne: vi.fn(),
	updateOne: vi.fn(),
	findOneAndDelete: vi.fn(),
	findOneAndReplace: vi.fn()
};
const mockRepoCollection = {
	findOne: vi.fn(),
	updateOne: vi.fn(),
	updateMany: vi.fn()
};
const mockReportDataCollection = {
	find: vi.fn()
};

// --- 4. The Test Suite ---
describe('StoryService', () => {
  
	// Variable to hold the dynamically imported service
	let storyService: typeof StoryService;

	beforeEach(async () => {
		// Dynamically import the service *inside* beforeEach to break circular dependencies
		storyService = await vi.importActual<typeof StoryService>('./story.service');

		vi.clearAllMocks();

		// Reset the implementation of mockDb.collection
		mockDb.collection.mockImplementation((name: string) => {
			if (name === 'Stories') return mockStoriesCollection;
			if (name === 'Repositories') return mockRepoCollection;
			if (name === 'ReportData') return mockReportDataCollection;
			throw new Error(`Unexpected collection access: ${name}`);
		});

		// Reset all mock function implementations
		Object.values(mockStoriesCollection).forEach(fn => fn.mockReset());
		Object.values(mockRepoCollection).forEach(fn => fn.mockReset());
		Object.values(mockReportDataCollection).forEach(fn => fn.mockReset());
		mockedReportService.deleteReport.mockClear();
	});

	// --- Tests for createStory (Issue Number Logic) ---

	describe('createStory', () => {
		it('should assign issue_number 1 if repo has no stories', async () => {
			// A. Arrange
			const repoId = new ObjectId().toHexString();
			const mockRepo: Partial<Repository> = { _id: new ObjectId(repoId), stories: [] };
			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockStoriesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			// B. Act
			await storyService.createStory('Test Story', 'Desc', repoId);

			// C. Assert
			// Check that insertOne was called with issue_number: 1
			expect(mockStoriesCollection.insertOne).toHaveBeenCalledWith(
				expect.objectContaining({ issue_number: 1 }),
				expect.anything()
			);
		});

		it('should find the next available issue_number', async () => {
			// A. Arrange
			const repoId = new ObjectId().toHexString();
			const mockRepo: Partial<Repository> = {
				_id: new ObjectId(repoId),
				stories: [new ObjectId(), new ObjectId(), new ObjectId()] // Has 3 stories
			};
			// Mock the stories that exist, note the gap at '2'
			const mockStories = [
				{ issue_number: 1 },
				{ issue_number: 3 },
				{ issue_number: 4 }
			];

			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			// Mock the .find().toArray() chain
			mockStoriesCollection.find.mockReturnValue({
				projection: vi.fn().mockReturnThis(), // .projection()
				toArray: vi.fn().mockResolvedValue(mockStories) // .toArray()
			} as any);
			mockStoriesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			// B. Act
			await storyService.createStory('Test Story', 'Desc', repoId);

			// C. Assert
			// It should have found the gap and inserted with issue_number: 2
			expect(mockStoriesCollection.insertOne).toHaveBeenCalledWith(
				expect.objectContaining({ issue_number: 2 }),
				expect.anything()
			);
		});
	});

	// --- Tests for createScenario (Scenario ID Logic) ---

	describe('createScenario', () => {
		it('should assign scenario_id 1 if story has no scenarios', async () => {
			// A. Arrange
			const storyId = new ObjectId().toHexString();
			const mockStory: Partial<Story> = { _id: new ObjectId(storyId), scenarios: [] };
			mockStoriesCollection.findOne.mockResolvedValue(mockStory);
			mockStoriesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			// B. Act
			await storyService.createScenario(storyId, 'New Scenario');

			// C. Assert
			// Check the $push operation
			expect(mockStoriesCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(storyId) },
				expect.objectContaining({
					$push: { scenarios: expect.objectContaining({ scenario_id: 1, name: 'New Scenario' }) }
				})
			);
		});

		it('should find the next available scenario_id', async () => {
			// A. Arrange
			const storyId = new ObjectId().toHexString();
			const mockStory: Partial<Story> = {
				_id: new ObjectId(storyId),
				scenarios: [
					{ scenario_id: 1 } as any,
					{ scenario_id: 5 } as any, // Max ID is 5
					{ scenario_id: 3 } as any
				]
			};
			mockStoriesCollection.findOne.mockResolvedValue(mockStory);
			mockStoriesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			// B. Act
			await storyService.createScenario(storyId, 'Next Scenario');

			// C. Assert
			// It should have found max(1, 5, 3) + 1 = 6
			expect(mockStoriesCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(storyId) },
				expect.objectContaining({
					$push: { scenarios: expect.objectContaining({ scenario_id: 6, name: 'Next Scenario' }) }
				})
			);
		});
	});

	// --- Tests for updateOneDriver ---

	describe('updateOneDriver', () => {
		const storyId = new ObjectId().toHexString();

		it('should toggle oneDriver from false to true', async () => {
			const updatedStory = { _id: new ObjectId(storyId), title: 'My Story', oneDriver: true };
			mockStoriesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
			mockStoriesCollection.findOne.mockResolvedValue(updatedStory);

			const result = await storyService.updateOneDriver(storyId, false);

			expect(mockStoriesCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(storyId) },
				{ $set: { oneDriver: true } }
			);
			expect(mockStoriesCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(storyId) });
			expect(result).toEqual(updatedStory);
			expect(result._id).toBeDefined();
		});

		it('should toggle oneDriver from true to false', async () => {
			const updatedStory = { _id: new ObjectId(storyId), title: 'My Story', oneDriver: false };
			mockStoriesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
			mockStoriesCollection.findOne.mockResolvedValue(updatedStory);

			const result = await storyService.updateOneDriver(storyId, true);

			expect(mockStoriesCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(storyId) },
				{ $set: { oneDriver: false } }
			);
			expect(result.oneDriver).toBe(false);
		});

		it('should return null if story not found after update', async () => {
			mockStoriesCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });
			mockStoriesCollection.findOne.mockResolvedValue(null);

			const result = await storyService.updateOneDriver(storyId, false);

			expect(result).toBeNull();
		});
	});

	// --- Tests for getOneStory ---

	describe('getOneStory', () => {
		it('should return a story by ID', async () => {
			const storyId = new ObjectId().toHexString();
			const mockStory = { _id: new ObjectId(storyId), title: 'Found Story' };
			mockStoriesCollection.findOne.mockResolvedValue(mockStory);

			const result = await storyService.getOneStory(storyId);

			expect(mockStoriesCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(storyId) });
			expect(result.title).toBe('Found Story');
		});

		it('should return null if story does not exist', async () => {
			mockStoriesCollection.findOne.mockResolvedValue(null);

			const result = await storyService.getOneStory(new ObjectId().toHexString());

			expect(result).toBeNull();
		});
	});

	// --- Tests for updateScenarioStatus ---

	describe('updateScenarioStatus', () => {
		it('should update the lastTestPassed field for a scenario', async () => {
			const storyId = new ObjectId().toHexString();
			mockStoriesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			await storyService.updateScenarioStatus(storyId, 3, true);

			expect(mockStoriesCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(storyId), 'scenarios.scenario_id': 3 },
				{ $set: { 'scenarios.$.lastTestPassed': true } }
			);
		});
	});

	// --- Tests for deleteStory (CRITICAL PATH) ---

	describe('deleteStory', () => {
		it('should delete story, remove refs, and delete all associated reports', async () => {
			// A. Arrange
			const repoId = new ObjectId().toHexString();
			const storyId = new ObjectId().toHexString();
      
			// 1. Mock finding the reports
			const mockReports = [
				{ _id: new ObjectId('111111111111111111111111') },
				{ _id: new ObjectId('222222222222222222222222') }
			];
			mockReportDataCollection.find.mockReturnValue({
				toArray: vi.fn().mockResolvedValue(mockReports)
			} as any);

			// 2. Mock the DB operations
			mockRepoCollection.updateMany.mockResolvedValue({ modifiedCount: 1 }); // Remove from groups
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 }); // Remove from stories array
			mockStoriesCollection.findOneAndDelete.mockResolvedValue({ value: { _id: storyId } }); // Delete story

			// B. Act
			await storyService.deleteStory(repoId, storyId);

			// C. Assert
			// 1. Check repo groups were updated
			expect(mockRepoCollection.updateMany).toHaveBeenCalledWith(
				{ _id: new ObjectId(repoId) },
				{ $pull: { 'groups.$[].member_stories': new ObjectId(storyId) } }
			);
      
			// 2. Check repo stories array was updated
			expect(mockRepoCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(repoId) },
				{ $pull: { stories: new ObjectId(storyId) } }
			);

			// 3. Check reports were found
			expect(mockReportDataCollection.find).toHaveBeenCalledWith({ storyId: new ObjectId(storyId) });

			// 4. Check reportService was called for *each* report
			expect(mockedReportService.deleteReport).toHaveBeenCalledTimes(2);
			expect(mockedReportService.deleteReport).toHaveBeenCalledWith('111111111111111111111111');
			expect(mockedReportService.deleteReport).toHaveBeenCalledWith('222222222222222222222222');

			// 5. Check story was deleted
			expect(mockStoriesCollection.findOneAndDelete).toHaveBeenCalledWith({ _id: new ObjectId(storyId) });
		});
	});

});