import { ObjectId, GridFSBucket } from 'mongodb';
import * as dbConnection from '../database/DbConnector';
import { Readable } from 'node:stream';
import { text as streamToText } from 'node:stream/consumers';
import fs from 'node:fs';
import pfs from 'node:fs/promises';
import path from 'node:path';
import reporter from 'cucumber-html-reporter'; // Import the reporter
import { ReportContainer } from '@shared/models/ReportContainer';
import * as storyService from './story.service';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import {
	GenericReport, StoryReport, ScenarioReport, GroupReport, PassedCount, StepStatus, ExecutionMode, ScenarioStatus
} from '../models/models';
import { oid } from '../types/mongo.types';

const ReportDataCollection = 'ReportData';
const ReportsCollection = 'Reports';
const reportPathBase = path.join(process.cwd(), 'features'); // Base path for reports

// --- Report CRUD Functions ---

/**
 * Fetches all report metadata for a specific story, excluding the large JSON report data.
 * @param storyId The ObjectId of the story.
 * @returns A promise that resolves to an array of report metadata objects.
 */
export async function getTestReports(storyId: string): Promise<any[]> {
	const db = dbConnection.getConnection();
	const oid = new ObjectId(storyId);
	// StoryReports use 'featureId', ScenarioReports use 'storyId' — query both
	return await db.collection(ReportDataCollection)
		.find({ $or: [{ storyId: oid }, { featureId: oid }] }, { projection: { jsonReport: 0, reportOptions: 0, json: 0 } })
		.toArray();
}

/**
 * Fetches all group report metadata that include a specific story.
 * @param storyId The ObjectId of the story.
 * @returns A promise that resolves to an array of group report metadata objects.
 */
export async function getGroupTestReports(storyId: string): Promise<any[]> {
	const db = dbConnection.getConnection();
	const query = { storyStatuses: { $elemMatch: { storyId: new ObjectId(storyId) } } };
	return await db.collection(ReportDataCollection)
		.find(query, { projection: { jsonReport: 0, reportOptions: 0, json: 0 } })
		.toArray();
}

/**
 * Retrieves a full report, including the JSON data from either a collection or GridFS.
 * @param reportId The ObjectId of the report metadata document.
 * @returns The full report object with jsonReport data.
 */
export async function getReportById(reportId: string): Promise<any> {
	const db = dbConnection.getConnection();
	const reportData = await db.collection(ReportDataCollection).findOne({ _id: new ObjectId(reportId) });
	if (!reportData) 
		throw new Error('Report data not found');
    
	return await getReportFromDB(reportData);
}

/**
 * Retrieves a full report by its unique report name.
 * @param reportName The name of the report.
 * @returns The full report object with jsonReport data.
 */
export async function getReportByName(reportName: string): Promise<any> {
	const db = dbConnection.getConnection();
	const reportData = await db.collection(ReportDataCollection).findOne({ reportName });
	if (!reportData) 
		throw new Error('Report data not found');
    
	return await getReportFromDB(reportData);
}


/**
 * Fetches the report metadata document by its ID.
 * @param reportId The ObjectId of the report.
 * @returns The report metadata object.
 */
export async function getReportDataById(reportId: string): Promise<any> {
	const db = dbConnection.getConnection();
	return await db.collection(ReportDataCollection).findOne({ _id: new ObjectId(reportId.toString()) });
}

/**
 * Uploads a report. Stores large reports in GridFS and smaller ones in a dedicated collection.
 * @param reportResults The report object to be stored.
 * @returns The original report object, augmented with database IDs.
 */
