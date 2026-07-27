import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as repositoryService from '../services/repository.service.js';
import { Group } from '@shared/models/Group.js';
import { AppError } from '../helpers/AppError.js';

/**
 * Handles fetching all story groups for a repository.
 */
export async function getAllGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = req.params.repo_id;
		if (!ObjectId.isValid(repoId))
			throw AppError.badRequest('Invalid repository ID format');

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
		const repoId = req.params.repo_id;
		if (!ObjectId.isValid(repoId))
			throw AppError.badRequest('Invalid repository ID format');

		const { name, member_stories, sequence, xrayTestSet } = req.body;

		const groupID = await repositoryService.createStoryGroup(
			repoId,
			name,
			member_stories || [], // Ensure default empty array if missing
			sequence || false,    // Ensure default false if missing
			xrayTestSet || false
		);
		res.status(200).json({ group_id: groupID });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles updating an existing story group.
 */
export async function updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id, group_id } = req.params;
		if (!ObjectId.isValid(repo_id) || !ObjectId.isValid(group_id))
			throw AppError.badRequest('Invalid repository or group ID format');

		const updatedGroupData: Group = req.body;

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
		const { repo_id, group_id } = req.params;
		if (!ObjectId.isValid(repo_id) || !ObjectId.isValid(group_id))
			throw AppError.badRequest('Invalid repository or group ID format');

		await repositoryService.deleteStoryGroup(repo_id, group_id);
		res.status(200).json({ message: 'success' });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles adding a story to a story group.
 */
export async function addStoryToGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id, group_id, story_id } = req.params;
		if (!ObjectId.isValid(repo_id) || !ObjectId.isValid(group_id) || !ObjectId.isValid(story_id))
			throw AppError.badRequest('Invalid repository, group, or story ID format');

		await repositoryService.addToStoryGroup(repo_id, group_id, story_id);
		res.status(200).json({ message: 'success' });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles removing a story from a story group.
 */
export async function removeStoryFromGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id, group_id, story_id } = req.params;
		if (!ObjectId.isValid(repo_id) || !ObjectId.isValid(group_id) || !ObjectId.isValid(story_id))
			throw AppError.badRequest('Invalid repository, group, or story ID format');

		await repositoryService.removeFromStoryGroup(repo_id, group_id, story_id);
		res.status(200).json({ message: 'success' });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles updating the entire array of groups for a repository (e.g., for reordering).
 */
export async function updateGroupsArray(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = req.params.repo_id;
		if (!ObjectId.isValid(repoId))
			throw AppError.badRequest('Invalid repository ID format');

		const groupsArray: Group[] = req.body;
		await repositoryService.updateStoryGroupsArray(repoId, groupsArray);
		res.status(200).json({ message: 'success' });
	} catch (error) {
		next(error);
	}
}