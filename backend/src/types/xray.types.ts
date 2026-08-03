/**
 * Xray/Jira REST API shapes used when syncing test issues, test runs, and test steps.
 * Only the fields the sync and reporting code actually reads are modeled here — these
 * are hand-trimmed views of much larger real-world Jira/Xray payloads.
 */

/** A Jira issue as returned from Jira's REST search API (Test, Test Set, or Pre-Condition issue types). */
export interface XrayIssue {
	id: string;
	key: string;
	fields: XrayIssueFields;
}

export interface XrayIssueFields {
	issuetype: { name: string };
	summary: string;
	description?: string;
	status: { name: string };
	assignee?: { name?: string; login?: string; avatarUrls?: Record<string, string> };
	// Xray "Test Set" custom field: Test issue keys included in the set
	customfield_14233?: string[];
	// Xray "Pre-Condition" custom field: Pre-Condition issue keys linked to a Test
	customfield_14229?: string[];
	issuelinks?: XrayIssueLink[];
}

export interface XrayIssueLink {
	inwardIssue?: { key: string };
	type: { inward: string };
}

/** A single entry from `GET /rest/raven/2.0/api/test/{key}/testruns`. */
export interface XrayTestRunSummary {
	id: number;
}

/** The Given/Action/Expected-Result fields shared by both Xray test-step definitions and test-run steps. */
export interface XrayStepFields {
	Given?: { value: string };
	Action?: { value: { raw: string } };
	'Expected Result'?: { value: { raw: string } };
}

/** A test step definition attached to an Xray test issue (`GET /rest/raven/2.0/api/test/{key}/steps`). */
export interface XrayTestStep {
	id: number;
	index: number;
	fields?: XrayStepFields;
}

/** A single executed step within a resolved Xray test run. */
export interface XrayTestRunStep {
	id: number;
	fields: XrayStepFields;
}

/** A resolved Xray test run (`GET /rest/raven/2.0/api/testrun/{id}`), including its executed steps. */
export interface XrayTestRun {
	id: number;
	testExecKey: string;
	steps?: XrayTestRunStep[];
}

/** A match between raw Xray step text and one of Seed-Test's configured step-type definitions. */
export interface XrayStepMatch {
	type: string;
	values: string[];
	pre: string;
	mid: string;
	post?: string;
	context: string;
	origin: string;
}