export async function uploadReport(reportResults: any): Promise<any> {
	const db = dbConnection.getConnection();
	const reportData = { ...reportResults }; // Create a mutable copy

	const jsonFilePath = reportResults.reportOptions?.jsonFile;
	if (!jsonFilePath || !fs.existsSync(jsonFilePath)) {
		// No readable JSON report (generation failed or file missing) — store metadata only
		console.warn(`Report JSON not available at ${jsonFilePath}, storing metadata only`);
		await db.collection(ReportDataCollection).insertOne(reportData);
		return reportData;
	}

	const data = await fs.promises.readFile(jsonFilePath, 'utf8');
	const jReport = { jsonReport: data, created: new Date() };
	const len = Buffer.byteLength(JSON.stringify(data));

	if (len >= 16000000) { // Threshold for GridFS
		const bigReportId = await uploadBigJsonData(jReport, reportResults.storyId);
		reportData.bigReport = bigReportId;
	} else {
		const smallReportResult = await db.collection(ReportsCollection).insertOne(jReport);
		reportData.smallReport = smallReportResult.insertedId;
	}

	await db.collection(ReportDataCollection).insertOne(reportData);
	return reportData;
}

/**
 * Deletes a report's metadata and its associated data from either GridFS or the reports collection.
 * @param reportId The ObjectId of the report to delete.
 */
export async function deleteReport(reportId: string): Promise<any> {
	const db = dbConnection.getConnection();
	const collection = db.collection(ReportDataCollection);
	const reportData = await collection.findOne({ _id: new ObjectId(reportId) });
	if (!reportData) 
		throw new Error('Report to delete not found');
    

	if (reportData.smallReport) 
		await db.collection(ReportsCollection).deleteOne({ _id: new ObjectId(reportData.smallReport) });
	else if (reportData.bigReport) {
		const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });
		await bucket.delete(new ObjectId(reportData.bigReport));
	}

	return await collection.deleteOne({ _id: new ObjectId(reportId) });
}

/**
 * Sets the 'isSaved' flag for a report.
 * @param testReportId The ObjectId of the report.
 * @param isSaved The boolean value to set.
 */
export async function setIsSavedTestReport(testReportId: string, isSaved: boolean): Promise<any> {
	const db = dbConnection.getConnection();
	return db.collection(ReportDataCollection).updateOne(
		{ _id: new ObjectId(testReportId) },
		{ $set: { isSaved } }
	);
}

// --- Report History & Status Updates (Moved from serverHelper) ---

/**
 * Fetches and prunes the report history for a given story.
 * @param storyId The ID of the story to get the history for.
 * @returns An object containing arrays of different report types.
 */
export async function getReportHistory(storyId: string): Promise<ReportContainer> {
	const groupReports = await getGroupTestReports(storyId);
	const nonGroupReports = await getTestReports(storyId);

	const storyReports = nonGroupReports.filter(r => r.mode === 'feature');
	const scenarioReports = nonGroupReports.filter(r => r.mode === 'scenario');
    
	const prunedStoryReports = await deleteOldReports(storyReports);
	const prunedScenarioReports = await deleteOldReports(scenarioReports);
	const prunedGroupReports = await deleteOldReports(groupReports);

	return { storyReports: prunedStoryReports, scenarioReports: prunedScenarioReports, groupReports: prunedGroupReports };
}

/**
 * Updates the last test status for stories and scenarios based on a test run.
 * @param uploadedReport The report object from the completed test run.
 * @param mode The mode in which the test was run.
 */
export async function updateLatestTestStatus(uploadedReport: any, mode: ExecutionMode): Promise<void> {
	switch (mode) {
		case ExecutionMode.SCENARIO:
			await updateScenarioTestStatus(uploadedReport);
			break;
		case ExecutionMode.STORY:
			{
				// Prepare all update promises for the feature and its scenarios
				const updatePromises: Promise<any>[] = [];

				// Promise to update the overall story status
				updatePromises.push(storyService.updateStoryStatus(uploadedReport.featureId, uploadedReport.status));

				// Promises to update each scenario's status within the story
				for (const scenarioStatus of uploadedReport.scenarioStatuses) 
					updatePromises.push(
						storyService.updateScenarioStatus(uploadedReport.featureId, scenarioStatus.scenarioId, scenarioStatus.status)
					);
                

				// Execute all updates concurrently and wait for them to finish
				await Promise.all(updatePromises);
			}
			break;
		case ExecutionMode.GROUP:
			{
				// Prepare all update promises for all stories and their scenarios in the group
				const updatePromises: Promise<any>[] = [];

				for (const storyStatus of uploadedReport.storyStatuses) {
					// Promise to update the overall status of each story in the group
					updatePromises.push(storyService.updateStoryStatus(storyStatus.storyId, storyStatus.status));

					// Promises to update the status of each scenario within each story
					for (const scenarioStatus of storyStatus.scenarioStatuses) 
						updatePromises.push(
							storyService.updateScenarioStatus(storyStatus.storyId, scenarioStatus.scenarioId, scenarioStatus.status)
						);
                    
				}

				// Execute all updates concurrently and wait for them to finish
				await Promise.all(updatePromises);
			}
			break;
	}
}


