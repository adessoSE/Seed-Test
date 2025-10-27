import { ObjectId, GridFSBucket } from 'mongodb';
import * as dbConnection from '../database/DbConnector';
import str from 'string-to-stream';
import toString from 'stream-to-string';
import fs from 'fs';
import { ReportContainer } from '@shared/models/ReportContainer';
import * as storyService from './story.service';

const ReportDataCollection = 'ReportData';
const ReportsCollection = 'Reports';
type TestMode = 'scenario' | 'feature' | 'group';

// --- Report CRUD Functions ---

/**
 * Fetches all report metadata for a specific story, excluding the large JSON report data.
 * @param storyId The ObjectId of the story.
 * @returns A promise that resolves to an array of report metadata objects.
 */
export async function getTestReports(storyId: string): Promise<any[]> {
    const db = dbConnection.getConnection();
    return await db.collection(ReportDataCollection)
        .find({ storyId: new ObjectId(storyId) }, { projection: { jsonReport: 0, reportOptions: 0, json: 0 } })
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
    if (!reportData) {
        throw new Error('Report data not found');
    }
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
    if (!reportData) {
        throw new Error('Report data not found');
    }
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

    const data = await fs.promises.readFile(reportResults.reportOptions.jsonFile, 'utf8');
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
    if (!reportData) {
        throw new Error('Report to delete not found');
    }

    if (reportData.smallReport) {
        await db.collection(ReportsCollection).deleteOne({ _id: new ObjectId(reportData.smallReport) });
    } else if (reportData.bigReport) {
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
export async function updateLatestTestStatus(uploadedReport: any, mode: TestMode): Promise<void> {
    switch (mode) {
        case 'scenario':
            await updateScenarioTestStatus(uploadedReport);
            break;
        case 'feature':
            {
                // Prepare all update promises for the feature and its scenarios
                const updatePromises: Promise<any>[] = [];

                // Promise to update the overall story status
                updatePromises.push(storyService.updateStoryStatus(uploadedReport.storyId, uploadedReport.status));

                // Promises to update each scenario's status within the story
                for (const scenarioStatus of uploadedReport.scenarioStatuses) {
                    updatePromises.push(
                        storyService.updateScenarioStatus(uploadedReport.storyId, scenarioStatus.scenarioId, scenarioStatus.status)
                    );
                }

                // Execute all updates concurrently and wait for them to finish
                await Promise.all(updatePromises);
            }
            break;
        case 'group':
            {
                // Prepare all update promises for all stories and their scenarios in the group
                const updatePromises: Promise<any>[] = [];

                for (const storyStatus of uploadedReport.storyStatuses) {
                    // Promise to update the overall status of each story in the group
                    updatePromises.push(storyService.updateStoryStatus(storyStatus.storyId, storyStatus.status));

                    // Promises to update the status of each scenario within each story
                    for (const scenarioStatus of storyStatus.scenarioStatuses) {
                        updatePromises.push(
                            storyService.updateScenarioStatus(storyStatus.storyId, scenarioStatus.scenarioId, scenarioStatus.status)
                        );
                    }
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
        const reportString = await toString(bucket.openDownloadStream(new ObjectId(reportData.bigReport.toString())));
        const reportJson = JSON.parse(reportString);
        result = { _id: reportData._id, jsonReport: reportJson.jsonReport };
    } else {
        throw new Error(`Report ${reportData._id} has neither a smallReport nor a bigReport reference.`);
    }
    return result;
}

async function uploadBigJsonData(data: any, fileName: string): Promise<ObjectId> {
    const db = dbConnection.getConnection();
    const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });
    const id = new ObjectId();

    return new Promise((resolve, reject) => {
        str(JSON.stringify(data))
            .pipe(bucket.openUploadStreamWithId(id, fileName))
            .on('error', (error) => reject(error))
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
            if(scenarioIndex > -1) story.scenarios[scenarioIndex].lastTestPassed = true;
            // The whole story is considered passed only if ALL its scenarios have passed.
            storyStatus = story.scenarios.every(scen => scen.lastTestPassed === true);
        }
    }
    await storyService.updateStoryStatus(uploadedReport.storyId, storyStatus);
    await storyService.updateScenarioStatus(uploadedReport.storyId, uploadedReport.scenarioId, uploadedReport.status);
}