/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle,curly */
const { exec } = require('child_process');
const fs = require('fs');
const { XMLHttpRequest } = require('xmlhttprequest');
const path = require('path');
const fetch = require('node-fetch');
const reporter = require('cucumber-html-reporter');
const lodash = require('lodash');
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const passport = require('passport');
const mongo = require('./database/DbServices');
const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');

const rootPath = path.normalize('features');
const featuresPath = path.normalize('features/');

const cryptoAlgorithm = 'aes-192-cbc';
const key = crypto.scryptSync(process.env.JIRA_SECRET, process.env.JIRA_SALT, 24);
const iv = Buffer.alloc(16, 0);

// this is needed for the html report
const options = {
	theme: 'bootstrap',
	jsonFile: 'features/reporting.json',
	output: 'features/reporting_html.html',
	reportSuiteAsScenarios: true,
	launchReport: false,
	storeScreenshots: false,
	screenshotsDirectory: 'features/screenshots/',
	metadata: {
		'App Version': '0.3.2',
		'Test Environment': 'STAGING',
		GoogleChromeShiv: process.env.GOOGLE_CHROME_SHIM,
		Parallel: 'Scenarios',
		Executed: 'Remote'
	}
};

// Time after which the report is deleted in minutes
const reportDeletionTime = process.env.REPORT_DELETION_TIME || 5;

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
		// console.log(`Scenario ID: ${scenario.scenario_id}`);
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
function writeFile(dir, selectedStory) {
	const filename = selectedStory.title + selectedStory._id;
	fs.writeFile(path.join(
		__dirname,
		'../features',
		`${cleanFileName(filename)}.feature`
	), getFeatureContent(selectedStory), (err) => {
		if (err) throw err;
	});
}

