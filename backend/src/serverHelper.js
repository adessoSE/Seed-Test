/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle,curly */
const ch = require('child_process');
const fs = require('fs');
const pfs = require('fs/promises');
const { XMLHttpRequest } = require('xmlhttprequest');
const path = require('path');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');
const passport = require('passport');
const os = require('os');
const mongo = require('./database/DbServices');
const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');
const userMng = require('../dist/userManagement');
const reporting = require('../dist/reporting');

// adds content of each values to output
function getValues(values) {
	let data = '';
	for (let i = 1; i < values.length; i++) data += `'${values[i]}'`;
	return data;
}

// Content in Background for FeatureFile
function getBackgroundSteps(steps) {
	let data = '';
	for (let i = 0; i < steps.length; i++) {
		// eslint-disable-next-line no-continue
		if (steps[i].deactivated) continue;
		if (i === 0) data += 'When ';
		else data += 'And ';
		if (steps[i].values[0] != null) data += `${steps[i].pre} '${steps[i].values[0]}' ${steps[i].mid}${getValues(steps[i].values)} \n`;
		else data += `${steps[i].pre} ${steps[i].mid}${getValues(steps[i].values)} \n`;
	}
	data += '\n';
	return data;
}

// Building Background-Content
function getBackgroundContent(background) {
	let data = 'Background: \n\n';
	// get stepDefinitions
	data += getBackgroundSteps(background.stepDefinitions.when);
	return data;
}

// First letter in string to upper case
function jsUcfirst(string) {
	return string.charAt(0)
		.toUpperCase() + string.slice(1);
}

// Building feature file step-content
function getSteps(steps, stepType) {
	let data = '';
	for (const step of steps) {
		// eslint-disable-next-line no-continue
		if (step.deactivated) continue;
		data += `${jsUcfirst(stepType)} `;
		if ((step.values[0]) != null && (step.values[0]) !== 'User') {
			data += `${step.pre} '${step.values[0]}' ${step.mid}${getValues(step.values)}`;
			if (step.post !== undefined) data += ` ${step.post}`;
		} else if ((step.values[0]) === 'User') data += `${step.pre} '${step.values[0]}'`;
		else {
			data += `${step.pre} ${step.mid}${getValues(step.values)} ${step.post}`;
			if (step.post !== undefined) data += ` ${step.post}`;
		}
		data += '\n';
	}
	return data;
}

// adds content of each values to output
function getExamples(steps) {
	let data = 'Examples:';
	for (let i = 0; i < steps.length; i++) {
		// eslint-disable-next-line no-continue
		if (steps[i].deactivated) continue;
		data += '\n | ';
		for (let k = 0; k < steps[i].values.length; k++) data += `${steps[i].values[k]} | `;
	}
	return `${data}\n`;
}

// Building feature file scenario-name-content
function getScenarioContent(scenarios, storyID) {
	let data = '';
	for (const scenario of scenarios) {
		data += `@${storyID}_${scenario.scenario_id}\n`;
		// if there are examples
		if ((scenario.stepDefinitions.example.length) > 0) data += `Scenario Outline: ${scenario.name}\n\n`;
		else data += `Scenario: ${scenario.name}\n\n`;
		// Get Stepdefinitions
		if (scenario.stepDefinitions.given !== undefined) data += `${getSteps(scenario.stepDefinitions.given, Object.keys(scenario.stepDefinitions)[0])}\n`;
		if (scenario.stepDefinitions.when !== undefined) data += `${getSteps(scenario.stepDefinitions.when, Object.keys(scenario.stepDefinitions)[1])}\n`;
		if (scenario.stepDefinitions.then !== undefined) data += `${getSteps(scenario.stepDefinitions.then, Object.keys(scenario.stepDefinitions)[2])}\n`;
		if ((scenario.stepDefinitions.example.length) > 0) data += `${getExamples(scenario.stepDefinitions.example)}\n\n`;
	}
	return data;
}

// Building feature file story-name-content (feature file title)
function getFeatureContent(story) {
	let data = `Feature: ${story.title}\n\n`;

	// Get background
	if (story.background != null) data += getBackgroundContent(story.background);

	// Get scenarios
	data += getScenarioContent(story.scenarios, story._id);
	return data;
}

