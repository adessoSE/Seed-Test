import {executionMode} from '../models/models';
import {checkValidGithub} from './userManagement'
const { XMLHttpRequest } = require('xmlhttprequest');

function renderComment(
	stepsPassed, stepsFailed, stepsSkipped,
	testStatus,
	scenariosTested,
	reportTime,
	story,
	scenario,
	mode: executionMode,
	reportName
) {
	let comment = '';
	const testPassedIcon = testStatus ? ':white_check_mark:' : ':x:';
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
	const reportUrl = `${frontendUrl}/report/${reportName}`;
	if (mode === executionMode.SCENARIO) comment = `# Seed-Test Execution ${new Date(reportTime).toLocaleString()}\n## Tested Scenario: "${scenario.name}"\n### Test passed: ${testPassedIcon}\nSteps passed: ${stepsPassed} :white_check_mark:\nSteps failed: ${stepsFailed} :x:\nSteps skipped: ${stepsSkipped} :warning:\nLink to the report: [Report|${reportUrl}]`;
	else comment = `# Seed-Test Execution from ${new Date(reportTime).toLocaleString()}\n## Tested Story: "${story.title}"\n### Test passed: ${testPassedIcon}\nScenarios passed: ${scenariosTested.passed} :white_check_mark:\nScenarios failed: ${scenariosTested.failed} :x:\nLink to the report: [Report|${reportUrl}]`;
	return comment;
}

async function postCommentGitHub(issueNumber, comment, githubName, githubRepo, password) {
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

async function postCommentJira(issueId, comment, host, jiraUser, jiraPassword, authMethod) {
	console.log(comment)
	comment = comment.replace('#','')
	comment = comment.replace('##','#')
	comment = comment.replace('###','##')
	comment = comment.replaceAll(':white_check_mark:','(/)')
	comment = comment.replaceAll(':x:','(x)')
	comment = comment.replaceAll(':warning:','(!)')
	comment = comment.replace('undefined','')
	comment = comment.replace('Steps passed:','(+) Passed Steps:')
	comment = comment.replace('Steps failed:','(-) Failed Steps:')
	comment = comment.replace('Steps skipped:','(!) Skipped Steps:')
	const link = `https://${host}/rest/api/2/issue/${issueId}/comment/`;
	let authString = `Bearer ${jiraPassword}`
	if(authMethod === 'basic') { 
		const auth = Buffer.from(`${jiraUser}:${jiraPassword}`).toString('base64');
		authString = `Basic ${auth}`;
	}
	const body = { body: comment };
	/** @type {Response} */
	const response = await fetch(link, {
		method: 'post',
		body: JSON.stringify(body),
		headers: { Authorization: authString, 'Content-Type': 'application/json' }
	});
	const data = await response.json();
}

function addLabelToIssue(githubName, githubRepo, password, issueNumber, label) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels`;
	const body = { labels: [label] };
	const request = new XMLHttpRequest();
	request.open('POST', link, true, githubName, password);
	request.send(JSON.stringify(body));
}

function removeLabelOfIssue(githubName, githubRepo, password, issueNumber, label) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels/${label}`;
	const req = new XMLHttpRequest();
	req.open('DELETE', link, true, githubName, password);
	req.send();
}

function updateLabel(testStatus, githubName, githubRepo, githubToken, issueNumber) {
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