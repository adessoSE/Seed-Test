// src/controllers/group.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';
// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedRepositoryService,
	mockedStoryService,
	mockedLogger
} = vi.hoisted(() => ({
	mockedStoryService: {
		assertStoriesInRepo: vi.fn()
	},
	mockedRepositoryService: {
		getAllStoryGroups: vi.fn(),
		getOneStoryGroup: vi.fn(),
		createStoryGroup: vi.fn(),
		updateStoryGroup: vi.fn(),
		deleteStoryGroup: vi.fn(),
		addToStoryGroup: vi.fn(),
		removeFromStoryGroup: vi.fn(),
		updateStoryGroupsArray: vi.fn()
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
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './group.controller.js';

// --- Test constants ---
const VALID_REPO_ID = '507f1f77bcf86cd799439011';
const VALID_GROUP_ID = '507f1f77bcf86cd799439012';
const VALID_STORY_ID = '507f1f77bcf86cd799439013';
const INVALID_ID = 'invalid';

// --- Test helpers ---

/** Creates a minimal Express Request with sensible defaults and optional overrides. */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		user: { _id: new ObjectId(VALID_REPO_ID), email: 'test@seed.de' },
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

// --- Test Suite ---
describe('GroupController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		// Default: all member stories belong to the repository; rejection tests override this
		mockedStoryService.assertStoriesInRepo.mockResolvedValue(undefined);
		// Default: no stored groups yet, so every incoming member counts as newly added.
		// Set explicitly because clearAllMocks keeps implementations set by earlier tests.
		mockedRepositoryService.getOneStoryGroup.mockResolvedValue(undefined);
		mockedRepositoryService.getAllStoryGroups.mockResolvedValue([]);
		res = createRes();
		next = vi.fn();
	});

	// ---------------------------------------------------------------
	// getAllGroups
	// ---------------------------------------------------------------
	describe('getAllGroups', () => {
		it('returns all groups for a valid repository ID', async () => {
			const groups = [{ _id: VALID_GROUP_ID, name: 'Smoke Tests' }];
			mockedRepositoryService.getAllStoryGroups.mockResolvedValue(groups);

			const req = createReq({ params: { repo_id: VALID_REPO_ID } });
			await controller.getAllGroups(req, res, next);

			expect(mockedRepositoryService.getAllStoryGroups).toHaveBeenCalledWith(VALID_REPO_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(groups);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repo_id: INVALID_ID } });
			await controller.getAllGroups(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('DB read failed');
			mockedRepositoryService.getAllStoryGroups.mockRejectedValue(serviceError);

			const req = createReq({ params: { repo_id: VALID_REPO_ID } });
			await controller.getAllGroups(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// createGroup
	// ---------------------------------------------------------------
	describe('createGroup', () => {
		it('creates a group and returns the new group ID', async () => {
			const newGroupId = new ObjectId(VALID_GROUP_ID);
			mockedRepositoryService.createStoryGroup.mockResolvedValue(newGroupId);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID },
				body: { name: 'Regression', member_stories: [VALID_STORY_ID], sequence: true, xrayTestSet: false }
			});
			await controller.createGroup(req, res, next);

			expect(mockedRepositoryService.createStoryGroup).toHaveBeenCalledWith(
				VALID_REPO_ID, 'Regression', [VALID_STORY_ID], true, false
			);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({ group_id: newGroupId });
			expect(next).not.toHaveBeenCalled();
		});

		it('defaults member_stories and sequence when body fields are missing', async () => {
			mockedRepositoryService.createStoryGroup.mockResolvedValue(new ObjectId());

			// Body only has name — member_stories, sequence, xrayTestSet omitted
			const req = createReq({
				params: { repo_id: VALID_REPO_ID },
				body: { name: 'Empty Group' }
			});
			await controller.createGroup(req, res, next);

			expect(mockedRepositoryService.createStoryGroup).toHaveBeenCalledWith(
				VALID_REPO_ID, 'Empty Group', [], false, false
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repo_id: INVALID_ID }, body: { name: 'Group' } });
			await controller.createGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// updateGroup
	// ---------------------------------------------------------------
	describe('updateGroup', () => {
		it('updates a group and returns the updated data', async () => {
			mockedRepositoryService.updateStoryGroup.mockResolvedValue(undefined);

			const updatedData = { name: 'Updated Group', member_stories: [], sequence: false };
			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID },
				body: updatedData
			});
			await controller.updateGroup(req, res, next);

			expect(mockedRepositoryService.updateStoryGroup).toHaveBeenCalledWith(
				VALID_REPO_ID, VALID_GROUP_ID, updatedData
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updatedData);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repo_id: INVALID_ID, group_id: VALID_GROUP_ID } });
			await controller.updateGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid group ID', async () => {
			const req = createReq({ params: { repo_id: VALID_REPO_ID, group_id: INVALID_ID } });
			await controller.updateGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing group ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// deleteGroup
	// ---------------------------------------------------------------
	describe('deleteGroup', () => {
		it('deletes a group and returns success', async () => {
			mockedRepositoryService.deleteStoryGroup.mockResolvedValue(undefined);

			const req = createReq({ params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID } });
			await controller.deleteGroup(req, res, next);

			expect(mockedRepositoryService.deleteStoryGroup).toHaveBeenCalledWith(VALID_REPO_ID, VALID_GROUP_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Group deleted' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repo_id: INVALID_ID, group_id: VALID_GROUP_ID } });
			await controller.deleteGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid group ID', async () => {
			const req = createReq({ params: { repo_id: VALID_REPO_ID, group_id: INVALID_ID } });
			await controller.deleteGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing group ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// addStoryToGroup
	// ---------------------------------------------------------------
	describe('addStoryToGroup', () => {
		it('adds a story to a group and returns success', async () => {
			mockedRepositoryService.addToStoryGroup.mockResolvedValue(undefined);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID, story_id: VALID_STORY_ID }
			});
			await controller.addStoryToGroup(req, res, next);

			expect(mockedRepositoryService.addToStoryGroup).toHaveBeenCalledWith(
				VALID_REPO_ID, VALID_GROUP_ID, VALID_STORY_ID
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Story added to group' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid story ID', async () => {
			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID, story_id: INVALID_ID }
			});
			await controller.addStoryToGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing story ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid group ID (validates all params)', async () => {
			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: INVALID_ID, story_id: VALID_STORY_ID }
			});
			await controller.addStoryToGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing group ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// removeStoryFromGroup
	// ---------------------------------------------------------------
	describe('removeStoryFromGroup', () => {
		it('removes a story from a group and returns success', async () => {
			mockedRepositoryService.removeFromStoryGroup.mockResolvedValue(undefined);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID, story_id: VALID_STORY_ID }
			});
			await controller.removeStoryFromGroup(req, res, next);

			expect(mockedRepositoryService.removeFromStoryGroup).toHaveBeenCalledWith(
				VALID_REPO_ID, VALID_GROUP_ID, VALID_STORY_ID
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Story removed from group' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid story ID', async () => {
			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID, story_id: INVALID_ID }
			});
			await controller.removeStoryFromGroup(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing story ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// updateGroupsArray
	// ---------------------------------------------------------------
	describe('updateGroupsArray', () => {
		it('updates the full groups array and returns success', async () => {
			mockedRepositoryService.updateStoryGroupsArray.mockResolvedValue(undefined);

			const groupsArray = [
				{ _id: VALID_GROUP_ID, name: 'Group A', member_stories: [] },
				{ _id: VALID_STORY_ID, name: 'Group B', member_stories: [] }
			];
			const req = createReq({
				params: { repo_id: VALID_REPO_ID },
				body: groupsArray
			});
			await controller.updateGroupsArray(req, res, next);

			expect(mockedRepositoryService.updateStoryGroupsArray).toHaveBeenCalledWith(VALID_REPO_ID, groupsArray);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Groups array updated' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repo_id: INVALID_ID }, body: [] });
			await controller.updateGroupsArray(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('DB write failed');
			mockedRepositoryService.updateStoryGroupsArray.mockRejectedValue(serviceError);

			const req = createReq({ params: { repo_id: VALID_REPO_ID }, body: [] });
			await controller.updateGroupsArray(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// Cross-repo member validation: member stories must belong to the repo in the URL.
	// The route only authorizes repo_id, so a foreign story ID would otherwise be injected into the group.
	// ---------------------------------------------------------------
	describe('cross-repo member validation', () => {
		const foreignError = AppError.badRequest('Stories not part of this repository');

		it('createGroup rejects with 400 and creates nothing when a member belongs to another repo', async () => {
			mockedStoryService.assertStoriesInRepo.mockRejectedValue(foreignError);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID },
				body: { name: 'Injected', member_stories: [VALID_STORY_ID] }
			});
			await controller.createGroup(req, res, next);

			expect(mockedStoryService.assertStoriesInRepo).toHaveBeenCalledWith(VALID_REPO_ID, [VALID_STORY_ID]);
			expect(mockedRepositoryService.createStoryGroup).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
		});

		it('updateGroup rejects with 400 and writes nothing when a member belongs to another repo', async () => {
			mockedStoryService.assertStoriesInRepo.mockRejectedValue(foreignError);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID },
				body: { _id: VALID_GROUP_ID, name: 'Injected', member_stories: [VALID_STORY_ID] }
			});
			await controller.updateGroup(req, res, next);

			expect(mockedStoryService.assertStoriesInRepo).toHaveBeenCalledWith(VALID_REPO_ID, [VALID_STORY_ID]);
			expect(mockedRepositoryService.updateStoryGroup).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
		});

		it('addStoryToGroup rejects with 400 and writes nothing when the story belongs to another repo', async () => {
			mockedStoryService.assertStoriesInRepo.mockRejectedValue(foreignError);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID, story_id: VALID_STORY_ID }
			});
			await controller.addStoryToGroup(req, res, next);

			expect(mockedStoryService.assertStoriesInRepo).toHaveBeenCalledWith(VALID_REPO_ID, [VALID_STORY_ID]);
			expect(mockedRepositoryService.addToStoryGroup).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
		});

		it('updateGroupsArray rejects with 400 and writes nothing when any group member belongs to another repo', async () => {
			mockedStoryService.assertStoriesInRepo.mockRejectedValue(foreignError);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID },
				body: [
					{ _id: VALID_GROUP_ID, name: 'A', member_stories: [] },
					{ _id: VALID_STORY_ID, name: 'B', member_stories: [VALID_STORY_ID] }
				]
			});
			await controller.updateGroupsArray(req, res, next);

			expect(mockedStoryService.assertStoriesInRepo).toHaveBeenCalledWith(VALID_REPO_ID, [VALID_STORY_ID]);
			expect(mockedRepositoryService.updateStoryGroupsArray).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
		});
	});

	// ---------------------------------------------------------------
	// Legacy members: a stored member is not re-checked, only IDs that a save newly adds
	// ---------------------------------------------------------------
	describe('legacy member handling', () => {
		const LEGACY_STORY_ID = '507f1f77bcf86cd799439014';
		const NEW_STORY_ID = '507f1f77bcf86cd799439015';

		it('updateGroup does not re-check a stored member that is no longer in the repo', async () => {
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue({ _id: VALID_GROUP_ID, name: 'Old', member_stories: [LEGACY_STORY_ID], isSequential: false });
			mockedRepositoryService.updateStoryGroup.mockResolvedValue(undefined);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID },
				body: { name: 'Renamed', member_stories: [LEGACY_STORY_ID], isSequential: false }
			});
			await controller.updateGroup(req, res, next);

			expect(mockedStoryService.assertStoriesInRepo).toHaveBeenCalledWith(VALID_REPO_ID, []);
			expect(mockedRepositoryService.updateStoryGroup).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(next).not.toHaveBeenCalled();
		});

		it('updateGroup checks only the members that were newly added', async () => {
			mockedRepositoryService.getOneStoryGroup.mockResolvedValue({ _id: VALID_GROUP_ID, name: 'Old', member_stories: [LEGACY_STORY_ID], isSequential: false });
			mockedRepositoryService.updateStoryGroup.mockResolvedValue(undefined);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID, group_id: VALID_GROUP_ID },
				body: { name: 'Old', member_stories: [LEGACY_STORY_ID, NEW_STORY_ID], isSequential: false }
			});
			await controller.updateGroup(req, res, next);

			expect(mockedStoryService.assertStoriesInRepo).toHaveBeenCalledWith(VALID_REPO_ID, [NEW_STORY_ID]);
		});

		it('updateGroupsArray does not re-check stored members of an unchanged group', async () => {
			mockedRepositoryService.getAllStoryGroups.mockResolvedValue([{ _id: VALID_GROUP_ID, name: 'A', member_stories: [LEGACY_STORY_ID], isSequential: false }]);
			mockedRepositoryService.updateStoryGroupsArray.mockResolvedValue(undefined);

			const req = createReq({
				params: { repo_id: VALID_REPO_ID },
				body: [{ _id: VALID_GROUP_ID, name: 'A', member_stories: [LEGACY_STORY_ID] }]
			});
			await controller.updateGroupsArray(req, res, next);

			expect(mockedStoryService.assertStoriesInRepo).toHaveBeenCalledWith(VALID_REPO_ID, []);
			expect(mockedRepositoryService.updateStoryGroupsArray).toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		});

		it('updateGroupsArray checks a stored member that is moved into a different group', async () => {
			mockedRepositoryService.getAllStoryGroups.mockResolvedValue([{ _id: VALID_GROUP_ID, name: 'A', member_stories: [LEGACY_STORY_ID], isSequential: false }]);
			mockedStoryService.assertStoriesInRepo.mockRejectedValue(AppError.badRequest('Stories not part of this repository'));

			const req = createReq({
				params: { repo_id: VALID_REPO_ID },
				body: [{ _id: VALID_STORY_ID, name: 'B', member_stories: [LEGACY_STORY_ID] }]
			});
			await controller.updateGroupsArray(req, res, next);

			expect(mockedStoryService.assertStoriesInRepo).toHaveBeenCalledWith(VALID_REPO_ID, [LEGACY_STORY_ID]);
			expect(mockedRepositoryService.updateStoryGroupsArray).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
		});
	});
});