function cleanFileName(filename) {
	return filename.replace(/[^a-z0-9]/gi, '_');
}

// Creates feature file
function writeFile(selectedStory) {
	const filename = selectedStory.title + selectedStory._id;
	fs.writeFile(path.join(
		__dirname,
		'../features',
		`${cleanFileName(filename)}.feature`
	), getFeatureContent(selectedStory), (err) => {
		if (err) throw err;
	});
}

// Updates feature file based on _id
async function updateFeatureFile(issueID, storySource) {
	const result = await mongo.getOneStory(issueID, storySource);
	if (result != null) writeFile(result);
}

async function runReport(req, res, stories, mode, parameters) {
	let reportObj;
	try {
		if (mode === 'group') {
			req.body.name = req.body.name.replace(/ /g, '_') + Date.now();
			fs.mkdirSync(`./features/${req.body.name}`);
			if (parameters.isSequential == undefined || !parameters.isSequential)
				reportObj = await Promise.all(stories.map((story) => executeTest(req, mode, story))).then((valueArr)=>valueArr.pop());
			else {
				for (const story of stories) {
					reportObj = await executeTest(req, mode, story);
				}
			}
		} else {
			const story = await mongo.getOneStory(req.params.issueID, req.params.storySource);
			reportObj = await executeTest(req, mode, story).catch((reason) => res.send(reason).status(500));
		}
	} catch (error) {
		res.status(404).send(error);
		return;
	}

	const { reportResults, reportName } = await reporting.resolveReport(reportObj, mode, stories, req);
	// generate HTML Report
	console.log('reportName in callback of resolveReport:');
	console.log(reportName);
	console.log('reportResults in callback of resolveReport:');
	console.log(reportResults);
	// upload report to DB
	const uploadedReport = await mongo.uploadReport(reportResults)
		.catch((error) => {
			console.log(`Could not UploadReport :  ./features/${reportName}.json
				Rejection: ${error}`);
			res.json({ htmlFile: `Could not UploadReport :  ./features/${reportName}.json` });
		});
	// read html Report and add it top response
	fs.readFile(`./features/${reportName}.html`, 'utf8', (err, data) => {
		res.json({ htmlFile: data, reportId: uploadedReport._id });
	});
	updateLatestTestStatus(uploadedReport, mode);

	// delete Group folder
	const deletionTime = reporting.reportDeletionTime * 60000;
	if (mode === 'group') setTimeout(reporting.deleteReport, deletionTime, `${reportResults.reportName}`);
	else {
		// delete reports in filesystem after a while
		setTimeout(reporting.deleteReport, deletionTime, `${reportName}.json`);
		setTimeout(reporting.deleteReport, deletionTime, `${reportName}.html`);
	}

	// if possible separate function
	for (const story of stories) {
		let comment;
		if (mode === 'group') {
			comment = `This Execution ist part of group execution ${parameters.name}\n`;
			comment += renderComment(reportResults.groupTestResults.passedSteps, reportResults.groupTestResults.failedSteps, reportResults.groupTestResults.skippedSteps, reportResults.status, reportResults.scenariosTested,
				reportResults.reportTime, story, story.scenarios[0], mode, reportName.split('/')[0]);
		} else {
			comment += renderComment(reportResults.featureTestResults.passedSteps, reportResults.featureTestResults.failedSteps, reportResults.featureTestResults.skippedSteps, reportResults.status, reportResults.scenariosTested,
				reportResults.reportTime, story, story.scenarios[0], mode, reportName);
		}
		if (story.storySource === 'github' && req.user && req.user.github) {
			const githubValue = parameters.repository.split('/');
			// eslint-disable-next-line no-continue
			if (githubValue == null) { continue; }
			const githubName = githubValue[0];
			const githubRepo = githubValue[1];

			postCommentGitHub(story.issue_number, comment, githubName, githubRepo, req.user.github.githubToken);
			if (mode === 'feature') updateLabel('testStatus', githubName, githubRepo, req.user.github.githubToken, story.issue_number);
		}
		if (story.storySource === 'jira' && req.user && req.user.jira) {
			const { Host, AccountName, Password, Password_Nonce, Password_Tag } = req.user.jira;
			const clearPass = userMng.jiraDecryptPassword(Password, Password_Nonce, Password_Tag);
			postCommentJira(story.issue_number, comment, Host, AccountName, clearPass);
		}
	}
}

