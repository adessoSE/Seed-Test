import { type ObjectId } from 'mongodb';

/**
 * Jira and GitHub REST API response shapes, plus intermediate document shapes used while
 * syncing repositories, test sets, and pre-conditions into the local database.
 */

/** A single project entry from Jira's `GET /rest/api/2/project`. */
export interface JiraProjectSummary {
	name: string;
}

/** A GitHub repository as returned by the GitHub REST API (owned or starred repo listings). */
export interface GithubRepoSummary {
	full_name: string;
	owner: { id: number };
}

/** A GitHub issue tagged with the "story" label, as returned by the GitHub Issues API. */
export interface GithubIssue {
	id: number;
	number: number;
	title: string;
	body: string;
	state: string;
	assignee?: { login?: string; avatar_url?: string };
}

/** A repository reference — either a persisted DB `Repository` doc or a freshly-inserted stub. */
export interface RepoRef {
	_id?: string | ObjectId;
	repoName: string;
	gitOwner?: string;
	owner?: string;
}

/** A repository entry returned to the frontend after Jira/GitHub repo sync. */
export interface RepoSyncEntry {
	_id: string | ObjectId;
	repoName: string;
	source: string;
}

/** A Jira "Test Set" issue collected while syncing Jira stories, used to rebuild story groups. */
export interface JiraTestSet {
	testSetKey: string;
	testSetId: string;
	tests: string[];
	xrayTestSet: boolean;
}

/** A Jira "Pre-Condition" issue, mapped onto the Test issue keys it applies to. */
export interface JiraPreCondition {
	preConditionKey: string;
	preConditionName: string;
	testSet: string[];
}
