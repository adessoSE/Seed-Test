import { type Request, type Response, type NextFunction } from 'express';
import { requireValidId } from '../utils/validation.js';
import { param } from '../utils/request-params.js';
import * as testRunnerService from '../testing/test-runner.service.js';
import { type ExecuteTestRequest, type TestExecutionResult } from '../testing/test-runner.service.js';
import * as storyService from '../services/story.service.js';
import * as repositoryService from '../services/repository.service.js';
import * as reportService from '../services/report.service.js';
import * as featureFileService from '../services/feature-file.service.js';
import { type Story } from '@seed-test/shared/models/Story.js';
import { type User } from '@seed-test/shared/models/User.js';
import { IssueTracker, IssueTrackerOption, type Github } from '../models/IssueTracker.js';
import { ExecutionMode, type GenericReport } from '../models/models.js';
import { type ReportDoc, type GroupExecutionParams } from '../types/report.types.js';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logging.js';
import { AppError } from '../helpers/AppError.js';


// Helper function to extract common parameters
function extractRunParams(req: Request): { repoId: string, repositoryName: string } {
	const body = req.body as Record<string, unknown>;
	let repoId: string | undefined;

	// Try route param first, then body fields — treat empty strings as absent
	const routeParam = param(req, 'repoID');
	if (typeof routeParam === 'string' && routeParam) repoId = routeParam;
	if (!repoId && typeof body.id === 'string' && body.id) repoId = body.id;
	if (!repoId && typeof body.repoId === 'string' && body.repoId) repoId = body.repoId;
	if (!repoId && typeof body.repositoryId === 'string' && body.repositoryId) repoId = body.repositoryId;

	requireValidId(repoId, 'repository ID');
	const repositoryName = body.repository as string; // Assuming this comes in the body for groups/temps

	return { repoId: repoId!, repositoryName };
}

/**
 * Post-processes a test execution result: resolves the report, sends HTML to client,
 * then asynchronously posts comments to issue trackers.
 */
export async function handleReportResult(res: Response, reportResult: TestExecutionResult, mode: ExecutionMode, parameters: Record<string, unknown>, user?: User) {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- null safety (test verifies null throws AppError not TypeError)
	if (!reportResult?.reportName)
		throw new AppError('Test execution failed to produce a valid report result.', 500);

	// Resolve report (analyze JSON, generate HTML etc.)
	const finalReport = await reportService.resolveAndSaveReport(reportResult, mode, [reportResult.story], parameters as unknown as GroupExecutionParams);

	// resolveAndSaveReport returns ReportDoc — widen via unknown for duck-typed field access
	const report = finalReport as unknown as Record<string, unknown>;

	// Send HTML Report back to client
	const htmlPath = path.join(process.cwd(), 'features', mode === ExecutionMode.GROUP ? `${String(report.reportName)}/${String(report.reportName)}.html` : `${String(report.reportName)}.html`);
	try {
		const htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
		res.json({ htmlFile: htmlContent, reportId: report._id, report });
	} catch (readError: unknown) {
		logger.error(`Error reading HTML report: ${readError instanceof Error ? readError.message : String(readError)}`);
		throw new AppError('Failed to read HTML report file.', 500, undefined, { data: { reportId: report._id } });
	} finally {
		// Clean up temporary files after a delay
		const deletionTime = parseInt(process.env.REPORT_DELETION_TIME ?? '5') * 60000;
		reportService.scheduleReportDeletion(String(report.reportName), mode === ExecutionMode.GROUP, deletionTime);
	}

	// Post-response tasks: run after response is sent, errors must not propagate
	// (calling next(error) after res.json() causes "headers already sent" and can drop the response)
	try {
		await reportService.updateLatestTestStatus(report as unknown as ReportDoc, mode);
		await postCommentsToTrackers(report, (parameters.stories ?? [reportResult.story]) as Story[], mode, user, parameters);
	} catch (postResponseError: unknown) {
		logger.error(`Post-response processing error (response already sent): ${postResponseError instanceof Error ? postResponseError.message : String(postResponseError)}`);
	}
}


/**
 * Initiates a test run for a single feature/story.
 */
