import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { User } from '@shared/models/User';
import * as repositoryService from '../services/repository.service';
import * as workgroupService from '../services/workgroup.service';

/**
 * Authorization middleware factory for repository-level access control.
 * Checks whether the authenticated user is the repository owner or a workgroup member.
 *
 * @param repoParamName - Route parameter containing the repository ID (e.g. 'repo_id', 'repoId', 'id').
 * @param options.requireEdit - When true, workgroup members must have canEdit permission (for write operations).
 * @param options.ownerOnly - When true, only the repository owner is authorized (e.g. workgroup management).
 */
export function authorizeRepo(repoParamName: string, options: { requireEdit?: boolean; ownerOnly?: boolean } = {}) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user = req.user as User;
			if (!user?._id) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const repoId = req.params[repoParamName];
			if (!repoId || !ObjectId.isValid(repoId))
				return next();

			const repo = await repositoryService.getOneRepositoryById(repoId);
			if (!repo) {
				res.status(404).json({ error: 'Repository not found' });
				return;
			}

			const userId = user._id.toString();
			const repoOwnerId = repo.owner?.toString();

			// Owner always has full access
			if (repoOwnerId === userId)
				return next();

			// Owner-only routes reject all non-owners
			if (options.ownerOnly) {
				res.status(403).json({ error: 'Forbidden: Only the repository owner can perform this action.' });
				return;
			}

			// Check workgroup membership
			const workgroup = await workgroupService.getWorkgroup(repoId);
			const member = workgroup?.Members.find(m => m.email === user.email);

			if (!member) {
				res.status(403).json({ error: 'Forbidden: You do not have access to this repository.' });
				return;
			}

			// Write operations require canEdit permission
			if (options.requireEdit && !member.canEdit) {
				res.status(403).json({ error: 'Forbidden: You do not have edit permissions for this repository.' });
				return;
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}

/**
 * Authorization middleware that resolves the repository from a story ID parameter.
 * Looks up which repository contains the story, then checks ownership/membership.
 *
 * @param storyParamName - Route parameter containing the story ID (e.g. 'storyID', '_id', 'story_id').
 * @param options.requireEdit - When true, workgroup members must have canEdit permission.
 */
export function authorizeByStory(storyParamName: string, options: { requireEdit?: boolean } = {}) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user = req.user as User;
			if (!user?._id) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const storyId = req.params[storyParamName];
			if (!storyId || !ObjectId.isValid(storyId))
				return next();

			// Find which repository contains this story
			const repo = await repositoryService.getRepoByStoryId(storyId);
			if (!repo) {
				res.status(404).json({ error: 'Story not found in any repository' });
				return;
			}

			const userId = user._id.toString();
			const repoOwnerId = repo.owner?.toString();
			const repoId = repo._id!.toString();

			if (repoOwnerId === userId)
				return next();

			const workgroup = await workgroupService.getWorkgroup(repoId);
			const member = workgroup?.Members.find(m => m.email === user.email);

			if (!member) {
				res.status(403).json({ error: 'Forbidden: You do not have access to this repository.' });
				return;
			}

			if (options.requireEdit && !member.canEdit) {
				res.status(403).json({ error: 'Forbidden: You do not have edit permissions for this repository.' });
				return;
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}