async function deleteFeatureFile(storyTitle, storyId) {
	try {
		fs.unlink(`features/${cleanFileName(storyTitle + storyId)}.feature`, (err) => {
			if (err) throw err;
			// if no error, file has been deleted successfully
			console.log('FeatureFile deleted!', storyTitle + storyId);
		});
	} catch (e) {
		console.log('File not found', e);
	}
}

async function executeTest(req, mode, story) {
	return new Promise((resolve, reject) => {
		let parameters = {};
		if (mode === 'scenario') {
		// TODO replace this using scenario prep
			const scenario = story.scenarios.find(
				(elem) => elem.scenario_id === parseInt(req.params.scenarioId, 10)
			);
			console.log(`SCENARIO EMULATOR: ${scenario.emulator}`);

			if (!scenario.stepWaitTime) scenario.stepWaitTime = 0;
			if (!scenario.browser) scenario.browser = 'chrome';
			if (!scenario.daisyAutoLogout) scenario.daisyAutoLogout = false;
			if (scenario.stepDefinitions.example.length <= 0) {
				parameters = {
					scenarios: [
						{
							browser: scenario.browser,
							waitTime: scenario.stepWaitTime,
							daisyAutoLogout: scenario.daisyAutoLogout,
							emulator: scenario.emulator
						}
					]
				};
			} else {
				parameters = { scenarios: [] };
				scenario.stepDefinitions.example.forEach((examples, index) => {
					if (index > 0) {
						parameters.scenarios.push({
							browser: scenario.browser,
							waitTime: scenario.stepWaitTime,
							daisyAutoLogout: scenario.daisyAutoLogout,
							emulator: scenario.emulator
						});
					}
				});
			}
		} else if (mode === 'feature' || mode === 'group') {
			const prep = scenarioPrep(story.scenarios, story.oneDriver);
			story.scenarios = prep.scenarios;
			parameters = prep.parameters;
		}
		const reportTime = Date.now();
		const cucePath = 'node_modules/.bin/';
		const featurePath = `../../features/${cleanFileName(story.title + story._id)}.feature`;
		const reportName = req.user && req.user.github ? `${req.user.github.login}_${reportTime}` : `reporting_${reportTime}`;

		let jsonPath = `../../features/${reportName}.json`;
		if (mode === 'group') {
			const grpDir = req.body.name;
			jsonPath = `../../features/${grpDir}/${reportName}.json`;
		}

		const jsParam = JSON.stringify(parameters);
		const cucumberArgs = [];
		// specify location of feature to execute
		cucumberArgs.push(path.normalize(featurePath));
		if (mode === 'scenario') {
		// run single Scenario by using '--tags @ScenarioName'
			cucumberArgs.push('--tags', `@${req.params.issueID}_${req.params.scenarioId}`);
		}
		// specify desired location of JSON Report and pass world parameters for cucumber execution
		cucumberArgs.push('--format', `json:${path.normalize(jsonPath)}`, '--world-parameters', jsParam, '--exit');

		// no cmd for non windows
		const cmd = os.platform().includes('win') ? '.cmd' : '';
		const cucumberCommand = `cucumber-js${cmd}`;
		const cucumberPath = path.normalize(`${__dirname}/../${cucePath}`);

		console.log('\nExecuting:');
		console.log(`Working Dir: "${cucumberPath}"`);
		console.log(`Command: "${cucumberCommand}"`);
		console.log(`Args: [${cucumberArgs}]\n`);

		// spawn the process in the given directory (cwd)
		const runner = ch.spawn(cucumberCommand, cucumberArgs, { cwd: cucumberPath });

		runner.stdout.on('data', (data) => {
			console.log(`stdout: ${data}`);
		});
		runner.stderr.on('data', (data) => { console.log(`stderr: ${data}`); });
		runner.on('error', (error) => {
			console.error(`exec error: ${error}`);
			resolve({ reportTime, story, scenarioId: req.params.scenarioId, reportName });
		});
		// if more than one child use "close" https://nodejs.org/api/child_process.html#event-close
		runner.on('exit', () => {
			console.log('test finished');
			resolve({ reportTime, story, scenarioId: req.params.scenarioId, reportName });
		});
	});
}