export async function runFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const storyId = requireValidId(param(req, 'issueID'), 'story ID');

		const story = await storyService.getOneStory(storyId);
		if (!story)
			throw AppError.notFound('Story not found');

		// TODO: Determine repoId if needed for global settings lookup
		// Assuming req.body might contain repositoryId or we fetch it based on story?
		const repoId = (req.body as Record<string, unknown>).repositoryId as string; // Adjust as needed
		const parameters = { repositoryId: repoId, stories: [story] };

		const reportResult = await testRunnerService.executeTest(req as unknown as ExecuteTestRequest, ExecutionMode.STORY, story);
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
		const storyId = requireValidId(param(req, 'issueID'), 'story ID');
		const scenarioId = param(req, 'scenarioId');

		// Scenario ID is numeric in the model
		if (!scenarioId || isNaN(parseInt(scenarioId)))
			throw AppError.badRequest('Invalid Scenario ID format');

		const story = await storyService.getOneStory(storyId);
		if (!story)
			throw AppError.notFound('Story not found');

		if (!story.scenarios.some(s => s.scenario_id === parseInt(scenarioId)))
			throw AppError.notFound('Scenario not found in story');

		// TODO: Determine repoId if needed
		const repoId = (req.body as Record<string, unknown>).repositoryId as string;
		const parameters = { repositoryId: repoId, stories: [story] };

		const reportResult = await testRunnerService.executeTest(req as unknown as ExecuteTestRequest, ExecutionMode.SCENARIO, story);
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
		// The predefined-group endpoint carries the repository ID in its URL, not its body.
		const repoId = requireValidId(param(req, 'repoID'), 'repository ID');
		const groupId = requireValidId(param(req, 'groupID'), 'group ID');

		(req.body as Record<string, unknown>).repositoryId = repoId;

		const group = await repositoryService.getOneStoryGroup(repoId, groupId);
		if (!group)
			throw AppError.notFound('Group not found');

		// LOGGING: Log member_stories to debug "No valid stories found" error
		const memberStoryIds = group.member_stories.map((id: unknown) => {
			const rawType = typeof id;
			let hexString: string | undefined;
			let safeString: string;
			if (rawType === 'object' && id !== null) 
				try {
					const oid = id as { toHexString?: () => string; toString?: () => string };
					hexString = oid.toHexString?.();
					safeString = oid.toString?.() ?? '[object]';
				} catch {
					safeString = '[object]';
				}
			else {
				safeString = String(id);
			}
			
			return { raw: id, type: rawType, string: safeString, hex: hexString };
		});
		logger.info(`runGroup: Group '${group.name}' has ${group.member_stories.length} member_stories: ${JSON.stringify(memberStoryIds)}`);

		// Resolve member_stories to actual Story objects
		const stories: (Story | null)[] = await Promise.all(
			group.member_stories.map(async (id: unknown) => {
				let storyIdStr: string;
				const rawType = typeof id;

				// Handle ObjectId instances from MongoDB
				if (rawType === 'object' && id !== null) 
					try {
						const oid = id as { toHexString?: () => string; toString?: () => string };
						// Try toHexString() first (MongoDB ObjectId), fallback to toString(),
						// then JSON.stringify() for objects without toString — prevents leaking '[object Object]'
						storyIdStr = oid.toHexString?.() ?? oid.toString?.() ?? JSON.stringify(id);
					} catch {
						storyIdStr = JSON.stringify(id);
					}
				else 
					storyIdStr = String(id);
				
				logger.debug(`runGroup: Looking up story by ID '${storyIdStr}' (raw type: ${rawType})`);
				const story = await storyService.getOneStory(storyIdStr);
				if (!story) 
					logger.warn(`runGroup: Story ID '${storyIdStr}' not found in database`);
				
				return story;
			})
		);
		const validStories = stories.filter(s => s !== null);
		logger.info(`runGroup: Found ${validStories.length} valid story(es) for group '${group.name}'`);
		if (validStories.length === 0) {
			logger.error(`runGroup: No valid stories for group '${group.name}' (member_stories: ${JSON.stringify(group.member_stories.map(id => ({ type: typeof id, value: String(id) })))})`);
			throw AppError.badRequest('No valid stories found in the group');
		}

		// Use group name for report directory, ensuring it's filesystem-safe
		(req.body as Record<string, unknown>).name = featureFileService.cleanFileName(`group_${group.name}_${Date.now()}`);
		fs.mkdirSync(path.join(process.cwd(), 'features', (req.body as Record<string, unknown>).name as string), { recursive: true });

		const parameters = { ...group, repositoryId: repoId, stories: validStories, repository: (req.body as Record<string, unknown>).repository }; // Pass necessary info
		let lastReportResult: TestExecutionResult | undefined;

		if (group.isSequential) 
			for (const story of validStories) 
				lastReportResult = await testRunnerService.executeTest(req as unknown as ExecuteTestRequest, ExecutionMode.GROUP, story);
            
		else {
			const results = await Promise.all(
				validStories.map(story => testRunnerService.executeTest(req as unknown as ExecuteTestRequest, ExecutionMode.GROUP, story))
			);
			lastReportResult = results.pop();
		}
        
		// `lastReportResult` is guaranteed set: `validStories` is non-empty (checked above)
		await handleReportResult(res, lastReportResult!, ExecutionMode.GROUP, parameters, req.user as User);

	} catch (error) {
		next(error);
	}
}