function encriptPassword(text) {
	const cipher = crypto.createCipheriv(cryptoAlgorithm, key, iv);
	let encrypted = cipher.update(text, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return encrypted;
}

function decryptPassword(encrypted) {
	const decipher = crypto.createDecipheriv(cryptoAlgorithm, key, iv);
	let decrypted = decipher.update(encrypted, 'hex', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
}

async function updateJira(UserID, req) {
	const password = encriptPassword(req.jiraPassword);
	const jira = {
		AccountName: req.jiraAccountName,
		Password: password,
		Host: req.jiraHost
	};
	const user = await mongo.getUserData(UserID);
	user.jira = jira;
	await mongo.updateUser(UserID, user);
	return 'Successful';
}

// Updates feature file based on _id
async function updateFeatureFile(issueID, storySource) {
	const result = await mongo.getOneStory(issueID, storySource);
	if (result != null) writeFile('', result);
}

function deleteReport(jsonReport) {
	const report = path.normalize(`${featuresPath}${jsonReport}`);
	fs.unlink(report, (err) => {
		if (err) console.log(err);
		else console.log(`${report} deleted.`);
	});
}

function deleteGroupDir(dirName) {
	const dirPath = path.normalize(`${featuresPath}${dirName}`);
	fs.rmdir(dirPath, { recursive: true }, (err) => {
		if (err) console.log(err);
		else console.log(`${dirPath} Folder deleted.`);
	});
}

// returns true if failed = 0 and passed > 1
function testPassed(failed, passed) {
	return failed <= 0 && passed >= 1;
}

function setOptions(reportName, reportPath = 'features/') {
	const myOptions = lodash.cloneDeep(options);
	myOptions.metadata.Platform = process.platform;
	myOptions.name = `Seed-Test Report: ${reportName}`;
	if (reportPath !== 'features/') {
		myOptions.jsonDir = `${reportPath}`;
		myOptions.jsonFile = null;
	} else myOptions.jsonFile = `${reportPath}${reportName}.json`;
	myOptions.output = `${reportPath}${reportName}.html`;
	return myOptions;
}

async function analyzeGroupReport(grpName, stories, reportOptions) {
	const reportResults = {
		reportName: grpName,
		reportOptions,
		overallTestStatus: false,
		storyStatuses: []
	};
	try {
		const reportPath = `./features/${grpName}/${grpName}.html.json`;
		console.log(`Trying to Read: ${reportPath}`);
		fs.readFile(reportPath, 'utf8', (err, data) => {
			const cucumberReport = JSON.parse(data);
			console.log(`NUMBER OF STORIES IN THE Group-Report: ${cucumberReport.length}`);
			// reportResults.json = cucumberReport;
			try {
				const scenariosTested = { passed: 0, failed: 0 };
				let overallPassedSteps = 0;
				let overallFailedSteps = 0;
				let overallSkippedSteps = 0;

				// for each story
				for (const storyReport of cucumberReport) {
					const story = stories[cucumberReport.indexOf(storyReport)];
					const storyId = story._id;
					console.log(` Story ID: ${storyId}`);
					const storyStatus = { storyId, status: false, scenarioStatuses: [] };
					try {
						let storyPassedSteps = 0;
						let storyFailedSteps = 0;
						let storySkippedSteps = 0;

						// for each scenario (called element in the .json report)
						// element = scenarios and "Before" / "After" statements
						for (const scenReport of storyReport.elements) {
							const scenario = story.scenarios[storyReport.elements.indexOf(scenReport)];
							const scenarioId = scenario.scenario_id;
							console.log(` Scenario ID: ${scenarioId}`);
							let scenarioPassedSteps = 0;
							let scenarioFailedSteps = 0;
							let scenarioSkippedSteps = 0;

							// for each step inside a scenario
							for (const step of scenReport.steps) {
								switch (step.result.status) {
									case 'passed':
										storyPassedSteps++;
										scenarioPassedSteps++;
										overallPassedSteps++;
										break;
									case 'failed':
										storyFailedSteps++;
										scenarioFailedSteps++;
										overallFailedSteps++;
										break;
									case 'skipped':
										storySkippedSteps++;
										scenarioSkippedSteps++;
										overallSkippedSteps++;
										break;
									default:
										console.log(`Status default: ${step.result.status}`);
								}
							}
							// add scenarioStatus to storyStatus
							const scenStatus = testPassed(scenarioFailedSteps, scenarioPassedSteps);
							storyStatus.scenarioStatuses.push(
								{
									scenarioId: scenario.scenario_id,
									status: scenStatus,
									stepResults: { passedSteps: scenarioPassedSteps, failedSteps: scenarioFailedSteps, skippedSteps: scenarioSkippedSteps }
								}
							);
							// count number of passed and failed Scenarios:
							if (scenStatus) scenariosTested.passed += 1;
							else scenariosTested.failed += 1;
						}
						// end of For Each Scenario ################################

						// after all Scenarios and Steps:
						// set Story Test status (failed = Nr. of failed Steps | passed = Nr. of passed Steps)
						storyStatus.status = testPassed(storyFailedSteps, storyPassedSteps);
						storyStatus.storyStepResults = { passedSteps: storyPassedSteps, failedSteps: storyFailedSteps, skippedSteps: storySkippedSteps };
						reportResults.storyStatuses.push(storyStatus);
					} catch (error) {
						storyStatus.status = false;
						reportResults.storyStatuses.push(storyStatus);
						console.log('iterating through report Json failed in serverHelper/runReport. Setting testStatus of Story to false.', error);
					}
				}
				// end of for each story
				reportResults.overallTestStatus = testPassed(overallPassedSteps, overallFailedSteps);
				reportResults.groupStepResults = { passedSteps: overallPassedSteps, failedSteps: overallFailedSteps, skippedSteps: overallSkippedSteps };
				reportResults.scenariosTested = scenariosTested;
			} catch (error) {
				reportResults.overallTestStatus = false;
				console.log('iterating through report Json failed in analyzeGroupReport.'
				+ 'Setting testStatus of Report to false.', error);
			}
		});
	} catch (error) {
		console.log(`fs.readFile error for file /features/${grpName}/${grpName}.json`);
	}
	console.log(`Report Results in analyzeGroupReport for Group ${grpName}: `);
	console.log(reportResults);
	return reportResults;
}

async function analyzeScenarioReport(stories, reportName, scenarioId, reportOptions) {
	const reportResults = { reportName, reportOptions, overallTestStatus: false };
	try {
		const reportPath = `./features/${reportName}.json`;
		fs.readFile(reportPath, 'utf8', (err, data) => {
			const cucumberReport = JSON.parse(data);
			console.log(`NUMBER OF STORIES IN THE REPORT (must be 1): ${cucumberReport.length}`);
			// reportResults.json = cucumberReport;
			try {
				const storyReport = cucumberReport[0];
				console.log(`NUMBER OF SCENARIOS IN THE REPORT (must be 1): ${storyReport.elements.length}`);
				const story = stories[0];
				console.log(`Story ID: ${story._id}`);
				console.log(story);
				reportResults.storyId = story._id;
				try {
					// for each scenario (called element in the .json report)
					// element = scenarios and "Before" / "After" statements
					storyReport.elements.forEach((scenReport) => {
						console.log(` Scenario ID: ${scenarioId}`);
						let scenarioPassedSteps = 0;
						let scenarioFailedSteps = 0;
						let scenarioSkippedSteps = 0;
						// for each step inside a scenario
						scenReport.steps.forEach((step) => {
							switch (step.result.status) {
								case 'passed':
									scenarioPassedSteps++;
									break;
								case 'failed':
									scenarioFailedSteps++;
									break;
								case 'skipped':
									scenarioSkippedSteps++;
									break;
								default:
									console.log(`Status default: ${step.result.status}`);
							}
						});
						// set scenario status (for GitHub/Jira reporting comment)
						const scenStatus = testPassed(scenarioFailedSteps, scenarioPassedSteps);
						reportResults.scenarioStatus = {
							scenarioId,
							status: scenStatus,
							stepResults: { passedSteps: scenarioPassedSteps, failedSteps: scenarioFailedSteps, skippedSteps: scenarioSkippedSteps }
						};
						reportResults.overallTestStatus = scenStatus;
					});
					// end of For Each Scenario ################################
				} catch (error) {
					reportResults.overallTestStatus = false;
					console.log('iterating through report Json failed in serverHelper/runReport. '
						+ 'Setting testStatus of Scenario to false.', error);
				}
			} catch (error) {
				reportResults.overallTestStatus = false;
				console.log('iterating through report Json failed in serverHelper/runReport. '
					+ 'Setting testStatus of Report to false.', error);
			}
		});
	} catch (error) {
		console.log(`fs.readFile error for file ./features/${reportName}.json`);
	}
	console.log('Report Results in analyzeScenarioReport: ');
	console.log(reportResults);
	return reportResults;
}

// param: stories should only contain one Story
async function analyzeStoryReport(stories, reportName, reportOptions) {
	let storyStatus = false;
	const reportResults = {
		reportName,
		reportOptions,
		overallTestStatus: false,
		scenarioStatuses: []
	};

	try {
		const reportPath = `./features/${reportName}.json`;
		fs.readFile(reportPath, 'utf8', (err, data) => {
			const cucumberReport = JSON.parse(data);
			console.log(`NUMBER OF STORIES IN THE REPORT (must be 1): ${cucumberReport.length}`);
			// reportResults.json = cucumberReport;
			let storyPassedSteps = 0;
			let storyFailedSteps = 0;
			let storySkippedSteps = 0;
			const scenariosTested = { passed: 0, failed: 0 };
			try {
				// for each story
				const storyReport = cucumberReport[0];
				console.log(`NUMBER OF SCENARIOS IN THE REPORT: ${storyReport.elements.length}`);
				const story = stories[0];
				const storyId = story._id;
				console.log(` Story ID: ${storyId}`);
				reportResults.storyId = storyId;
				try {
					// for each scenario (called element in the .json report)
					// element = scenarios and "Before" / "After" statements
					storyReport.elements.forEach((scenReport) => {
						const scenario = story.scenarios[storyReport.elements.indexOf(scenReport)];
						const scenarioId = scenario.scenario_id;
						console.log(` Scenario ID: ${scenarioId}`);
						let scenarioPassedSteps = 0;
						let scenarioFailedSteps = 0;
						let scenarioSkippedSteps = 0;

						// for each step inside a scenario
						scenReport.steps.forEach((step) => {
							switch (step.result.status) {
								case 'passed':
									storyPassedSteps++;
									scenarioPassedSteps++;
									break;
								case 'failed':
									storyFailedSteps++;
									scenarioFailedSteps++;
									break;
								case 'skipped':
									storySkippedSteps++;
									scenarioSkippedSteps++;
									break;
								default:
									console.log(`Status default: ${step.result.status}`);
							}
						});
						// set scenario status (for GitHub/Jira reporting comment)
						const scenStatus = testPassed(scenarioFailedSteps, scenarioPassedSteps);
						reportResults.scenarioStatuses.push({
							scenarioId,
							status: scenStatus,
							stepResults: { passedSteps: scenarioPassedSteps, failedSteps: scenarioFailedSteps, skippedSteps: scenarioSkippedSteps }
						});
						// count number of passed and failed Scenarios:
						if (scenStatus) scenariosTested.passed += 1;
						else scenariosTested.failed += 1;
					});
					// end of For Each Scenario ################################
					// set test status (failed = Nr. of failed Steps | passed = Nr. of passed Steps)
					storyStatus = testPassed(storyFailedSteps, storyPassedSteps);
				} catch (error) {
					storyStatus = false;
					console.log('iterating through report Json failed in serverHelper/runReport. '
						+ 'Setting testStatus of Scenario to false.', error);
				}
				reportResults.overallTestStatus = storyStatus;
				reportResults.storyStepResults = {
					passedSteps: storyPassedSteps,
					failedSteps: storyFailedSteps,
					skippedSteps: storySkippedSteps
				};
				// moved to scenario
				// reportResults.stepResults = { storyPassedSteps, storyFailedSteps, storySkippedSteps };
			} catch (error) {
				reportResults.overallTestStatus = false;
				console.log('iterating through report Json failed in serverHelper/runReport. '
					+ 'Setting testStatus of Report to false.', error);
			}
		});
	} catch (error) {
		console.log(`fs.readFile error for file ./features/${reportName}.json`);
	}
	console.log('Report Results in analyzeStoryReport: ');
	console.log(reportResults);
	return reportResults;
}

async function failedReportPromise(reportName) {
	return { reportName: `Failed-${reportName}`, overallTestStatus: false };
}

async function analyzeReport(grpName, stories, mode, reportName, scenarioId) {
	let reportOptions;
	switch (mode) {
		case 'scenario':
			reportOptions = setOptions(reportName);
			try {
				reporter.generate(reportOptions);
			} catch (e) {
				console.log(`Could not generate the html Report for ${reportName} 
				inside analyzeReport. Error${e}`);
			}
			return analyzeScenarioReport(stories, reportName, scenarioId, reportOptions);
		case 'feature':
			try {
				reportOptions = setOptions(reportName);
				reporter.generate(reportOptions);
			} catch (e) {
				console.log(`Could not generate the html Report for ${reportName} 
				inside analyzeReport. Error${e}`);
			}
			return analyzeStoryReport(stories, reportName, reportOptions);
		case 'group':
			reportOptions = setOptions(grpName, `features/${grpName}/`);
			try {
				/* after the last story in a group we need to generate the hmtl report
				// which also generates the .json report for all stories (group report)
				 then the actual group report can be analyzed. */
				reporter.generate(reportOptions);
			} catch (e) {
				console.log(`Could not generate the html Report for ${grpName}/${reportName} 
				inside analyzeReport. Error${e}`);
			}
			return analyzeGroupReport(grpName, stories, reportOptions);
		default:
			console.log('Error: No mode provided in analyzeReport');
			return failedReportPromise(reportName);
	}
}

async function execReport(req, res, stories, mode, parameters, callback) {
	try {
		if (mode === 'group') {
			req.body.name = req.body.name.replace(/ /g, '_') + Date.now();
			fs.mkdirSync(`./features/${req.body.name}`);
			for (const story of stories) {
				await nameSchemeChange(story);
				// if mit execution mode "parallel" or "sequential"
				if (parameters.isSequential !== undefined && parameters.isSequential) {
					await executeTest(req, res, stories, mode, story)
						.then((values) => {
							callback(values);
						});
				} else {
					executeTest(req, res, stories, mode, story)
						.then((values) => {
							callback(values);
						});
				}
			}
		} else {
			const story = await mongo.getOneStory(req.params.issueID, req.params.storySource);
			await nameSchemeChange(story);
			executeTest(req, res, stories, mode, story)
				.then((values) => {
					callback(values);
				});
		}
	} catch (error) {
		res.status(404)
			.send(error);
	}
}

async function resolveReport(reportObj, mode, stories, req, res, callback) {
	// move to analyze Report and add callback?
	if ((mode === 'feature' || mode === 'scenario') && stories.length === 0) stories.push(reportObj.story);
	let scenarioId;
	if (req.params.scenarioId !== undefined) {
		scenarioId = req.params.scenarioId;
	}
	const { reportTime } = reportObj;
	let { reportName } = reportObj;

	// analyze Report:
	const reportResults = await analyzeReport(req.body.name, stories, mode, reportName, scenarioId);
	// add everything to reportResult
	reportResults.scenarioId = req.params.scenarioId;
	reportResults.reportTime = reportTime;
	reportResults.mode = mode;
	// Group needs an adjusted Path to Report
	if (mode === 'group') reportName = `${reportResults.reportName}/${reportResults.reportName}`;
	callback(reportResults, reportName);
}

async function runReport(req, res, stories, mode, parameters) {
	// only used when executing multiple stories:
	let cumulate = 1;
	execReport(req, res, stories, mode, parameters, async (reportObj) => {
		// for Group Reports: go to next Story, when it was not the last one
		if (mode === 'group' && cumulate < stories.length) {
			console.log(`CUMULATE Counter = Story Number: ${cumulate}`);
			cumulate++;
		} else {
			resolveReport(reportObj, mode, stories, req, res, (reportResults, reportName) => {
				// generate HTML Report
				console.log('reportName in callback of resolveReport:');
				console.log(reportName);
				console.log('reportResults in callback of resolveReport:');
				console.log(reportResults);
				// upload report to DB
				mongo.uploadReport(reportResults)
					.then((uploadedReport) => {
						// read html Report and add it top response
						fs.readFile(`./features/${reportName}.html`, 'utf8', (err, data) => {
							res.json({ htmlFile: data, reportId: uploadedReport._id });
						});
						updateLatestTestStatus(uploadedReport, mode);
						// delete Group folder
						if (mode === 'group') setTimeout(deleteGroupDir, reportDeletionTime * 60000, `${reportResults.reportName}`);
						else {
							// delete reports in filesystem after a while
							setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.json`);
							setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.html`);
						}
					})
					.catch((error) => {
						console.log(`Could not UploadReport :  ./features/${reportName}.json
						Rejection: ${error}`);
						res.json({ htmlFile: `Could not UploadReport :  ./features/${reportName}.json` });
					});
				// ##################################
				// TODO: update this and add Comment for Jira, when everything else is done
				if (req.params.storySource === 'github' && req.user && req.user.github) {
					//const comment = renderComment(req, passedSteps, failedSteps, skippedSteps, testStatus, scenariosTested,
					//	reportTime, story, scenario, mode, reportName);
					const comment = "Hallo Comment"
					const githubValue = parameters.repository.split('/');
					const githubName = githubValue[0];
					const githubRepo = githubValue[1];
					console.log(stories);
					postComment(stories[0].issue_number, comment, githubName, githubRepo,
						req.user.github.githubToken);
					if (mode === 'feature') updateLabel('testStatus', githubName, githubRepo, req.user.github.githubToken, stories[0].issue_number);
				}
			});
		}
	});
}

const nameSchemeChange = async (story) => {
	// if new scheme doesn't exist
	if (!(await fs.promises.stat(`./${featuresPath}/${cleanFileName(story.title + story._id.toString())}.feature`).catch(() => null))) await updateFeatureFile(story._id, story.storySource);

	// if old scheme still exists
	if (await fs.promises.stat(`./${featuresPath}/${cleanFileName(story.title)}.feature`).catch(() => null)) fs.unlink(`./${featuresPath}/${cleanFileName(story.title)}.feature`, (err) => console.log('failed to remove file', err));
};

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

function executeTest(req, res, stories, mode, story) {
	return new Promise((resolve, reject) => {
		let parameters = {};
		if (mode === 'scenario') {
			const scenario = story.scenarios.find((elem) => elem.scenario_id === parseInt(req.params.scenarioId, 10));
			if (!scenario.stepWaitTime) scenario.stepWaitTime = 0;
			if (!scenario.browser) scenario.browser = 'chrome';
			if (!scenario.daisyAutoLogout) scenario.daisyAutoLogout = false;
			if (scenario.stepDefinitions.example.length <= 0) {
				parameters = {
					scenarios:
				[{
					browser: scenario.browser,
					waitTime: scenario.stepWaitTime,
					daisyAutoLogout: scenario.daisyAutoLogout
				}]
				};
			} else {
				parameters = { scenarios: [] };
				scenario.stepDefinitions.example.forEach((examples, index) => {
					if (index > 0) {
						parameters.scenarios.push({
							browser: scenario.browser,
							waitTime: scenario.stepWaitTime,
							daisyAutoLogout: scenario.daisyAutoLogout
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
		const cucePath = 'node_modules/.bin/cucumber-js';
		const featurePath = `features/${cleanFileName(story.title + story._id)}.feature`;
		const reportName = req.user && req.user.github ? `${req.user.github.login}_${reportTime}` : `reporting_${reportTime}`;

		let jsonPath = `features/${reportName}.json`;
		if (mode === 'group') {
			const grpDir = req.body.name;
			jsonPath = `./features/${grpDir}/${reportName}.json`;
		}

		const jsParam = JSON.stringify(parameters);
		let worldParam = '';
		for (let i = 0; i < jsParam.length; i++) {
			if (jsParam[i] == '"') worldParam += '\\\"';
			else worldParam += jsParam[i];
		}

		console.log('worldParam', worldParam);

		let cmd;
		if (mode === 'feature') cmd = `${path.normalize(cucePath)} ${path.normalize(featurePath)} --format json:${path.normalize(jsonPath)} --world-parameters ${worldParam}`;

		if (mode === 'scenario') cmd = `${path.normalize(cucePath)} ${path.normalize(featurePath)} --tags "@${req.params.issueID}_${req.params.scenarioId}" --format json:${path.normalize(jsonPath)} --world-parameters ${worldParam}`;

		if (mode === 'group') cmd = `${path.normalize(cucePath)} ${path.normalize(featurePath)} --format json:${path.normalize(jsonPath)} --world-parameters ${worldParam}`;

		console.log(`Executing: ${cmd}`);

		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				resolve({
					reportTime, story, scenarioId: req.params.scenarioId, reportName
				});
				return;
			}
			console.log(`stdout: ${stdout}`);
			console.log(`stderr: ${stderr}`);
			resolve({
				reportTime, story, scenarioId: req.params.scenarioId, reportName
			});
		});
	});
}

function scenarioPrep(scenarios, driver) {
	const parameters = { scenarios: [] };
	scenarios.forEach((scenario) => {
		if (!scenario.stepWaitTime) scenario.stepWaitTime = 0;
		if (!scenario.browser) scenario.browser = 'chrome';
		if (!scenario.daisyAutoLogout) scenario.daisyAutoLogout = false;
		if (scenario.stepDefinitions.example.length <= 0) {
			parameters.scenarios.push({
				browser: scenario.browser,
				waitTime: scenario.stepWaitTime,
				daisyAutoLogout: scenario.daisyAutoLogout,
				oneDriver: driver
			});
		} else {
			scenario.stepDefinitions.example.forEach((examples, index) => {
				if (index > 0) {
					parameters.scenarios.push({
						browser: scenario.browser,
						waitTime: scenario.stepWaitTime,
						daisyAutoLogout: scenario.daisyAutoLogout,
						oneDriver: driver
					});
				}
			});
		}
	});
	return { scenarios, parameters };
}

async function jiraProjects(user) {
	return new Promise((resolve) => {
		try {
			if (typeof user !== 'undefined' && typeof user.jira !== 'undefined' && user.jira !== null) {
				// eslint-disable-next-line prefer-const
				let { Host, AccountName, Password } = user.jira;
				Password = decryptPassword(Password);
				const auth = Buffer.from(`${AccountName}:${Password}`)
					.toString('base64');
				const source = 'jira';
				const reqoptions = {
					method: 'GET',
					qs: {
						type: 'page',
						title: 'title'
					},
					headers: {
						'cache-control': 'no-cache',
						Authorization: `Basic ${auth}`
					}
				};
				fetch(`http://${Host}/rest/api/2/issue/createmeta`, reqoptions)
					.then(async () => {
						fetch(`http://${Host}/rest/api/2/issue/createmeta`, reqoptions)
							.then((response) => response.json())
							.then(async (json) => {
								const { projects } = json;
								let names = [];
								let jiraRepo;
								const jiraReposFromDb = await mongo.getAllSourceReposFromDb('jira');
								if (Object.keys(projects).length !== 0) {
									for (const repo of projects) {
										if (!jiraReposFromDb.some((entry) => entry.repoName === repo.name)) {
											jiraRepo = await mongo.createJiraRepo(repo.name);
										} else {
											jiraRepo = jiraReposFromDb.find((element) => element.repoName === repo.name);
										}
										names.push({
											name: repo.name,
											_id: jiraRepo._id
										});
									}
									names = names.map((value) => ({
										_id: value._id,
										value: value.name,
										source
									}));
									resolve(names);
								}
								resolve([]);
							});
					});
			} else resolve([]);
		} catch (e) {
			resolve([]);
		}
	});
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
	return repositories.filter((repo, index, self) => index === self.findIndex((t) => (
		t._id === repo._id
	)));
}

async function execRepositoryRequests(link, user, password, ownerId, githubId) {
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();
		// get Issues from GitHub
		request.open('GET', link, true, user, password);
		request.send();
		request.onreadystatechange = async function () {
			if (this.readyState === 4 && this.status === 200) {
				const data = JSON.parse(request.responseText);
				const projects = [];
				const gitReposFromDb = await mongo.getAllSourceReposFromDb('github');
				let mongoRepo;
				for (const repo of data) {
					// if this Repository is not in the DB create one ind DB
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
			} else if (this.readyState === 4) reject(this.status);
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
	writeFile('', story);
	return story;
}

async function deleteOldReports(reports) {
	const keepReportAmount = process.env.MAX_SAVED_REPORTS;
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

async function createReport(res, reportName) {
	// console.log(`reportName in createReport: ${reportName}`);
	const report = await mongo.getReportByName(reportName);
	const resolvedPath = path.resolve(`features/${reportName}.json`);
	// console.log(`resolvedPath in createReport: ${resolvedPath}`);
	fs.writeFileSync(resolvedPath, report.jsonReport, (err) => { console.log('Error:', err); });
	reporter.generate(setOptions(reportName));
	setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.json`);
	setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.html`);

	const htmlPath = `features/${reportName}.html`;
	const resolvedHtmlPath = path.resolve(htmlPath);
	fs.readFile(resolvedHtmlPath, 'utf8', (err, data) => {
		res.json({ htmlFile: data, reportId: report._id });
	});
}

function updateLatestTestStatus(uploadedReport, mode) {
	switch (mode) {
		case 'scenario':
			updateScenarioTestStatus(uploadedReport);
			break;
		case 'feature':
			updateStoryTestStatus(
				uploadedReport.storyId,
				uploadedReport.overallTestStatus,
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
		await mongo.updateScenarioStatus(uploadedReport.storyId, uploadedReport.scenarioId, uploadedReport.overallTestStatus);
	} catch (e) {
		console.log('Could not Update Scenario LastTestPassed.');
	}
}

function renderComment(
	req,
	stepsPassed,
	stepsFailed,
	stepsSkipped,
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
	const frontendUrl = process.env.FRONTEND_URL;
	const reportUrl = `${frontendUrl}/report/${reportName}`;
	if (mode === 'scenario') comment = `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Scenario: "${scenario.name}"\n### Test passed: ${testStatus}${testPassedIcon}\nSteps passed: ${stepsPassed} :white_check_mark:\nSteps failed: ${stepsFailed} :x:\nSteps skipped: ${stepsSkipped} :warning:\nLink to the official report: [Report](${reportUrl})`;
	else comment = `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Story: "${story.title}"\n### Test passed: ${testStatus}${testPassedIcon}\nScenarios passed: ${scenariosTested.passed} :white_check_mark:\nScenarios failed: ${scenariosTested.failed} :x:\nLink to the official report: [Report](${reportUrl})`;
	return comment;
}


async function postComment(issueNumber, comment, githubName, githubRepo, password) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/comments`;
	const auth = 'Basic ' + Buffer.from(`${githubName}:${password}`, 'binary').toString('base64')
	/** @type {Response} */
	const response = await fetch(link, {
		method: 'post',
		body: JSON.stringify({body:comment}),
		headers: {'Authorization': auth}
	}).then((resp) => {
		if( resp.status === 200 ) {
			const data = JSON.parse(resp)
			console.log(data)
		}
		return resp
	})
	const data = await response.json();

	console.log(data);
}

function addLabelToIssue(githubName, githubRepo, password, issueNumber, label) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels`;
	const body = { labels: [label] };
	const request = new XMLHttpRequest();
	request.open('POST', link, true, githubName, password);
	request.send(JSON.stringify(body));
	request.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			const data = JSON.parse(request.responseText);
		}
	};
}

function removeLabelOfIssue(githubName, githubRepo, password, issueNumber, label) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels/${label}`;
	const req = new XMLHttpRequest();
	req.open('DELETE', link, true, githubName, password);
	req.send();
	req.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			const data = JSON.parse(req.responseText);
		}
	};
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
	fetch(
		`https://api.github.com/user?access_token=${accessToken}`,
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
				await mongo.findOrRegister(req.body);
				passport.authenticate('github-local', (error, user) => {
					if (error || !user) res.json({ error: 'Authentication Error' });
					req.logIn(user, (LoginError) => {
						if (LoginError) {
							res.json({ error: 'Login Error' });
						} else {
							res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
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
	return await dbStory.then(async (story) => {
		await this.nameSchemeChange(story);
		return new Promise((resolve, reject) => {
			fs.readFile(`./features/${this.cleanFileName(story.title + story._id.toString())}.feature`, 'utf8', (err, data) => {
				if (err) {
					console.log('couldn`t read File');
					reject();
				}
				resolve(data);
			});
		});
	});
}

async function exportProjectFeatureFiles(repoId) {
	const dbStories = mongo.getAllStoriesOfRepo(null, null, repoId);
	return dbStories.then(async (stories) => {
		console.log(stories);
		const zip = new AdmZip();
		return await Promise.all(stories.map(async (story) => {
			await this.nameSchemeChange(story);
			try {
				await zip.addLocalFile(`features/${this.cleanFileName(story.title + story._id.toString())}.feature`);
				console.log('add FF');
			} catch (e) { console.log('file not found'); }
		})).then(() => zip.toBuffer());
	});
}

module.exports = {
	// deleteOldReports,
	getReportHistory,
	uniqueRepositories,
	jiraProjects,
	getGithubData,
	createReport,
	decryptPassword,
	cleanFileName,
	options,
	deleteReport,
	execRepositoryRequests,
	setOptions,
	execReport,
	getFeatureContent,
	getScenarioContent,
	writeFile,
	ownRepositories,
	fuseStoryWithDb,
	nameSchemeChange,
	updateJira,
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
