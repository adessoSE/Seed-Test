import {executionMode, passedCount, stepStatus} from '../models/models';
import {checkValidGithub} from './userManagement'

function renderComment(
	stepResults: stepStatus,
	testStatus: boolean,
	scenariosTested: passedCount,
	reportTime,
	story,
	scenario,
	mode: executionMode,
	reportName: string
) {
	let comment = '';
	const testPassedIcon = testStatus ? ':white_check_mark:' : ':x:';
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
	const reportUrl = `${frontendUrl}/report/${reportName}`;
	if (mode === executionMode.SCENARIO) comment = `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Scenario: "${scenario.name}"\n### Test passed: ${testStatus}${testPassedIcon}\nSteps passed: ${stepResults.passedSteps} :white_check_mark:\nSteps failed: ${stepResults.failedSteps} :x:\nSteps skipped: ${stepResults.skippedSteps} :warning:\nLink to the official report: [Report](${reportUrl})`;
	else comment = `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Story: "${story.title}"\n### Test passed: ${testStatus}${testPassedIcon}\nScenarios passed: ${scenariosTested.passed} :white_check_mark:\nScenarios failed: ${scenariosTested.failed} :x:\nLink to the official report: [Report](${reportUrl})`;
	return comment;
}

async function postCommentGitHub(issueNumber: string, comment: string, githubName: string, githubRepo: string, password: string) {
	if (!checkValidGithub(githubName, githubRepo)) return;
	if (!(new RegExp(/^\d+$/)).test(issueNumber)) return;
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/comments`;
	const auth = `Basic ${Buffer.from(`${githubName}:${password}`, 'binary').toString('base64')}`;
	/** @type {Response} */
	const response = await fetch(link, {
		method: 'post',
		body: JSON.stringify({ body: comment }),
		headers: { Authorization: auth }
	})
	console.log(await response.json());
}

async function postCommentJira(issueId, comment: string, host: string, jiraUser: string, jiraPassword: string) {
	const link = `https://${host}/rest/api/2/issue/${issueId}/comment/`;
	const auth = `Basic ${Buffer.from(`${jiraUser}:${jiraPassword}`, 'binary').toString('base64')}`;
	const body = { body: comment };
	/** @type {Response} */
	const response = await fetch(link, {
		method: 'post',
		body: JSON.stringify(body),
		headers: { Authorization: auth, 'Content-Type': 'application/json' }
	});
	const data = await response.json();

	console.log(data);
}

function addLabelToIssue(githubName: string, githubRepo: string, password: string, issueNumber, label: string) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels`;
	const body = { labels: [label] };
	const auth = `Basic ${Buffer.from(`${githubName}:${password}`, 'binary').toString('base64')}`;
	fetch(link, {
		method: 'post',
		body: JSON.stringify(body),
		headers: { Authorization: auth, 'Content-Type': 'application/json' }
	})
}

function removeLabelOfIssue(githubName: string, githubRepo: string, password: string, issueNumber, label: string) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels/${label}`;
	const auth = `Basic ${Buffer.from(`${githubName}:${password}`, 'binary').toString('base64')}`;
	fetch(link, {
		method: 'post',
		headers: { Authorization: auth, 'Content-Type': 'application/json' }
	})
}

function updateLabel(testStatus: boolean, githubName: string, githubRepo: string, githubToken: string, issueNumber) {
	let removeLabel;
	let addedLabel;
	if (testStatus) {
		removeLabel = 'Seed-Test Test Fail :x:';
		addedLabel = 'Seed-Test Test Success :white_check_mark:';
	} else {
		removeLabel = 'Seed-Test Test Success :white_check_mark:';
		addedLabel = 'Seed-Test Test Fail :x:';
	}
	removeLabelOfIssue(githubName, githubRepo, githubToken, issueNumber, removeLabel);
	addLabelToIssue(githubName, githubRepo, githubToken, issueNumber, addedLabel);
}

export {
    renderComment,
    postCommentGitHub,
    postCommentJira,
    addLabelToIssue,
    removeLabelOfIssue,
    updateLabel,
};