function scenarioPrep(scenarios, driver) {
	const parameters = { scenarios: [] };
	scenarios.forEach((scenario) => {
		// eslint-disable-next-line no-param-reassign
		if (!scenario.stepWaitTime) scenario.stepWaitTime = 0;
		// eslint-disable-next-line no-param-reassign
		if (!scenario.browser) scenario.browser = 'chrome';
		// eslint-disable-next-line no-param-reassign
		if (!scenario.daisyAutoLogout) scenario.daisyAutoLogout = false;
		if (scenario.stepDefinitions.example.length <= 0) {
			parameters.scenarios.push({
				browser: scenario.browser,
				waitTime: scenario.stepWaitTime,
				daisyAutoLogout: scenario.daisyAutoLogout,
				oneDriver: driver,
				emulator: scenario.emulator
			});
		} else {
			scenario.stepDefinitions.example.forEach((examples, index) => {
				if (index > 0) {
					parameters.scenarios.push({
						browser: scenario.browser,
						waitTime: scenario.stepWaitTime,
						daisyAutoLogout: scenario.daisyAutoLogout,
						oneDriver: driver,
						emulator: scenario.emulator
					});
				}
			});
		}
	});
	return { scenarios, parameters };
}

function dbProjects(user) {
	return new Promise((resolve) => {
		if (typeof user !== 'undefined') {
			const userId = user._id;
			mongo.getRepository(userId).then((json) => {
				const projects = [];
				if (Object.keys(json).length !== 0) {
					for (const repo of json) if (repo.repoType === 'db') {
						const proj = {
							_id: repo._id,
							value: repo.repoName,
							source: repo.repoType,
							canEdit: repo.canEdit
						};
						projects.push(proj);
					}
					resolve(projects);
				}
				resolve([]);
			});
		} else resolve([]);
	});
}

function uniqueRepositories(repositories) {
	const uniqueIds = [];
	const unique = [];
	for (const i in repositories) {
		if (uniqueIds.indexOf(repositories[i]._id.toString()) <= -1) {
			uniqueIds.push(repositories[i]._id.toString());
			unique.push(repositories[i]);
		}
	}
	return unique;
}

function execRepositoryRequests(link, user, password, ownerId, githubId) {
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest(); // use fetch
		// get Issues from GitHub
		request.open('GET', link, true, user, password);
		request.send();
		request.onreadystatechange = async () => {
			if (request.readyState !== 4) return;
			if (request.status !== 200) { reject(this.status); return; }
			const data = JSON.parse(request.responseText);
			const projects = [];
			const gitReposFromDb = await mongo.getAllSourceReposFromDb('github');
			let mongoRepo;
			for (const repo of data) {
				// if this Repository is not in the DB create one in DB
				if (!gitReposFromDb.some((entry) => entry.repoName === repo.full_name)) {
					mongoRepo = await mongo.createGitRepo(repo.owner.id, repo.full_name, githubId, ownerId);
				} else {
					mongoRepo = gitReposFromDb.find((element) => element.repoName === repo.full_name); // await mongo.getOneGitRepository(repo.full_name)
					if (mongoRepo.gitOwner === githubId) mongo.updateOwnerInRepo(repo.full_name, ownerId, 'github');
				}
				const repoName = repo.full_name;
				const proj = {
					_id: mongoRepo._id,
					value: repoName,
					source: 'github'
				};
				projects.push(proj);
			}
			resolve(projects);
		};
	});
}

function ownRepositories(ownerId, githubId, githubName, token) {
	if (!githubName && !token) return Promise.resolve([]);
	return execRepositoryRequests('https://api.github.com/user/repos?per_page=100', githubName, token, ownerId, githubId);
}

