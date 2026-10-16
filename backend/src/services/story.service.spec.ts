// src/services/story.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// --- 1. Import types only ---
import type * as StoryService from './story.service.js';
import type { Story } from '@seed-test/shared/models/Story.js';
import type { Repository } from '@seed-test/shared/models/Repository.js';

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
	findOneAndUpdate: vi.fn(),
	bulkWrite: vi.fn()
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

	// --- Tests for updateStory (partial $set so a stale PUT cannot overwrite server-owned fields) ---

	describe('updateStory', () => {
		it('should $set only the submitted fields and use the _id as the filter only', async () => {
			// A. Arrange — a stale tab sends a story without lastTestPassed, oneDriver, issue_number
			const storyId = new ObjectId().toHexString();
			mockStoriesCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(storyId), title: 'Edited' });

			// B. Act
			const result = await storyService.updateStory({ _id: storyId, title: 'Edited', scenarios: [] } as unknown as Story);

			// C. Assert — the exact $set means fields absent from the input are left untouched in the database
			expect(mockStoriesCollection.findOneAndUpdate).toHaveBeenCalledWith(
				{ _id: new ObjectId(storyId) },
				{ $set: { title: 'Edited', scenarios: [] } },
				{ returnDocument: 'after', session: undefined }
			);
			expect(result).toEqual({ _id: new ObjectId(storyId), title: 'Edited' });
		});
	});

	// --- Tests for updateScenarioList (reorder only, never writes client contents) ---

	describe('updateScenarioList', () => {
		it('should reorder with an aggregation pipeline and never write the client scenario contents', async () => {
			// A. Arrange — the client sends a new order together with edited contents that must not be persisted
			const storyId = new ObjectId().toHexString();
			const clientList = [
				{ scenario_id: 2, name: 'CLIENT EDIT' } as any,
				{ scenario_id: 1, name: 'Stale name' } as any
			];
			mockStoriesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			// B. Act
			await storyService.updateScenarioList(storyId, clientList);

			// C. Assert — the write is a pipeline; only the id order reaches it, as a $literal so ids are not read as paths
			const [filter, update] = mockStoriesCollection.updateOne.mock.calls[0];
			expect(filter).toEqual({ _id: new ObjectId(storyId) });
			expect(Array.isArray(update)).toBe(true);
			expect(JSON.stringify(update)).not.toContain('CLIENT EDIT');
			expect(JSON.stringify(update)).toContain(JSON.stringify({ $literal: [2, 1] }));
		});
	});

	// --- Tests for createScenario (Scenario ID Logic) ---

	describe('createScenario', () => {
		it('should compute scenario_id inside one atomic findOneAndUpdate pipeline and return the appended scenario', async () => {
			// A. Arrange — the pre-image of the story: the update appends max(5)+1 = 6
			const storyId = new ObjectId().toHexString();
			mockStoriesCollection.findOneAndUpdate.mockResolvedValue({
				_id: new ObjectId(storyId),
				scenarios: [{ scenario_id: 1 }, { scenario_id: 5 }]
			});

			// B. Act
			const created = await storyService.createScenario(storyId, 'Next Scenario');

			// C. Assert — the id is max+1 evaluated by the database, so two concurrent creates cannot read the same max
			const [filter, pipeline, options] = mockStoriesCollection.findOneAndUpdate.mock.calls[0];
			expect(filter).toEqual({ _id: new ObjectId(storyId) });
			expect(Array.isArray(pipeline)).toBe(true);
			expect(JSON.stringify(pipeline)).toContain(JSON.stringify({ $add: [{ $ifNull: [{ $max: '$scenarios.scenario_id' }, 0] }, 1] }));
			// The pre-image is read, not the post-image: a concurrent create may append after ours, so the last element could be theirs
			expect(options).toEqual({ returnDocument: 'before' });
			expect(created).toMatchObject({ scenario_id: 6, name: 'Next Scenario' });
		});

		it('should wrap the user-supplied name in $literal so a name starting with $ is not read as a field path', async () => {
			const storyId = new ObjectId().toHexString();
			mockStoriesCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(storyId), scenarios: [{ scenario_id: 1, name: '$injected' }] });

			await storyService.createScenario(storyId, '$injected');

			const [, pipeline] = mockStoriesCollection.findOneAndUpdate.mock.calls[0];
			expect(JSON.stringify(pipeline)).toContain('{"$literal":{"scenario_id":1,"name":"$injected"');
		});

		it('should give the first scenario of an empty story the id 1', async () => {
			mockStoriesCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(), scenarios: [] });

			const created = await storyService.createScenario(new ObjectId().toHexString(), 'First');

			expect(created.scenario_id).toBe(1);
		});

		it('should reject with 404 when the story does not exist', async () => {
			mockStoriesCollection.findOneAndUpdate.mockResolvedValue(null);

			await expect(storyService.createScenario(new ObjectId().toHexString(), 'X')).rejects.toMatchObject({ statusCode: 404 });
		});
	});

	// --- Tests for updateOneDriver ---

	describe('updateOneDriver', () => {
		const storyId = new ObjectId().toHexString();

		it('should toggle oneDriver from false to true in one write and return the updated story', async () => {
			const updatedStory = { _id: new ObjectId(storyId), title: 'My Story', oneDriver: true };
			mockStoriesCollection.findOneAndUpdate.mockResolvedValue(updatedStory);

			const result = await storyService.updateOneDriver(storyId, false);

			expect(mockStoriesCollection.findOneAndUpdate).toHaveBeenCalledWith(
				{ _id: new ObjectId(storyId) },
				{ $set: { oneDriver: true } },
				{ returnDocument: 'after' }
			);
			expect(mockStoriesCollection.updateOne).not.toHaveBeenCalled();
			expect(mockStoriesCollection.findOne).not.toHaveBeenCalled();
			expect(result).toEqual(updatedStory);
		});

		it('should toggle oneDriver from true to false', async () => {
			const updatedStory = { _id: new ObjectId(storyId), title: 'My Story', oneDriver: false };
			mockStoriesCollection.findOneAndUpdate.mockResolvedValue(updatedStory);

			const result = await storyService.updateOneDriver(storyId, true);

			expect(mockStoriesCollection.findOneAndUpdate).toHaveBeenCalledWith(
				{ _id: new ObjectId(storyId) },
				{ $set: { oneDriver: false } },
				{ returnDocument: 'after' }
			);
			expect(result.oneDriver).toBe(false);
		});

		it('should reject with 404 when no story matches', async () => {
			mockStoriesCollection.findOneAndUpdate.mockResolvedValue(null);

			await expect(storyService.updateOneDriver(storyId, false)).rejects.toMatchObject({ statusCode: 404 });
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
			// Membership guard: the story is listed in the repository's stories array
			mockRepoCollection.findOne.mockResolvedValue({ _id: new ObjectId(repoId), stories: [new ObjectId(storyId)] });
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

		// Ordering invariant: the repository reference is removed last. While it still exists, a retry passes the
		// membership guard and finishes the cleanup; removing it first would orphan the story and its reports.
		it('should remove the repository reference last so a retry after a partial failure converges', async () => {
			const repoId = new ObjectId().toHexString();
			const storyId = new ObjectId().toHexString();
			mockReportDataCollection.find.mockReturnValue({
				toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId('111111111111111111111111') }])
			} as any);
			mockRepoCollection.findOne.mockResolvedValue({ _id: new ObjectId(repoId), stories: [new ObjectId(storyId)] });
			mockRepoCollection.updateMany.mockResolvedValue({ modifiedCount: 1 });
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
			mockStoriesCollection.findOneAndDelete.mockResolvedValue({ _id: new ObjectId(storyId) });

			await storyService.deleteStory(repoId, storyId);

			const reportsDeleted = mockedReportService.deleteReport.mock.invocationCallOrder[0];
			const storyDeleted = mockStoriesCollection.findOneAndDelete.mock.invocationCallOrder[0];
			const groupsPulled = mockRepoCollection.updateMany.mock.invocationCallOrder[0];
			const repoStoriesPulled = mockRepoCollection.updateOne.mock.invocationCallOrder[0];
			expect(reportsDeleted).toBeLessThan(storyDeleted);
			expect(storyDeleted).toBeLessThan(groupsPulled);
			expect(groupsPulled).toBeLessThan(repoStoriesPulled);
		});

		// Retry safety: a previous attempt may already have deleted the story document; the cleanup must still finish.
		it('should finish the cleanup when the story document is already gone', async () => {
			const repoId = new ObjectId().toHexString();
			const storyId = new ObjectId().toHexString();
			mockReportDataCollection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) } as any);
			mockRepoCollection.findOne.mockResolvedValue({ _id: new ObjectId(repoId), stories: [new ObjectId(storyId)] });
			mockRepoCollection.updateMany.mockResolvedValue({ modifiedCount: 1 });
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
			mockStoriesCollection.findOneAndDelete.mockResolvedValue(null);

			await expect(storyService.deleteStory(repoId, storyId)).resolves.toBeNull();

			expect(mockRepoCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(repoId) },
				{ $pull: { stories: new ObjectId(storyId) } }
			);
		});

		// Invariant: the route authorizes repo_id but not the story ID, so the service only touches stories that belong to that repo.
		it('should reject with 404 and delete nothing when the story belongs to another repository', async () => {
			const repoId = new ObjectId().toHexString();
			const storyId = new ObjectId().toHexString();
			// The repository's stories array does not contain the story (it lives in another repo)
			mockRepoCollection.findOne.mockResolvedValue({ _id: new ObjectId(repoId), stories: [new ObjectId()] });

			await expect(storyService.deleteStory(repoId, storyId)).rejects.toMatchObject({ statusCode: 404 });

			expect(mockRepoCollection.updateMany).not.toHaveBeenCalled();
			expect(mockRepoCollection.updateOne).not.toHaveBeenCalled();
			expect(mockReportDataCollection.find).not.toHaveBeenCalled();
			expect(mockedReportService.deleteReport).not.toHaveBeenCalled();
			expect(mockStoriesCollection.findOneAndDelete).not.toHaveBeenCalled();
		});
	});

	// --- Tests for assertStoriesInRepo (cross-repo reference guard for groups and story order) ---

	describe('assertStoriesInRepo', () => {
		it('should resolve when every story belongs to the repository', async () => {
			const repoId = new ObjectId().toHexString();
			const storyA = new ObjectId().toHexString();
			const storyB = new ObjectId().toHexString();
			mockRepoCollection.findOne.mockResolvedValue({ stories: [new ObjectId(storyA), new ObjectId(storyB)] });

			await expect(storyService.assertStoriesInRepo(repoId, [storyA, storyB])).resolves.toBeUndefined();
		});

		it('should reject with 400 and name the foreign story IDs', async () => {
			const repoId = new ObjectId().toHexString();
			const ownStory = new ObjectId().toHexString();
			const foreignStory = new ObjectId().toHexString();
			mockRepoCollection.findOne.mockResolvedValue({ stories: [new ObjectId(ownStory)] });

			const error = await storyService.assertStoriesInRepo(repoId, [ownStory, foreignStory]).catch((e: unknown) => e);

			expect(error).toMatchObject({ statusCode: 400 });
			expect((error as Error).message).toContain(foreignStory);
			expect((error as Error).message).not.toContain(ownStory);
		});
	});

	// --- Tests for renumberCustomStories (issue_number persistence on reorder) ---

	describe('renumberCustomStories', () => {
		// Helper: returns the updateOne operations passed to bulkWrite in call order
		function bulkWriteUpdates() {
			const arg = vi.mocked(mockStoriesCollection.bulkWrite).mock.calls[0][0] as any[];
			return arg;
		}

		it('should renumber custom (db) stories 1..N in the new order and skip linked stories', async () => {
			// A. Arrange — a repo ordered [db, linked(jira), db, linked(github), db]
			const custom1 = new ObjectId().toHexString();
			const linkedJira = new ObjectId().toHexString();
			const custom2 = new ObjectId().toHexString();
			const linkedGithub = new ObjectId().toHexString();
			const custom3 = new ObjectId().toHexString();
			const orderedStoryIds = [custom1, linkedJira, custom2, linkedGithub, custom3];

			const dbStories = [
				{ _id: new ObjectId(custom1), storySource: 'db' },
				{ _id: new ObjectId(linkedJira), storySource: 'jira' },
				{ _id: new ObjectId(custom2), storySource: 'db' },
				{ _id: new ObjectId(linkedGithub), storySource: 'github' },
				{ _id: new ObjectId(custom3), storySource: 'db' }
			];
			mockStoriesCollection.find.mockReturnValue({
				toArray: vi.fn().mockResolvedValue(dbStories)
			} as any);
			mockStoriesCollection.bulkWrite.mockResolvedValue({} as any);

			// B. Act
			await storyService.renumberCustomStories('repo123', orderedStoryIds);

			// C. Assert — only the 3 custom stories are written, numbered 1,2,3 in order
			const writes = bulkWriteUpdates();
			expect(writes).toEqual([
				{ updateOne: { filter: { _id: new ObjectId(custom1) }, update: { $set: { issue_number: 1 } } } },
				{ updateOne: { filter: { _id: new ObjectId(custom2) }, update: { $set: { issue_number: 2 } } } },
				{ updateOne: { filter: { _id: new ObjectId(custom3) }, update: { $set: { issue_number: 3 } } } }
			]);
			expect(mockStoriesCollection.bulkWrite).toHaveBeenCalledTimes(1);
		});

		it('should skip renumbering entirely when the repository has no custom stories', async () => {
			// A. Arrange — only linked stories present
			const linkedJira = new ObjectId().toHexString();
			const linkedGithub = new ObjectId().toHexString();
			mockStoriesCollection.find.mockReturnValue({
				toArray: vi.fn().mockResolvedValue([
					{ _id: new ObjectId(linkedJira), storySource: 'jira' },
					{ _id: new ObjectId(linkedGithub), storySource: 'github' }
				])
			} as any);

			// B. Act
			await storyService.renumberCustomStories('repo456', [linkedJira, linkedGithub]);

			// C. Assert — no write is fired for an all-linked repository
			expect(mockStoriesCollection.bulkWrite).not.toHaveBeenCalled();
		});
	});

});