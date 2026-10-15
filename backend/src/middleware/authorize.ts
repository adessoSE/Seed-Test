import { type Request, type Response, type NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { type User } from '@seed-test/shared/models/User.js';
import * as repositoryService from '../services/repository.service.js';
import * as workgroupService from '../services/workgroup.service.js';
import * as reportService from '../services/report.service.js';
import * as storyService from '../services/story.service.js';
import type { ReportDoc } from '../types/report.types.js';
import { AppError } from '../helpers/AppError.js';
import { param } from '../utils/request-params.js';

/** Where to read the ID from: URL params (default), request body, or query string. */
type IdSource = 'params' | 'body' | 'query';

/** Reads a named value from the specified request source. */
function getIdFromRequest(req: Request, name: string, source: IdSource): string | undefined {
	if (source === 'body') return (req.body as Record<string, unknown>)[name] as string | undefined;
	if (source === 'query') return req.query[name] as string | undefined;
	return param(req, name);
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
			// req.user is undefined for unauthenticated requests, so the type must admit it (no suppression needed)
			const user = req.user as User | undefined;
			if (!user?._id) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const repoId = getIdFromRequest(req, repoParamName, options.source ?? 'params');
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
			const repoOwnerId = repo.owner.toString();

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
			// req.user is undefined for unauthenticated requests, so the type must admit it (no suppression needed)
			const user = req.user as User | undefined;
			if (!user?._id) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const storyId = getIdFromRequest(req, storyParamName, options.source ?? 'params');
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
			const repoOwnerId = repo.owner.toString();
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

/**
 * Extracts a story ID from a report document, handling the three report types:
 * - StoryReport: uses `featureId` as the story reference
 * - ScenarioReport: uses `storyId` directly
 * - GroupReport: uses the first `storyId` from the `storyStatuses` array
 *
 * @returns The first available storyId/featureId as a string, or null if none found.
 */
export function extractStoryIdFromReport(report: Record<string, unknown>): string | null {
	// StoryReport — featureId is the story ObjectId
	if (report.featureId)
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return String(report.featureId);
	// ScenarioReport — storyId references the parent story
	if (report.storyId)
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return String(report.storyId);
	// GroupReport — storyStatuses array contains per-story results
	const statuses = report.storyStatuses;
	if (Array.isArray(statuses) && statuses.length > 0 && typeof statuses[0] === 'object' && statuses[0] !== null && 'storyId' in statuses[0])
		return String((statuses[0] as Record<string, unknown>).storyId);
	return null;
}

/**
 * Authorization middleware factory for report-level access control.
 * Resolves a report to its parent story, then checks repository ownership/membership.
 *
 * @param paramName - Parameter containing the report identifier (e.g. 'reportId', 'reportName').
 * @param options.requireEdit - When true, workgroup members must have canEdit permission.
 * @param options.lookupBy - How to find the report: 'id' (default) validates ObjectId and fetches by ID,
 *                           'name' fetches by report name string.
 */
export function authorizeByReport(paramName: string, options: { requireEdit?: boolean; lookupBy?: 'id' | 'name' } = {}) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			// req.user is undefined for unauthenticated requests, so the type must admit it (no suppression needed)
			const user = req.user as User | undefined;
			if (!user?._id) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const paramValue = param(req, paramName);
			const lookupBy = options.lookupBy ?? 'id';

			let report: ReportDoc | null;
			if (lookupBy === 'id') {
				// Validate ObjectId format to prevent injection
				if (!paramValue || !ObjectId.isValid(paramValue)) {
					res.status(400).json({ error: `Invalid or missing report ID parameter: ${paramName}` });
					return;
				}
				report = await reportService.getReportDataById(paramValue);
			} else {
				// Name-based lookup — needs a non-empty string
				if (!paramValue) {
					res.status(400).json({ error: `Missing report name parameter: ${paramName}` });
					return;
				}
				try {
					// getReportByName throws AppError.notFound when the report doesn't exist
					const fullReport = await reportService.getReportByName(paramValue);
					// getReportByName returns { _id, jsonReport } — fetch metadata for storyId extraction
					report = await reportService.getReportDataById(fullReport._id.toString());
				} catch (lookupError: unknown) {
					// Convert not-found throws to null so the check below handles it uniformly
					if (lookupError instanceof AppError && lookupError.statusCode === 404)
						report = null;
					else
						throw lookupError;
				}
			}

			if (!report) {
				res.status(404).json({ error: 'Report not found' });
				return;
			}

			// Resolve report → storyId → repository
			const storyId = extractStoryIdFromReport(report as unknown as Record<string, unknown>);
			if (!storyId) {
				res.status(404).json({ error: 'Could not determine story from report' });
				return;
			}

			const repo = await repositoryService.getRepoByStoryId(storyId);
			if (!repo) {
				res.status(404).json({ error: 'Story not found in any repository' });
				return;
			}

			const userId = user._id.toString();
			const repoOwnerId = repo.owner.toString();
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

/**
 * Authorization middleware that resolves the repository from a Jira/GitHub issue key.
 * Looks up the story by issue key, finds which repository contains it, then checks ownership/membership.
 * Grants read-only access — no requireEdit option.
 *
 * @param paramName - Parameter containing the issue key (e.g. 'issue_key').
 */
export function authorizeByIssueKey(paramName: string) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			// req.user is undefined for unauthenticated requests, so the type must admit it (no suppression needed)
			const user = req.user as User | undefined;
			if (!user?._id) {
				res.status(401).json({ error: 'Unauthorized' });
				return;
			}

			const issueKey = param(req, paramName);
			if (!issueKey || typeof issueKey !== 'string') {
				res.status(400).json({ error: `Invalid or missing issue key parameter: ${paramName}` });
				return;
			}

			// Look up the story by its external issue key (Jira/GitHub)
			const story = await storyService.getOneStoryByIssueKey(issueKey);
			if (!story?._id) {
				res.status(404).json({ error: 'Story not found for this issue key' });
				return;
			}

			// Find which repository contains this story
			const repo = await repositoryService.getRepoByStoryId(story._id.toString());
			if (!repo) {
				res.status(404).json({ error: 'Story not found in any repository' });
				return;
			}

			const userId = user._id.toString();
			const repoOwnerId = repo.owner.toString();
			const repoId = repo._id!.toString();

			if (repoOwnerId === userId)
				return next();

			const workgroup = await workgroupService.getWorkgroup(repoId);
			const member = workgroup?.Members.find(m => m.email === user.email);

			if (!member) {
				res.status(403).json({ error: 'Forbidden: You do not have access to this repository.' });
				return;
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}