// --- Helper Functions ---

async function getReportFromDB(reportData: any): Promise<any> {
	const db = dbConnection.getConnection();
	let result: any;

	if (reportData.smallReport) {
		const reportJson = await db.collection(ReportsCollection).findOne({ _id: reportData.smallReport });
		result = { _id: reportData._id, jsonReport: reportJson?.jsonReport };
	} else if (reportData.bigReport) {
		const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });
		const reportString = await streamToText(bucket.openDownloadStream(new ObjectId(reportData.bigReport.toString())));
		const reportJson = JSON.parse(reportString);
		result = { _id: reportData._id, jsonReport: reportJson.jsonReport };
	} else 
		throw new Error(`Report ${reportData._id} has neither a smallReport nor a bigReport reference.`);
    
	return result;
}

async function uploadBigJsonData(data: any, fileName: string): Promise<ObjectId> {
	const db = dbConnection.getConnection();
	const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });
	const id = new ObjectId();

	return new Promise((resolve, reject) => {
		Readable.from(JSON.stringify(data))
			.pipe(bucket.openUploadStreamWithId(id, fileName))
			.on('error', (error: Error) => reject(error))
			.on('finish', () => resolve(id));
	});
}

/**
 * Prunes old, unsaved reports, keeping a configured amount of the latest ones.
 * @param reports An array of report documents.
 * @returns The pruned array of reports.
 */
async function deleteOldReports(reports: any[]): Promise<any[]> {
	const keepReportAmount = parseInt(process.env.MAX_SAVED_REPORTS || '10', 10);
    
	// Sort reports by time, newest first
	reports.sort((a, b) => b.reportTime - a.reportTime);

	// Step 1: What to delete.
	const reportsToDelete = reports.filter(r => !r.isSaved).slice(keepReportAmount);

	// Step 2: What to keep.
	const reportsToKeep = reports.filter(r => r.isSaved || reports.indexOf(r) < keepReportAmount);

	// Step 3: Delete on parallel.
	const deletionPromises = reportsToDelete.map(report => deleteReport(report._id.toString()));
	await Promise.all(deletionPromises);
        
	return reportsToKeep;
}

async function updateScenarioTestStatus(uploadedReport: any): Promise<void> {
	let storyStatus = uploadedReport.status;
	// If the scenario passed, we need to check if this makes the whole story pass.
	if (uploadedReport.status === true) {
		const story = await storyService.getOneStory(uploadedReport.storyId);
		if (story) {
			const scenarioIndex = story.scenarios.findIndex(scen => scen.scenario_id === uploadedReport.scenarioId);
			if (scenarioIndex > -1) story.scenarios[scenarioIndex].lastTestPassed = true;
			// The whole story is considered passed only if ALL its scenarios have passed.
			storyStatus = story.scenarios.every(scen => scen.lastTestPassed === true);
		}
	}
	await storyService.updateStoryStatus(uploadedReport.storyId, storyStatus);
	await storyService.updateScenarioStatus(uploadedReport.storyId, uploadedReport.scenarioId, uploadedReport.status);
}


// ####### --- Migrated from reporting.ts --- ########

// --- Report Generation Options (from reporting.ts) ---
const baseHtmlReporterOptions = {
	theme: 'bootstrap',
	// jsonFile/jsonDir will be set dynamically
	output: '', // Will be set dynamically
	reportSuiteAsScenarios: true,
	launchReport: false,
	storeScreenshots: false,
	screenshotsDirectory: path.join(reportPathBase, 'screenshots/'), // Use path.join
	metadata: {
		'App Version': '1.8.1', // Consider reading from package.json
		'Test Environment': 'STAGING', // Make configurable?
		Parallel: 'Scenarios',
		Executed: 'Remote'
	}
};

