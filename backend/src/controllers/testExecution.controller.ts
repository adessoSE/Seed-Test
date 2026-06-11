import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as testRunnerService from '../testing/test-runner.service';
import * as storyService from '../services/story.service';
import * as repositoryService from '../services/repository.service';
import * as reportService from '../services/report.service';
import * as featureFileService from '../services/feature-file.service';
import { Story } from '@shared/models/Story';
import { User } from '@shared/models/User';
import { IssueTracker, IssueTrackerOption, Github, Jira } from '../models/IssueTracker';
import { ExecutionMode } from '../models/models';
import fs from 'fs';
import path from 'path';


// Helper function to extract common parameters
function extractRunParams(req: Request): { repoId: string, repositoryName: string } {
    const repoId = req.params.repoID || req.body.id || req.body.repoId || req.body.repositoryId;
    const repositoryName = req.body.repository; // Assuming this comes in the body for groups/temps
    if (!repoId || !ObjectId.isValid(repoId)) {
        throw new Error('Invalid or missing Repository ID');
    }
    return { repoId, repositoryName };
}

// Helper for report post-processing
export async function handleReportResult(res: Response, reportResult: any, mode: ExecutionMode, parameters: any, user?: User) {
    if (!reportResult || !reportResult.reportName) {
         res.status(500).json({ error: 'Test execution failed to produce a valid report result.' });
         return;
    }

    // Resolve report (analyze JSON, generate HTML etc.) - Moved from reporting.ts
    const finalReport = await reportService.resolveAndSaveReport(reportResult, mode, reportResult.story ? [reportResult.story] : parameters.stories || [], parameters);

    // Send HTML Report back to client
    const htmlPath = path.join(process.cwd(), 'features', mode === 'group' ? `${finalReport.reportName}/${finalReport.reportName}.html` : `${finalReport.reportName}.html`);
    try {
        const htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
        res.json({ htmlFile: htmlContent, reportId: finalReport._id, report: finalReport });
    } catch (readError) {
        console.error("Error reading HTML report:", readError);
        res.status(500).json({ error: 'Failed to read HTML report file.', reportId: finalReport._id });
    } finally {
        // Clean up temporary files after a delay
        const deletionTime = parseInt(process.env.REPORT_DELETION_TIME || '5') * 60000;
        reportService.scheduleReportDeletion(finalReport.reportName, mode === 'group', deletionTime);
    }

    // Update last test status in DB
    await reportService.updateLatestTestStatus(finalReport, mode);

    // Post comments to Issue Trackers (Moved from reporting.ts)
    await postCommentsToTrackers(finalReport, parameters.stories || [reportResult.story], mode, user, parameters);
}


/**
 * Initiates a test run for a single feature/story.
 */
export async function runFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storyId = req.params.issueID;
        if (!ObjectId.isValid(storyId)) {
            res.status(400).json({ error: 'Invalid Story ID format' }); return;
        }
        const story = await storyService.getOneStory(storyId);
        if (!story) {
             res.status(404).json({ error: 'Story not found' }); return;
        }

        // TODO: Determine repoId if needed for global settings lookup
        // Assuming req.body might contain repositoryId or we fetch it based on story?
        const repoId = req.body.repositoryId; // Adjust as needed
        const parameters = { repositoryId: repoId, stories: [story] };

        const reportResult = await testRunnerService.executeTest(req as any, ExecutionMode.STORY, story!);
        await handleReportResult(res, reportResult, ExecutionMode.STORY, parameters, req.user as User);

    } catch (error) {
        next(error);
    }
}

/**
 * Initiates a test run for a single scenario within a feature/story.
 */
export async function runScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storyId = req.params.issueID;
        const scenarioId = req.params.scenarioId;
        if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid Story ID format' }); return;
        }
        // Scenario ID is numeric in the model
        if (!scenarioId || isNaN(parseInt(scenarioId))) {
             res.status(400).json({ error: 'Invalid Scenario ID format' }); return;
        }

        const story = await storyService.getOneStory(storyId);
         if (!story) {
             res.status(404).json({ error: 'Story not found' }); return;
        }
        if (!story.scenarios.some(s => s.scenario_id === parseInt(scenarioId))) {
             res.status(404).json({ error: 'Scenario not found in story' }); return;
        }

         // TODO: Determine repoId if needed
         const repoId = req.body.repositoryId;
         const parameters = { repositoryId: repoId, stories: [story] };

        const reportResult = await testRunnerService.executeTest(req as any, ExecutionMode.SCENARIO, story!);
        await handleReportResult(res, reportResult, ExecutionMode.SCENARIO, parameters, req.user as User);

    } catch (error) {
        next(error);
    }
}

/**
 * Initiates a test run for a story group.
 */
