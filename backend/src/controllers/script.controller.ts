import { type Request, type Response, type NextFunction } from 'express';
import { requireValidId } from '../utils/validation.js';
import { param } from '../utils/request-params.js';
import * as repositoryService from '../services/repository.service.js';
import * as storyService from '../services/story.service.js';
import * as testRunnerService from '../testing/test-runner.service.js';
import type { TestExecutionResult } from '../testing/test-runner.service.js';
import { type Story } from '@seed-test/shared/models/Story.js';
import { type User } from '@seed-test/shared/models/User.js';
import fs from 'node:fs';
import path from 'node:path';
import * as featureFileService from '../services/feature-file.service.js'; // For cleanFileName
import { handleReportResult } from './testExecution.controller.js'; // Re-use the helper
import { ExecutionMode } from '../models/models.js';
import { AppError } from '../helpers/AppError.js';

/**
 * Authenticates the user and then runs tests for a specific group.
 * This function acts as the controller logic after passport authentication succeeds.
 */
export async function runGroupViaScript(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repoID, groupID } = req.body as Record<string, string>; // Assuming these are passed in the body for script router
		requireValidId(repoID, 'repository ID');
		requireValidId(groupID, 'group ID');

		const group = await repositoryService.getOneStoryGroup(repoID, groupID);
		if (!group)
			throw AppError.notFound('Group not found');

		const stories: (Story | null)[] = await Promise.all(
			group.member_stories.map(id => storyService.getOneStory(id.toString()))
		);
		const validStories = stories.filter(s => s !== null);
		if (validStories.length === 0)
			throw AppError.badRequest('No valid stories found in the group');

		// --- Test Execution ---
		// Prepare request/parameters needed by executeTest
		(req.body as Record<string, unknown>).name = featureFileService.cleanFileName(`script_group_${group.name}_${Date.now()}`);
		fs.mkdirSync(path.join(process.cwd(), 'features', (req.body as Record<string, unknown>).name as string), { recursive: true });

		const parameters = { ...group, repositoryId: repoID, stories: validStories };
		let lastReportResult: TestExecutionResult | undefined;

		if (group.isSequential) 
			for (const story of validStories) 
				lastReportResult = await testRunnerService.executeTest(req as unknown as Parameters<typeof testRunnerService.executeTest>[0], ExecutionMode.GROUP, story);
            
		else {
			const results = await Promise.all(
				validStories.map(story => testRunnerService.executeTest(req as unknown as Parameters<typeof testRunnerService.executeTest>[0], ExecutionMode.GROUP, story))
			);
			lastReportResult = results.pop();
		}

		// Use the shared report handling logic
		await handleReportResult(res, lastReportResult!, ExecutionMode.GROUP, parameters, req.user as User);

	} catch (error) {
		// Clean up temporary group folder on error
		if ((req.body as Record<string, unknown>).name && fs.existsSync(path.join(process.cwd(), 'features', (req.body as Record<string, unknown>).name as string))) 
			fs.rmSync(path.join(process.cwd(), 'features', (req.body as Record<string, unknown>).name as string), { recursive: true, force: true });
         
		next(error);
	}
}

/**
 * Authenticates the user and then runs tests for a specific feature.
 * This function acts as the controller logic after passport authentication succeeds.
 */
export async function runFeatureViaScript(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const storyId = requireValidId(param(req, 'issueID'), 'story ID');

		const story = await storyService.getOneStory(storyId);
		if (!story)
			throw AppError.notFound('Story not found');

		// --- Test Execution ---
		const repoId = (req.body as Record<string, unknown>).repositoryId as string; // Assuming repoId comes in body
		const parameters = { repositoryId: repoId, stories: [story] };

		const reportResult = await testRunnerService.executeTest(req as unknown as Parameters<typeof testRunnerService.executeTest>[0], ExecutionMode.STORY, story);

		// Use the shared report handling logic
		await handleReportResult(res, reportResult, ExecutionMode.STORY, parameters, req.user as User);

	} catch (error) {
		next(error);
	}
}