function setHtmlOptions(reportName: string, jsonPath: string, isGroup: boolean = false): reporter.Options {
	const myOptions = JSON.parse(JSON.stringify(baseHtmlReporterOptions));
	myOptions.metadata.Platform = process.platform;
	myOptions.name = `Seed-Test Report: ${reportName}`;
	const outputPath = path.join(path.dirname(jsonPath), `${reportName}.html`); // Place HTML next to JSON

	if (isGroup) {
		myOptions.jsonDir = path.dirname(jsonPath); // Directory containing multiple JSONs
		myOptions.jsonFile = null; // Important for jsonDir mode
	} else {
		myOptions.jsonFile = jsonPath; // Path to the single JSON file
		myOptions.jsonDir = null;
	}
	myOptions.output = outputPath;
	return myOptions;
}

/**
 * Validates JSON report files in a directory. Replaces corrupt/truncated files with
 * a minimal valid Cucumber JSON so the reporter still shows them as "undefined"
 * instead of crashing. Returns the count of files (valid + repaired).
 */
function validateReportJsonFiles(dirPath: string): number {
	const jsonFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
	for (const file of jsonFiles) {
		const filePath = path.join(dirPath, file);
		try {
			JSON.parse(fs.readFileSync(filePath, 'utf8'));
		} catch {
			console.warn(`Repairing corrupt report JSON (truncated test output): ${file}`);
			// Replace with minimal valid Cucumber JSON — shows as "undefined" in the HTML report
			const placeholder = JSON.stringify([{
				keyword: 'Feature',
				name: `Unknown (corrupt report: ${file})`,
				uri: file.replace('.json', '.feature'),
				elements: [{
					keyword: 'Scenario',
					name: 'Unknown (report data truncated)',
					type: 'scenario',
					steps: [{
						keyword: 'Given ',
						name: 'scenario report was truncated',
						result: { status: 'undefined', duration: 0 }
					}]
				}]
			}]);
			fs.writeFileSync(filePath, placeholder, 'utf8');
		}
	}
	return jsonFiles.length;
}

// ######## Analysis Functions ##########

/**
 * Generates the HTML report from a JSON report file.
 * @param reportName - The base name for the report.
 * @param jsonPath - The full path to the cucumber JSON report file.
 * @param isGroup - Indicates if this is a group report (jsonDir mode).
 * @returns The options used for generation.
 */
export function generateHtmlReport(reportName: string, jsonPath: string, isGroup: boolean = false): reporter.Options | null {
	const reportOptions = setHtmlOptions(reportName, jsonPath, isGroup);
	try {
		if (isGroup) {
			// Validate JSON files before generation — removes truncated files that would crash the reporter
			const groupDir = reportOptions.jsonDir ?? path.dirname(jsonPath);
			const validCount = validateReportJsonFiles(groupDir);
			if (validCount === 0) {
				console.error(`No valid JSON report files found for group ${reportName}`);
				return null;
			}
		} else {
			// Validate single JSON file before generation
			JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
		}
		reporter.generate(reportOptions);
		console.log(`Generated HTML report at: ${reportOptions.output}`);
		return reportOptions;
	} catch (e) {
		console.error(`Could not generate HTML Report for ${reportName}. Error:`, e);
		return null;
	}
}

/**
 * Analyzes the cucumber JSON report, generates HTML, saves to DB.
 * @param reportResult - Basic result object from test execution (reportName, reportTime, story?, success?).
 * @param mode - The mode the test was run in.
 * @param stories - Array of stories involved in the test run.
 * @param executionParams - Parameters used for the test run (e.g., group name).
 * @returns The final report object after analysis and DB insertion.
 */
