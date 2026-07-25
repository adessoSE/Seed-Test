import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { User } from '@shared/models/User';
import * as repositoryService from '../services/repository.service';
import * as workgroupService from '../services/workgroup.service';

/** Where to read the ID from: URL params (default), request body, or query string. */
type IdSource = 'params' | 'body' | 'query';

/** Reads a named value from the specified request source. */
function getIdFromRequest(req: Request, name: string, source: IdSource): string | undefined {
	if (source === 'body') return req.body?.[name];
	if (source === 'query') return req.query?.[name] as string | undefined;
	return req.params[name];
}

/**
 * Authorization middleware factory for repository-level access control.
 * Checks whether the authenticated user is the repository owner or a workgroup member.
 *
 * @param repoParamName - Parameter containing the repository ID (e.g. 'repo_id', 'repoId', 'id').
 * @param options.requireEdit - When true, workgroup members must have canEdit permission (for write operations).
 * @param options.ownerOnly - When true, only the repository owner is authorized (e.g. workgroup management).
 * @param options.source - Where to read the ID from: 'params' (default), 'body', or 'query'.
 */
export function authorizeRepo(repoParamName: string, options: { requireEdit?: boolean; ownerOnly?: boolean; source?: IdSource } = {}) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user = req.user as User;
			if (!user?._id) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const repoId = getIdFromRequest(req, repoParamName, options.source || 'params');
			if (!repoId || !ObjectId.isValid(repoId)) {
				res.status(400).json({ error: `Invalid or missing repository ID parameter: ${repoParamName}` });
				return;
			}

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
 * @param storyParamName - Parameter containing the story ID (e.g. 'storyID', '_id', 'story_id').
 * @param options.requireEdit - When true, workgroup members must have canEdit permission.
 * @param options.source - Where to read the ID from: 'params' (default), 'body', or 'query'.
 */
export function authorizeByStory(storyParamName: string, options: { requireEdit?: boolean; source?: IdSource } = {}) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user = req.user as User;
			if (!user?._id) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const storyId = getIdFromRequest(req, storyParamName, options.source || 'params');
			if (!storyId || !ObjectId.isValid(storyId)) {
				res.status(400).json({ error: `Invalid or missing story ID parameter: ${storyParamName}` });
				return;
			}

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
