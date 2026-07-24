import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as repositoryService from '../services/repository.service';
import * as storyService from '../services/story.service';
import * as testRunnerService from '../testing/test-runner.service';
import * as reportService from '../services/report.service';
import * as featureFileService from '../services/feature-file.service';
import { Story } from '@shared/models/Story';
import fs from 'fs';
import path from 'path';
import { GroupReport, ExecutionMode, PassedCount } from '../models/models';

/**
 * Handles the execution of a sanity test for a specific group.
 * Fetches group and stories, executes tests, analyzes results,
 * and returns a formatted notification string.
 */
export async function runSanityTest(req: Request, res: Response, next: NextFunction): Promise<void> {
	let sanityFolderName: string | undefined;
	try {
		const { repoID, groupID } = req.params;
		if (!ObjectId.isValid(repoID) || !ObjectId.isValid(groupID)) {
			res.status(400).json({ error: 'Invalid repository or group ID format' });
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

		// --- Test Execution Logic (adapted from original runSanityReport) ---
		// Prepare request body/params for testRunnerService
		sanityFolderName = featureFileService.cleanFileName(`sanity_${group.name}_${Date.now()}`);
		const testReq = {
			...req,
			body: {
				...group,
				name: sanityFolderName,
				repositoryId: repoID
			},
			params: { // Simulate params if executeTest needs them
				// issueID etc. might not be relevant here, check executeTest needs
			}
		};

		fs.mkdirSync(path.join(process.cwd(), 'features', testReq.body.name), { recursive: true });

		let lastReportResult: any;
		const parameters = { ...group, repositoryId: repoID, stories: validStories }; // Info needed for analysis/reporting

		if (group.isSequential) 
			for (const story of validStories) 
				lastReportResult = await testRunnerService.executeTest(testReq as any, ExecutionMode.GROUP, story);
            
		else {
			const results = await Promise.all(
				validStories.map(story => testRunnerService.executeTest(testReq as any, ExecutionMode.GROUP, story))
			);
			lastReportResult = results.pop();
		}

		if (!lastReportResult || !lastReportResult.reportName) 
			throw new Error('Sanity test execution failed to produce a valid report result.');
        

		// --- Report Analysis & Response (adapted from original runSanityReport) ---
		const finalReport = await reportService.resolveAndSaveReport(lastReportResult, ExecutionMode.GROUP, validStories, parameters);

		// Format the specific notification string
		const notificationText = formatSanityNotification(finalReport);
		res.status(200).send(notificationText);

		// Update status and schedule deletion (no HTML needed for client)
		await reportService.updateLatestTestStatus(finalReport, ExecutionMode.GROUP);
		const deletionTime = parseInt(process.env.REPORT_DELETION_TIME || '5') * 60000;
		reportService.scheduleReportDeletion(finalReport.reportName, true, deletionTime); // isGroup = true

	} catch (error) {
		if (sanityFolderName && fs.existsSync(path.join(process.cwd(), 'features', sanityFolderName))) 
			fs.rm(path.join(process.cwd(), 'features', sanityFolderName), { recursive: true, force: true }, (err) => {
				if (err) console.error('Error cleaning up sanity test folder on failure:', err);
			});
        
		next(error);
	}
}

/**
 * Formats the sanity test result into a notification string.
 * (Moved from original sanityTest.js)
 */
function formatSanityNotification(report: GroupReport): string {
	// Ensure report structure matches expected GroupReport
	const scenarios: PassedCount = report.scenariosTested || { passed: 0, failed: 0 };
	const steps = report.groupTestResults || { passedSteps: 0, failedSteps: 0, skippedSteps: 0 };
	const totalScenarios = scenarios.passed + scenarios.failed;
	const totalSteps = steps.passedSteps + steps.failedSteps + steps.skippedSteps;

	const notificationText = `
Scenarios: ${scenarios.failed} failed, ${scenarios.passed} passed, ${totalScenarios} total
Steps: ${steps.failedSteps} failed, ${steps.passedSteps} passed, ${steps.skippedSteps} skipped, ${totalSteps} total
`;
	return notificationText.trim();
}