export async function resolveAndSaveReport(reportResult: any, mode: ExecutionMode, stories: Story[], executionParams: any): Promise<any> {
	let reportName = reportResult.reportName;
	let jsonPath: string;
	let isGroupReport = false;
	let analysisResult: GenericReport | StoryReport | ScenarioReport | GroupReport;

	if (mode === ExecutionMode.GROUP) {
		const groupDirName = executionParams.name; // The directory name created in controller
		jsonPath = path.join(reportPathBase, groupDirName, `${groupDirName}.html.json`); // Path for combined group JSON
		isGroupReport = true;
		// Generate HTML report — pass jsonPath so setHtmlOptions derives the correct group directory
		generateHtmlReport(groupDirName, jsonPath, true);
		analysisResult = await analyzeGroupReport(groupDirName, stories, jsonPath);
		reportName = groupDirName; // Use the group name as the final report name
	} else {
		jsonPath = path.join(reportPathBase, `${reportName}.json`);
		generateHtmlReport(reportName, jsonPath, false);
		if (mode === ExecutionMode.SCENARIO)
			analysisResult = await analyzeScenarioReport(stories, reportName, parseInt(reportResult.scenarioId, 10), jsonPath);
		else  // ExecutionMode.STORY
			analysisResult = await analyzeStoryReport(stories, reportName, jsonPath);

	}

	// Add common fields
	analysisResult.reportTime = reportResult.reportTime;
	analysisResult.mode = mode;
	analysisResult.reportOptions = setHtmlOptions(reportName, jsonPath, isGroupReport);
	// For group reports, jsonFile is null in reportOptions (jsonDir mode) — set it explicitly
	// so uploadReport knows which JSON to read
	if (isGroupReport)
		analysisResult.reportOptions.jsonFile = jsonPath;

	// Upload the final analysis result to DB
	const uploadedReport = await uploadReport(analysisResult);
	return uploadedReport;
}

/**
 * Schedules the deletion of report files (JSON, HTML) after a specified delay.
 * Also handles deletion of group directories.
 * @param reportName - The base name of the report or the group directory name.
 * @param isGroup - True if it's a group report (delete directory), false otherwise (delete files).
 * @param delayMs - Delay in milliseconds before deletion.
 */
export function scheduleReportDeletion(reportName: string, isGroup: boolean, delayMs: number): void {
	if (isGroup) {
		// Schedule deletion of the entire group directory
		const dirPath = path.join(reportPathBase, reportName);
		setTimeout(() => {
			fs.rm(dirPath, { recursive: true, force: true }, (err) => {
				if (err) console.error(`Error deleting group report directory ${dirPath}:`, err);
				else console.log(`Group report directory ${dirPath} deleted after timeout.`);
			});
		}, delayMs);
	} else {
		// Schedule deletion of individual JSON and HTML files
		const jsonPath = path.join(reportPathBase, `${reportName}.json`);
		const htmlPath = path.join(reportPathBase, `${reportName}.html`);
		setTimeout(() => deleteReportFile(jsonPath), delayMs);
		setTimeout(() => deleteReportFile(htmlPath), delayMs);
	}
}

// --- Analysis Helper Functions (Migrated from reporting.ts) ---

async function analyzeStoryReport(stories: Story[], reportName: string, jsonPath: string): Promise<StoryReport> {
	const reportResults = new StoryReport(); // Use interface/class from shared models
	reportResults.reportName = reportName;
	reportResults.featureId = stories[0]._id!; // Assuming only one story

	try {
		const data = await pfs.readFile(jsonPath, 'utf8');
		const cucumberReport: any[] = JSON.parse(data);
		if (cucumberReport.length === 0) throw new Error('Cucumber JSON report is empty.');

		const storyReport = cucumberReport[0]; // Assuming one feature per file
		const story = stories[0];
		const result = featureResult(storyReport, story);

		reportResults.status = result.status;
		reportResults.scenariosTested = result.scenariosTested;
		reportResults.featureTestResults = result.featureTestResults;
		reportResults.scenarioStatuses = result.scenarioStatuses;
		return reportResults;

	} catch (error: any) {
		console.error(`Error analyzing story report ${reportName}:`, error);
		reportResults.status = false;
		return reportResults; // Return default error state
	}
}

