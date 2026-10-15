import { type Request, type Response, type NextFunction } from 'express';
import { requireValidId } from '../utils/validation.js';
import { param } from '../utils/request-params.js';
import * as repositoryService from '../services/repository.service.js';
import * as storyService from '../services/story.service.js';
import { type Group } from '@seed-test/shared/models/Group.js';

/**
 * Returns the incoming member IDs that are not already stored in the group. Only these are checked
 * for repository membership: stored members may be legacy references (e.g. a story removed from the
 * repo later), and checking them would reject every save of the group.
 * @param incoming - Member IDs sent in the request.
 * @param stored - Member IDs the group already has in the database.
 */
function addedMemberIds(incoming: string[], stored: string[] = []): string[] {
	const storedSet = new Set(stored);
	return incoming.filter(id => !storedSet.has(id));
}

/**
 * Handles fetching all story groups for a repository.
 */
export async function getAllGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = requireValidId(param(req, 'repo_id'), 'repository ID');

		// The service now returns only the groups array
		const groups = await repositoryService.getAllStoryGroups(repoId);
		res.status(200).json(groups); // Send the array directly
	} catch (error) {
		next(error);
	}
}

/**
 * Handles creating a new story group within a repository.
 */
export async function createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = requireValidId(param(req, 'repo_id'), 'repository ID');

		const body = req.body as Record<string, unknown>;
		const name = body.name as string;
		const member_stories = body.member_stories as string[] | undefined;
		const sequence = body.sequence as boolean | undefined;
		const xrayTestSet = body.xrayTestSet as boolean | undefined;

		// Members must belong to this repo: the route only authorizes repo_id, so foreign story IDs would otherwise be attached to this group
		await storyService.assertStoriesInRepo(repoId, member_stories ?? []);
		const groupID = await repositoryService.createStoryGroup(
			repoId,
			name,
			member_stories ?? [], // Ensure default empty array if missing
			sequence ?? false,    // Ensure default false if missing
			xrayTestSet ?? false
		);
		res.status(201).json({ group_id: groupID });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles updating an existing story group.
 */
export async function updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repo_id = requireValidId(param(req, 'repo_id'), 'repository ID');
		const group_id = requireValidId(param(req, 'group_id'), 'group ID');

		const updatedGroupData = req.body as Group;
		// Only members this save newly adds are checked. Members already stored in the group are left alone:
		// they may be legacy references that no longer belong to the repo, and rejecting them would block every save.
		const storedGroup = await repositoryService.getOneStoryGroup(repo_id, group_id);
		await storyService.assertStoriesInRepo(repo_id, addedMemberIds(updatedGroupData.member_stories, storedGroup?.member_stories));

		await repositoryService.updateStoryGroup(repo_id, group_id, updatedGroupData);
		// updateStoryGroup in service doesn't return the updated doc directly in this structure (updateone)
		// Fetch it again or just return success
		res.status(200).json(updatedGroupData); // Or fetch updated group if needed
	} catch (error) {
		next(error);
	}
}

/**
 * Handles deleting a story group.
 */
export async function deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repo_id = requireValidId(param(req, 'repo_id'), 'repository ID');
		const group_id = requireValidId(param(req, 'group_id'), 'group ID');

		await repositoryService.deleteStoryGroup(repo_id, group_id);
		res.status(200).json({ message: 'Group deleted' });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles adding a story to a story group.
 */
export async function addStoryToGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repo_id = requireValidId(param(req, 'repo_id'), 'repository ID');
		const group_id = requireValidId(param(req, 'group_id'), 'group ID');
		const story_id = requireValidId(param(req, 'story_id'), 'story ID');

		// The story must belong to this repo, otherwise it would be injected into the group
		await storyService.assertStoriesInRepo(repo_id, [story_id]);
		await repositoryService.addToStoryGroup(repo_id, group_id, story_id);
		res.status(200).json({ message: 'Story added to group' });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles removing a story from a story group.
 */
export async function removeStoryFromGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repo_id = requireValidId(param(req, 'repo_id'), 'repository ID');
		const group_id = requireValidId(param(req, 'group_id'), 'group ID');
		const story_id = requireValidId(param(req, 'story_id'), 'story ID');

		await repositoryService.removeFromStoryGroup(repo_id, group_id, story_id);
		res.status(200).json({ message: 'Story removed from group' });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles updating the entire array of groups for a repository (e.g., for reordering).
 */
export async function updateGroupsArray(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = requireValidId(param(req, 'repo_id'), 'repository ID');

		const groupsArray = req.body as Group[];
		// Only members newly added to a group (not already stored in that same group) are checked.
		// Groups are compared by _id; a group without a stored counterpart has all its members checked.
		const storedGroups = await repositoryService.getAllStoryGroups(repoId);
		const storedMembersById = new Map(storedGroups.map((g): [string, string[]] => [g._id ?? '', g.member_stories]));
		const newMembers = groupsArray.flatMap(g => addedMemberIds(g.member_stories, g._id ? storedMembersById.get(g._id) : undefined));
		await storyService.assertStoriesInRepo(repoId, newMembers);
		await repositoryService.updateStoryGroupsArray(repoId, groupsArray);
		res.status(200).json({ message: 'Groups array updated' });
	} catch (error) {
		next(error);
	}
}