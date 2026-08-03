import { type ObjectId } from 'mongodb';
import type reporter from 'cucumber-html-reporter';
import { type ExecutionMode, type GroupReport, type PassedCount, type ScenarioStatus, type StepStatus } from '../models/models.js';

/**
 * Cucumber JSON report shapes and MongoDB document shapes for stored test reports.
 * Only the fields the analysis/upload code actually reads are modeled — the real
 * cucumber-html-reporter/Cucumber JSON payloads carry many more fields.
 */

/** A tag on a Cucumber feature or scenario element (e.g. `@storyId_scenarioId`). */
export interface CucumberTag {
	name: string;
}

/** The result of executing a single Cucumber step. */
export interface CucumberStepResult {
	status: string;
	duration?: number;
}

/** A single step within a Cucumber scenario element. */
export interface CucumberStep {
	keyword: string;
	name: string;
	result?: CucumberStepResult;
}

/** A scenario (or hook) element within a Cucumber feature report. */
export interface CucumberElement {
	keyword: string;
	name: string;
	type: string;
	tags?: CucumberTag[];
	steps: CucumberStep[];
}

/** A single feature entry in a Cucumber JSON report — one array element per executed `.feature` file. */
export interface CucumberFeatureReport {
	keyword: string;
	name: string;
	uri: string;
	tags?: CucumberTag[];
	elements: CucumberElement[];
}

/**
 * A stored Cucumber test report document as persisted in the `ReportData` collection.
 * Covers the union of story/scenario/group report shapes — not every field is present on every mode.
 */
export interface ReportDoc {
	_id?: ObjectId;
	reportName: string;
	reportTime: number;
	mode: ExecutionMode;
	status: boolean;
	scenariosTested?: PassedCount;
	// Present on GenericReport (models.ts) but never actually populated at runtime — kept here only
	// so report class instances remain structurally assignable to/from ReportDoc at service boundaries
	storiesTested?: unknown;
	reportOptions?: reporter.Options & Record<string, unknown>;
	isSaved?: boolean;
	// GenericReport (models.ts) declares smallReport as `string`, but uploadReport actually stores the
	// inserted document's ObjectId — accept both so report class instances remain assignable here
	smallReport?: ObjectId | string;
	bigReport?: ObjectId;
	// ScenarioReport fields — storyId is declared as `number` on the shared model but the
	// analysis code actually stores the story's Mongo ObjectId at runtime (see analyzeScenarioReport)
	storyId?: ObjectId | number;
	scenarioId?: number;
	scenarioStatuses?: ScenarioStatus[];
	featureTestResults?: StepStatus;
	// StoryReport field
	featureId?: string;
	// GroupReport fields
	storyStatuses?: GroupReport['storyStatuses'];
	groupTestResults?: StepStatus;
}

/** The full report record with its JSON payload resolved (from GridFS or the small-report collection). */
export interface FullReport {
	_id: ObjectId;
	jsonReport?: string;
}

/** The payload written to GridFS for large Cucumber JSON reports. */
export interface BigReportPayload {
	jsonReport: string;
	created: Date;
}

/** Minimal shape of the basic result object produced by a completed test execution. */
export interface ReportExecutionResult {
	reportName: string;
	reportTime: number;
	scenarioId?: number | string;
	success?: boolean;
}

/** Parameters describing a group execution (used to derive the report/directory name). */
export interface GroupExecutionParams {
	name: string;
}