export async function runGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { repoId } = extractRunParams(req);
        const groupId = req.params.groupID;
         if (!ObjectId.isValid(groupId)) {
             res.status(400).json({ error: 'Invalid Group ID format' }); return;
        }

        req.body.repositoryId = repoId;

        const group = await repositoryService.getOneStoryGroup(repoId, groupId);
        if (!group) {
             res.status(404).json({ error: 'Group not found' }); return;
        }

        const stories: (Story | null)[] = await Promise.all(
            group.member_stories.map(id => storyService.getOneStory(id.toString()))
        );
        const validStories = stories.filter(s => s !== null) as Story[];
        if (validStories.length === 0) {
             res.status(400).json({ error: 'No valid stories found in the group' }); return;
        }

        // Use group name for report directory, ensuring it's filesystem-safe
        req.body.name = featureFileService.cleanFileName(`group_${group.name}_${Date.now()}`);
        fs.mkdirSync(path.join(process.cwd(), 'features', req.body.name), { recursive: true });

        const parameters = { ...group, repositoryId: repoId, stories: validStories, repository: req.body.repository }; // Pass necessary info
        let lastReportResult: any;

        if (group!.isSequential) {
            for (const story of validStories) {
                lastReportResult = await testRunnerService.executeTest(req as any, ExecutionMode.GROUP, story);
            }
        } else {
            const results = await Promise.all(
                validStories.map(story => testRunnerService.executeTest(req as any, ExecutionMode.GROUP, story))
            );
            lastReportResult = results.pop();
        }
        
        await handleReportResult(res, lastReportResult, ExecutionMode.GROUP, parameters, req.user as User);

    } catch (error) {
        next(error);
    }
}

/**
 * Initiates a test run for a temporary, dynamically defined group of stories.
 */
export async function runTempGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const tempGroup = req.body.group;
        const repoInfo = extractRunParams(req); // Contains repoId and potentially repository name
        const validStories = (tempGroup?.member_stories || []).filter((s: Story | null) => s !== null) as Story[];

        if (validStories.length === 0) {
            res.status(400).json({ error: 'No valid stories provided in the temporary group' }); return;
        }

        req.body.name = featureFileService.cleanFileName(`temp_group_${Date.now()}`);
        fs.mkdirSync(path.join(process.cwd(), 'features', req.body.name), { recursive: true });

        const parameters = { ...tempGroup, repositoryId: repoInfo.repoId, stories: validStories, repository: repoInfo.repositoryName };
        let lastReportResult: any;

         if (tempGroup.isSequential) {
            for (const story of validStories) {
                lastReportResult = await testRunnerService.executeTest(req as any, ExecutionMode.GROUP, story);
            }
        } else {
            const results = await Promise.all(
                validStories.map(story => testRunnerService.executeTest(req as any, ExecutionMode.GROUP, story))
            );
            lastReportResult = results.pop();
        }

        await handleReportResult(res, lastReportResult, ExecutionMode.GROUP, parameters, req.user as User);

    } catch (error) {
        next(error);
    }
}

// --- Issue Tracker Communication ---
async function postCommentsToTrackers(finalReport: any, stories: Story[], mode: ExecutionMode, user?: User, parameters?: any) {
    if (!user) return; // Need user for credentials

    // Check global settings for commenting preference
    const repoSettings = parameters?.repositoryId ? await repositoryService.getRepoSettingsById(parameters.repositoryId) : null;
    if (repoSettings && repoSettings.reportComment === false) {
        console.log(`Report comments disabled for repository ${parameters.repositoryId}`);
        return; // Skip posting comments if disabled globally
    }

    for (const story of stories) {
        try {
            const issueTracker = IssueTracker.getIssueTracker(story.storySource as IssueTrackerOption);
            if (story.storySource === IssueTrackerOption.NONE) continue;

            const comment = issueTracker.reportText(finalReport, mode === ExecutionMode.SCENARIO ? story.scenarios.find(s=> s.scenario_id === finalReport.scenarioId)?.name || 'Unknown Scenario': story.title);

            if (story.storySource === IssueTrackerOption.GITHUB && user.github) {
                if (!parameters?.repository) {
                     console.warn(`Cannot post GitHub comment for story ${story.title}: Missing repository name.`);
                     continue;
                }
                const [repoUser, repoName] = parameters.repository.split('/');
                if (!repoUser || !repoName || !story.issue_number) continue;

                issueTracker.postComment(comment, { issueId: story.issue_number.toString(), repoUser, repoName }, user.github);
                if (mode === ExecutionMode.STORY) { // Update label only on full feature run
                    (issueTracker as Github).updateLabel(finalReport.status, { issueId: story.issue_number.toString(), repoUser, repoName }, user.github.githubToken);
                }

            } else if (story.storySource === IssueTrackerOption.JIRA && user.jira) {
                 if (!story.issue_number) continue;
                 issueTracker.postComment(comment, { issueId: story.issue_number.toString() }, user.jira);
            }
        } catch (commentError) {
             console.error(`Failed to post comment for story ${story.title} (${story.storySource}):`, commentError);
        }
    }
}