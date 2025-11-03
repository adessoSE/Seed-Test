import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import passport from 'passport'; // Import passport
import * as repositoryService from '../services/repository.service';
import * as storyService from '../services/story.service';
import * as testRunnerService from '../testing/test-runner.service'; // Assuming executeTest is here now
import * as reportService from '../services/report.service'; // For handling report results
import { Story } from '@shared/models/Story';
import { User } from '@shared/models/User';
import fs from 'fs';
import path from 'path';
import * as featureFileService from '../services/feature-file.service'; // For cleanFileName
import { handleReportResult } from './testExecution.controller'; // Re-use the helper
import { ExecutionMode } from '../models/models';

// Error class for user-specific authentication errors
class UserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserError';
    }
}

/**
 * Authenticates the user and then runs tests for a specific group.
 * This function acts as the controller logic after passport authentication succeeds.
 */
export async function runGroupViaScript(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const { repoID, groupID } = req.body; // Assuming these are passed in the body for script router
        if (!repoID || !groupID || !ObjectId.isValid(repoID) || !ObjectId.isValid(groupID)) {
             res.status(400).json({ error: 'Invalid repository or group ID in request body' });
             return;
        }

        const group = await repositoryService.getOneStoryGroup(repoID, groupID);
        if (!group) {
             res.status(404).json({ error: 'Group not found' });
             return;
        }

        const stories: (Story | null)[] = await Promise.all(
             group.member_stories.map(id => storyService.getOneStory(id.toString()))
        );
        const validStories = stories.filter(s => s !== null) as Story[];
         if (validStories.length === 0) {
             res.status(400).json({ error: 'No valid stories found in the group' });
             return;
        }

        // --- Test Execution ---
        // Prepare request/parameters needed by executeTest
        req.body.name = featureFileService.cleanFileName(`script_group_${group.name}_${Date.now()}`);
        fs.mkdirSync(path.join(__dirname, '../../features', req.body.name), { recursive: true });

        const parameters = { ...group, repositoryId: repoID, stories: validStories };
        let lastReportResult: any;

        if (group.isSequential) {
            for (const story of validStories) {
                lastReportResult = await testRunnerService.executeTest(req as any, ExecutionMode.GROUP, story);
            }
        } else {
            const results = await Promise.all(
                validStories.map(story => testRunnerService.executeTest(req as any, ExecutionMode.GROUP, story))
            );
            lastReportResult = results.pop();
        }

         // Use the shared report handling logic
         await handleReportResult(res, lastReportResult, ExecutionMode.GROUP, parameters, req.user as User);

    } catch (error) {
         // Clean up temporary group folder on error
         if (req.body?.name && fs.existsSync(path.join(__dirname, '../../features', req.body.name))) {
             fs.rmSync(path.join(__dirname, '../../features', req.body.name), { recursive: true, force: true });
         }
        next(error);
    }
}

/**
 * Authenticates the user and then runs tests for a specific feature.
 * This function acts as the controller logic after passport authentication succeeds.
 */
export async function runFeatureViaScript(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storyId = req.params.issueID; // Get ID from URL parameter
         if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid Story ID format' }); return;
        }
        const story = await storyService.getOneStory(storyId);
         if (!story) {
             res.status(404).json({ error: 'Story not found' }); return;
        }

        // --- Test Execution ---
        const repoId = req.body.repositoryId; // Assuming repoId comes in body
        const parameters = { repositoryId: repoId, stories: [story] };

        const reportResult = await testRunnerService.executeTest(req as any, ExecutionMode.STORY, story);

        // Use the shared report handling logic
        await handleReportResult(res, reportResult, ExecutionMode.STORY, parameters, req.user as User);

    } catch (error) {
        next(error);
    }
}