/**
 * Initiates a test run for a temporary, dynamically defined group of stories.
 */
export async function runTempGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const body = req.body as Record<string, unknown>;
		const tempGroup = body.group as { member_stories?: Story[]; isSequential?: boolean; [key: string]: unknown } | undefined;
		const repoInfo = extractRunParams(req); // Contains repoId and potentially repository name
		const validStories = (tempGroup?.member_stories ?? []).filter((s: Story | null) => s !== null);

		if (validStories.length === 0)
			throw AppError.badRequest('No valid stories provided in the temporary group');

		body.name = featureFileService.cleanFileName(`temp_group_${Date.now()}`);
		fs.mkdirSync(path.join(process.cwd(), 'features', body.name as string), { recursive: true });

		const parameters = { ...tempGroup, repositoryId: repoInfo.repoId, stories: validStories, repository: repoInfo.repositoryName };
		let lastReportResult: TestExecutionResult | undefined;

		if (tempGroup?.isSequential) 
			for (const story of validStories) 
				lastReportResult = await testRunnerService.executeTest(req as unknown as ExecuteTestRequest, ExecutionMode.GROUP, story);
            
		else {
			const results = await Promise.all(
				validStories.map(story => testRunnerService.executeTest(req as unknown as ExecuteTestRequest, ExecutionMode.GROUP, story))
			);
			lastReportResult = results.pop();
		}

		// `lastReportResult` is guaranteed set: `validStories` is non-empty (checked above)
		await handleReportResult(res, lastReportResult!, ExecutionMode.GROUP, parameters, req.user as User);

	} catch (error) {
		next(error);
	}
}

// --- Issue Tracker Communication ---
async function postCommentsToTrackers(finalReport: Record<string, unknown>, stories: Story[], mode: ExecutionMode, user?: User, parameters?: Record<string, unknown>) {
	if (!user) return; // Need user for credentials

	// Check global settings for commenting preference
	const repoSettings = parameters?.repositoryId ? await repositoryService.getRepoSettingsById(parameters.repositoryId as string) : null;
	if (repoSettings?.reportComment === false) {
		const repoIdStr = parameters?.repositoryId;
		logger.info(`Report comments disabled for repository ${typeof repoIdStr === 'string' ? repoIdStr : 'unknown'}`);
		return; // Skip posting comments if disabled globally
	}

	for (const story of stories) 
		try {
			const issueTracker = IssueTracker.getIssueTracker(story.storySource as IssueTrackerOption);
			if (story.storySource as IssueTrackerOption === IssueTrackerOption.NONE) continue;

			const scenarioId = finalReport.scenarioId as number | undefined;
			const comment = issueTracker.reportText(finalReport as unknown as GenericReport, mode === ExecutionMode.SCENARIO ? story.scenarios.find(s=> s.scenario_id === scenarioId)?.name ?? 'Unknown Scenario' : story.title);

			if ((story.storySource as IssueTrackerOption) === IssueTrackerOption.GITHUB) {
				if (!parameters?.repository) {
					logger.warn(`Cannot post GitHub comment for story ${story.title}: Missing repository name.`);
					continue;
				}
				const [repoUser, repoName] = (parameters.repository as string).split('/');
				if (!repoUser || !repoName || !story.issue_number) continue;

				issueTracker.postComment(comment, { issueId: story.issue_number.toString(), repoUser, repoName }, user.github);
				if (mode === ExecutionMode.STORY)  // Update label only on full feature run
					if (user.github)
						(issueTracker as Github).updateLabel(finalReport.status as boolean, { issueId: story.issue_number.toString(), repoUser, repoName }, user.github.githubToken);
                

			} else if ((story.storySource as IssueTrackerOption) === IssueTrackerOption.JIRA && user.jira) {
				if (!story.issue_number) continue;
				issueTracker.postComment(comment, { issueId: story.issue_number.toString() }, user.jira);
			}
		} catch (commentError: unknown) {
			logger.error(`Failed to post comment for story ${story.title} (${story.storySource}): ${commentError instanceof Error ? commentError.message : String(commentError)}`);
		}
    
}
