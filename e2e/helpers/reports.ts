import { createRequire } from 'node:module';
import path from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import { API_URL, E2E_ROOT } from './config';

/** Step as stored in a scenario's stepDefinitions (shape of storedStepDefinitionSchema). */
export interface StoredStep {
	id: number;
	pre: string;
	mid: string;
	stepType: 'given' | 'when' | 'then';
	type: string;
	values: string[];
}

/** One report entry of GET /report/history/:storyId (only the fields the suite reads). */
export interface ReportEntry {
	_id: string;
	reportName: string;
	reportTime: number;
	scenariosTested: { failed: number; [key: string]: unknown };
}

/** Body of GET /report/history/:storyId. */
export interface ReportHistory {
	storyReports: ReportEntry[];
	scenarioReports: ReportEntry[];
	groupReports: ReportEntry[];
}

/** Subset of the adm-zip API used by featureTextsFromZip. */
interface AdmZipLike {
	getEntries(): { entryName: string; getData(): Buffer }[];
}

/**
 * Reads the report history of a story.
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @returns Story, scenario and group reports as the API lists them.
 */
export async function getReportHistory(api: APIRequestContext, storyId: string): Promise<ReportHistory> {
	const response = await api.get(`${API_URL}/report/history/${storyId}`);
	if (response.status() !== 200)
		throw new Error(`getReportHistory failed: HTTP ${response.status()} ${await response.text()}`);
	return (await response.json()) as ReportHistory;
}

/**
 * Lists the ids of the scenario reports of a story.
 * WHY: ids, not row counts, show which report a delete removed.
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @returns Ids of the scenario reports in server order.
 */
export async function scenarioReportIds(api: APIRequestContext, storyId: string): Promise<string[]> {
	return (await getReportHistory(api, storyId)).scenarioReports.map(report => report._id);
}

/**
 * Returns the text of every .feature entry of a downloaded project zip.
 * WHY: zip entry names are the story id plus a cleaned title, so tests match the "Feature:" line instead.
 * adm-zip lives in the workspace root node_modules, so it is loaded with createRequire like helpers/legacy-db.ts loads mongodb.
 * @param zipPath Local path of the downloaded zip (from Download.path()).
 * @returns Text of each .feature entry.
 */
export function featureTextsFromZip(zipPath: string): string[] {
	const requireFromRoot = createRequire(path.resolve(E2E_ROOT, '..', 'package.json'));
	const AdmZip = requireFromRoot('adm-zip') as new (file: string) => AdmZipLike;
	return new AdmZip(zipPath)
		.getEntries()
		.filter(entry => entry.entryName.endsWith('.feature'))
		.map(entry => entry.getData().toString('utf8'));
}