function starredRepositories(ownerId, githubId, githubName, token) {
	if (!githubName && !token) return Promise.resolve([]);
	return execRepositoryRequests(`https://api.github.com/users/${githubName}/starred`, githubName, token, ownerId, githubId);
}

async function fuseStoryWithDb(story) {
	const result = await mongo.getOneStory(parseInt(story.story_id, 10), story.storySource);
	if (result !== null) {
		story.scenarios = result.scenarios;
		story.background = result.background;
		story.lastTestPassed = result.lastTestPassed;
	} else {
		story.scenarios = [emptyScenario()];
		story.background = emptyBackground();
	}
	story.story_id = parseInt(story.story_id, 10);
	if (story.storySource !== 'jira') story.issue_number = parseInt(story.issue_number, 10);

	const finalStory = await mongo.upsertEntry(story.story_id, story, story.storySource);
	story._id = finalStory._id;
	// Create & Update Feature Files
	writeFile(story);
	return story;
}

async function deleteOldReports(reports) {
	const keepReportAmount = parseInt(process.env.MAX_SAVED_REPORTS, 10);
	// sort Reports by timestamp
	reports.sort((a, b) => b.reportTime - a.reportTime);
	// exclude saved / favorite Reports from deleting
	const reportsToDelete = reports.filter((elem) => !elem.isSaved);
	// exclude the a given amount fo the last run reports
	reportsToDelete.splice(0, keepReportAmount);
	// then delete the remaining old reports:
	reportsToDelete.forEach((element) => {
		reports.splice(reports.indexOf(element), 1);
		mongo.deleteReport(element._id);
	});
	return reports;
}

async function getReportHistory(storyId) {
	let storyReports = [];
	let scenarioReports = [];
	let groupReports = await mongo.getGroupTestReports(storyId);
	const nonGroupReports = await mongo.getTestReports(storyId);
	nonGroupReports.forEach((element) => {
		if (element.mode === 'feature') storyReports.push(element);
		if (element.mode === 'scenario') scenarioReports.push(element);
		if (element.mode === 'group') groupReports.push(element);
	});
	storyReports = await deleteOldReports(storyReports);
	scenarioReports = await deleteOldReports(scenarioReports);
	groupReports = await deleteOldReports(groupReports);
	return { storyReports, scenarioReports, groupReports };
}

function updateLatestTestStatus(uploadedReport, mode) {
	switch (mode) {
		case 'scenario':
			updateScenarioTestStatus(uploadedReport);
			break;
		case 'feature':
			updateStoryTestStatus(
				uploadedReport.storyId,
				uploadedReport.status,
				uploadedReport.scenarioStatuses
			);
			break;
		case 'group':
			for (const storyStatus of uploadedReport.storyStatuses) {
				updateStoryTestStatus(storyStatus.storyId, storyStatus.status, storyStatus.scenarioStatuses);
			}
			break;
		default:
			console.log('Error: No mode provided in updateLatestTestStatus');
	}
}

async function updateStoryTestStatus(storyId, storyLastTestStatus, scenarioStatuses) {
	try {
		await mongo.updateStoryStatus(storyId, storyLastTestStatus);
		for (const scenarioStatus of scenarioStatuses) {
			await mongo.updateScenarioStatus(storyId, scenarioStatus.scenarioId, scenarioStatus.status);
		}
	} catch (e) {
		console.log('Could not Update Story LastTestPassed.');
	}
}

async function updateScenarioTestStatus(uploadedReport) {
	try {
		await mongo.updateScenarioStatus(uploadedReport.storyId, uploadedReport.scenarioId, uploadedReport.status);
	} catch (e) {
		console.log('Could not Update Scenario LastTestPassed.');
	}
}