async function analyzeScenarioReport(stories: Story[], reportName: string, scenarioId: number, jsonPath: string): Promise<ScenarioReport> {
	const reportResults = new ScenarioReport(); // Use interface/class from shared models
	reportResults.reportName = reportName;
	// ScenarioReport.storyId is typed as number but stores an ObjectId at runtime
	reportResults.storyId = oid(stories[0]._id!) as any;
	reportResults.scenarioId = scenarioId;

	try {
		const data = await pfs.readFile(jsonPath, 'utf8');
		const cucumberReport: any[] = JSON.parse(data);
		if (cucumberReport.length === 0) throw new Error('Cucumber JSON report is empty.');

		const storyReport = cucumberReport[0];
		const story = stories[0];

		// Find the specific scenario report element (Cucumber might add hooks as elements)
		const scenarioReportElement = storyReport.elements.find((el: any) => el.type === 'scenario' && el.name === story.scenarios.find(s=> s.scenario_id === scenarioId)?.name);
		if (!scenarioReportElement) throw new Error(`Scenario element not found in report for scenario ID ${scenarioId}`);

		const scenario = story.scenarios.find(scen => scen.scenario_id == scenarioId);
		if (!scenario) throw new Error(`Scenario data not found for ID ${scenarioId}`);

		const result = scenarioResult(scenarioReportElement, scenario);

		reportResults.status = result.status;
		reportResults.scenariosTested = { passed: +result.status, failed: +!result.status };
		reportResults.featureTestResults = result.stepResults; // Use stepResults as overall feature result for single scenario
		reportResults.scenarioStatuses = [result]; // Array with one element

		return reportResults;

	} catch (error: any) {
		console.error(`Error analyzing scenario report ${reportName}:`, error);
		reportResults.status = false;
		return reportResults; // Return default error state
	}
}

export async function analyzeGroupReport(groupName: string, stories: Story[], jsonPath: string): Promise<GroupReport> {
	const reportResults = new GroupReport(); // Use interface/class from shared models
	reportResults.reportName = groupName;

	try {
		const data = await pfs.readFile(jsonPath, 'utf8');
		const cucumberReport: any[] = JSON.parse(data); // Array of feature reports

		const scenariosTested = new PassedCount();
		let overallPassedSteps = 0;
		let overallFailedSteps = 0;
		let overallSkippedSteps = 0;

		reportResults.storyStatuses = [];

		// Map stories by ID for easier lookup
		const storyMap = new Map(stories.map(s => [s._id!.toString(), s]));

		for (const storyReport of cucumberReport) {
			// Find the corresponding story data using feature tags or names
			// Cucumber JSON might store feature ID/name differently, adjust matching logic if needed
			const storyIdMatch = storyReport.uri?.match(/_([a-f0-9]{24})\.feature$/)?.[1]; // Extract ID from URI if possible
			const story = storyIdMatch ? storyMap.get(storyIdMatch) : stories.find(s => s.title === storyReport.name); // Fallback to name match

			if (!story) {
				console.warn(`Could not find matching story data for report feature: ${storyReport.name}`);
				continue; // Skip if no matching story data
			}

			const result = featureResult(storyReport, story);
			reportResults.storyStatuses.push(result);

			overallPassedSteps += result.featureTestResults.passedSteps;
			overallFailedSteps += result.featureTestResults.failedSteps;
			overallSkippedSteps += result.featureTestResults.skippedSteps;
			scenariosTested.passed += result.scenariosTested.passed;
			scenariosTested.failed += result.scenariosTested.failed;
		}

		reportResults.status = testPassed(overallFailedSteps, overallPassedSteps);
		reportResults.groupTestResults = { passedSteps: overallPassedSteps, failedSteps: overallFailedSteps, skippedSteps: overallSkippedSteps };
		reportResults.scenariosTested = scenariosTested;
		// reportResults.storiesTested = stories; // Maybe don't store full stories in DB report

		return reportResults;
	} catch (error: any) {
		console.error(`Error analyzing group report ${groupName}:`, error);
		reportResults.status = false;
		return reportResults;
	}
}