function renderComment(
	stepsPassed, stepsFailed, stepsSkipped,
	testStatus,
	scenariosTested,
	reportTime,
	story,
	scenario,
	mode,
	reportName
) {
	let comment = '';
	const testPassedIcon = testStatus ? ':white_check_mark:' : ':x:';
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
	const reportUrl = `${frontendUrl}/report/${reportName}`;
	if (mode === 'scenario') comment = `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Scenario: "${scenario.name}"\n### Test passed: ${testStatus}${testPassedIcon}\nSteps passed: ${stepsPassed} :white_check_mark:\nSteps failed: ${stepsFailed} :x:\nSteps skipped: ${stepsSkipped} :warning:\nLink to the official report: [Report](${reportUrl})`;
	else comment = `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Story: "${story.title}"\n### Test passed: ${testStatus}${testPassedIcon}\nScenarios passed: ${scenariosTested.passed} :white_check_mark:\nScenarios failed: ${scenariosTested.failed} :x:\nLink to the official report: [Report](${reportUrl})`;
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
	}).then((resp) => {
		if (resp.status === 200) {
			console.log(JSON.parse(resp));
		}
		return resp;
	});
	console.log(await response.json());
}

async function postCommentJira(issueId, comment, host, jiraUser, jiraPassword) {
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

const getGithubData = (res, req, accessToken) => {
	fetch(`https://api.github.com/user?access_token=${accessToken}`,
		{
			uri: `https://api.github.com/user?access_token=${accessToken}`,
			method: 'GET',
			headers:
      {
      	'User-Agent': 'SampleOAuth',
      	Authorization: `Token ${accessToken}`
      }
		}
	)
		.then((response) => response.json())
		.then(async (json) => {
			console.log('JSON in GetGitHubData');
			console.log(json);
			req.body = json;
			req.body.githubToken = accessToken;
			try {
				await mongo.findOrRegisterGithub(req.body);
				passport.authenticate('github-local', (error, user) => {
					if (error || !user) res.json({ error: 'Authentication Error' });
					req.logIn(user, (LoginError) => {
						if (LoginError) {
							res.json({ error: 'Login Error' });
						} else {
							res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
							res.header('Access-Control-Allow-Credentials', 'true');
							res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
							res.json({
								login: user.github.login,
								id: user.github.id
							});
						}
					});
				})(req, res);
			} catch (error) {
				console.log('getGithubData error:', error);
				res.sendStatus(400);
			}
		});
};

async function exportSingleFeatureFile(_id, source) {
	const dbStory = mongo.getOneStory(_id, source);
	return dbStory.then(async (story) => {
		return pfs.readFile(`./features/${this.cleanFileName(story.title + story._id.toString())}.feature`, 'utf8')
			.catch((err) => console.log('couldn`t read File'));
	});
}

async function exportProjectFeatureFiles(repoId) {
	const dbStories = mongo.getAllStoriesOfRepo(repoId);
	return dbStories.then(async (stories) => {
		console.log(stories);
		const zip = new AdmZip();
		return Promise.all(stories.map(async (story) => {
			try {
				await zip.addLocalFile(`features/${this.cleanFileName(story.title + story._id.toString())}.feature`);
				console.log('add FF');
			} catch (e) { console.log('file not found'); }
		})).then(() => zip.toBuffer());
	});
}

/**
 * validates Github username and reponame
 * @param {string} userName
 * @param {string} repoName
 * @returns boolean, true if they are valid
 */
function checkValidGithub(userName, repoName) {
	const githubUsernameCheck = new RegExp(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i); // https://github.com/shinnn/github-username-regex
	const githubReponameCheck = new RegExp(/^([a-z\d._-]){0,100}$/i);
	return !!(githubUsernameCheck.test(userName.toString()) && githubReponameCheck.test(repoName.toString()));
}

module.exports = {
	checkValidGithub,
	getReportHistory,
	uniqueRepositories,
	getGithubData,
	cleanFileName,
	getFeatureContent,
	getScenarioContent,
	writeFile,
	ownRepositories,
	fuseStoryWithDb,
	getExamples,
	getSteps,
	jsUcfirst,
	getBackgroundContent,
	getBackgroundSteps,
	getValues,
	updateFeatureFile,
	deleteFeatureFile,
	exportSingleFeatureFile,
	exportProjectFeatureFiles,
	runReport,
	starredRepositories,
	dbProjects
};