function featureResult(featureReport: any, feature: Story): any { // Define a proper return type later
	const storyId = feature._id;
	const featureStatus = {
		storyId,
		status: false,
		scenarioStatuses: [] as ScenarioStatus[],
		featureTestResults: new StepStatus(),
		scenariosTested: new PassedCount()
	};

	let featurePassedSteps = 0;
	let featureFailedSteps = 0;
	let featureSkippedSteps = 0;

	// Filter out potential hook results ('before all' / 'after all')
	const scenarioElements = featureReport.elements.filter((el: any) => el.type === 'scenario');

	for (const scenReport of scenarioElements) {
		// Match scenario report element to scenario data
		// Using tags is more robust if available: @storyId_scenarioId
		const tagMatch = scenReport.tags?.map((t: any) => t.name).find((n: string) => n.startsWith(`@${storyId}_`));
		const scenarioId = tagMatch ? parseInt(tagMatch.split('_').pop()!, 10) : null;
		const scenario = scenarioId ? feature.scenarios.find(s => s.scenario_id === scenarioId) : feature.scenarios.find(s => s.name === scenReport.name); // Fallback to name

		if (!scenario) {
			console.warn(`Could not find matching scenario data for report element: ${scenReport.name}`);
			continue;
		}

		const result = scenarioResult(scenReport, scenario);

		featurePassedSteps += result.stepResults.passedSteps;
		featureFailedSteps += result.stepResults.failedSteps;
		featureSkippedSteps += result.stepResults.skippedSteps;
		featureStatus.scenarioStatuses.push(result);

		if (result.status) featureStatus.scenariosTested.passed++;
		else featureStatus.scenariosTested.failed++;
	}

	featureStatus.featureTestResults = { passedSteps: featurePassedSteps, failedSteps: featureFailedSteps, skippedSteps: featureSkippedSteps };
	featureStatus.status = testPassed(featureFailedSteps, featurePassedSteps);
	return featureStatus;
}

function scenarioResult(scenarioReport: any, scenario: Scenario): ScenarioStatus {
	const scenarioId = scenario.scenario_id;
	let scenarioPassedSteps = 0;
	let scenarioFailedSteps = 0;
	let scenarioSkippedSteps = 0;

	for (const step of scenarioReport.steps) 
		switch (step.result?.status) { // Add safe navigation ?.
			case 'passed': scenarioPassedSteps++; break;
			case 'failed': scenarioFailedSteps++; break;
			case 'skipped': scenarioSkippedSteps++; break;
			case 'undefined': // Handle undefined steps if necessary
				scenarioFailedSteps++; // Treat undefined as failure?
				console.warn(`Undefined step found: ${step.keyword}${step.name}`);
				break;
			case 'ambiguous': // Handle ambiguous steps if necessary
				scenarioFailedSteps++; // Treat ambiguous as failure?
				console.warn(`Ambiguous step found: ${step.keyword}${step.name}`);
				break;
			case 'pending': // Handle pending steps if necessary
				scenarioSkippedSteps++; // Treat pending as skipped?
				console.warn(`Pending step found: ${step.keyword}${step.name}`);
				break;
			default:
				console.warn(`Unknown step status: ${step.result?.status} for step: ${step.keyword}${step.name}`);
				// Decide how to count unknown status, maybe skipped or failed?
				scenarioSkippedSteps++;
		}
    

	const scenStatus = testPassed(scenarioFailedSteps, scenarioPassedSteps);
	return {
		scenarioId,
		status: scenStatus,
		stepResults: { passedSteps: scenarioPassedSteps, failedSteps: scenarioFailedSteps, skippedSteps: scenarioSkippedSteps }
	};
}

function testPassed(failed: number, passed: number): boolean {
	// A test run passes if there are 0 failures AND at least one step passed.
	// Scenarios/features with only skipped/pending steps should not be marked as passed.
	return failed === 0 && passed > 0;
}

// --- File System Helpers ---

// Helper function to delete a single file
function deleteReportFile(filePath: string): void {
	fs.unlink(filePath, (err) => {
		if (err && err.code !== 'ENOENT')  // Ignore 'file not found' errors
			console.error(`Error deleting report file ${filePath}:`, err);
		else if (!err) 
			console.log(`Report file ${filePath} deleted.`);
        
	});
}