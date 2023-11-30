/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle,curly */
const ch = require('child_process');
const fs = require('fs');
const pfs = require('fs/promises');
const path = require('path');
const AdmZip = require('adm-zip');
const os = require('os');
const mongo = require('./database/DbServices');
const { log } = require('console');

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
			data += `${step.pre} '${step.values[0]}' ${step.mid}${step.values[1] ? `'${step.values[1]}'` : ''}`;
			if (step.post !== undefined) data += ` ${step.post}${step.values[2] ? `'${step.values[2]}'` : ''}`;
		} else if ((step.values[0]) === 'User') data += `${step.pre} '${step.values[0]}'`;
		else {
			data += `${step.pre} ${step.mid}${getValues(step.values)}`;
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

// parse Steps from stepDefinition container to feature content
async function parseSteps(steps) {
	let data = '';
	if (steps.given !== undefined) data += `${getSteps(steps.given, Object.keys(steps)[0])}\n`;
	if (steps.when !== undefined) data += `${getSteps(steps.when, Object.keys(steps)[1])}\n`;
	if (steps.then !== undefined) data += `${getSteps(steps.then, Object.keys(steps)[2])}\n`;
	return data;
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
		if (scenario.comment !== null) {
			data += `# Comment:\n#  ${scenario.comment.replaceAll(/\n/g, '\n#  ')}\n\n`;
		}
	}
	return data;
}

// Building feature file story-name-content (feature file title)
function getFeatureContent(story) {
	let body = '';
	if (story.body !== null && story.body !== undefined) {
		body = story.body.replaceAll('#', '').replaceAll('(/)', '');
	}
	let data = `Feature: ${story.title}\n\n${body}\n\n`;

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
function writeFile(story) {
	const filename = story.title + story._id;
	fs.writeFile(path.join(
		__dirname,
		'../features',
		`${cleanFileName(filename)}.feature`
	), getFeatureContent(story), (err) => {
		if (err) throw err;
	});
}

// Updates feature file based on _id
async function updateFeatureFile(issueID) {
	const story = await mongo.getOneStory(issueID);
	if (story != null) {
		story.scenarios = await replaceRefBlocks(story.scenarios);
		writeFile(story);
	};
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

/*
* Use global values if global settings are activated, else use local sceneraio values
*/
function getSettings(scenario, globalSettings) {
	const finalSettings = {
		browser: scenario.browser || 'chrome',
		waitTime: scenario.stepWaitTime || 0,
		daisyAutoLogout: scenario.daisyAutoLogout || false
	};

	// if globalSettings are activated, then use global values
	if (globalSettings && globalSettings.activated) {
		finalSettings.browser = globalSettings.browser || finalSettings.browser;
		finalSettings.waitTime = globalSettings.stepWaitTime || finalSettings.waitTime;
		// if emulator is activated, use emulator
		if (globalSettings.emulator !== undefined) {
			finalSettings.emulator = globalSettings.emulator;
			// if emulator is no activated, use custom window size
		} else if (globalSettings.width !== undefined && globalSettings.height !== undefined) {
			finalSettings.windowSize = {
				height: Number(globalSettings.height),
				width: Number(globalSettings.width)
			};
		}
		// else use local values from scenario
	} else {
		// if emulator is activated, use emulator
		if (scenario.emulator !== undefined) {
			finalSettings.emulator = scenario.emulator;
			// if emulator is no activated, use custom window size
		} else if (scenario.width !== undefined && scenario.height !== undefined) {
			finalSettings.windowSize = {
				height: Number(scenario.height),
				width: Number(scenario.width)
			};
		}
	}

	return finalSettings;
}

async function executeTest(req, mode, story) {
	const repoId = req.body.repositoryId;

	let globalSettings;

	// get repo globalsettings from database
	try {
		globalSettings = await mongo.getRepoSettingsById(repoId);
	} catch (error) {
		console.error('Error during fetching global settings:', error);
		return;
	}

	let parameters = {};

	if (mode === 'scenario') {
		const scenario = story.scenarios.find(elem => elem.scenario_id === parseInt(req.params.scenarioId, 10));
		const scenarioCount = Math.max(scenario.stepDefinitions.example.length, 1);

		const additionalParams = getSettings(scenario, globalSettings);

		parameters = {
			scenarios: Array.from({ length: scenarioCount }).map(() => ({
				...additionalParams
			}))
		};
	} else if (mode === 'feature' || mode === 'group') {
		const prep = scenarioPrep(story.scenarios, story.oneDriver, globalSettings);
		story.scenarios = prep.scenarios;
		parameters = prep.parameters;
	}

	const reportTime = Date.now();
	const cucePath = 'node_modules/.bin/';
	const featurePath = `../../features/${cleanFileName(story.title + story._id)}.feature`;
	const reportName = req.user && req.user.github ? `${req.user.github.login}_${reportTime}` : `reporting_${reportTime}`;

	try {
		await fs.promises.access(featurePath, fs.constants.F_OK);
	} catch (err) {
		await updateFeatureFile(story._id, req.params.storySource);
	}

	let jsonPath = `../../features/${reportName}.json`;
	if (mode === 'group') {
		const grpDir = req.body.name;
		jsonPath = `../../features/${grpDir}/${reportName}.json`;
	}

	const jsParam = JSON.stringify(parameters);
	const cucumberArgs = [
		path.normalize(featurePath),
		...(mode === 'scenario' ? [`--tags`, `@${req.params.issueID}_${req.params.scenarioId}`] : []),
		`--format`, `json:${path.normalize(jsonPath)}`,
		`--world-parameters`, jsParam,
		`--exit`
	];

	const cmd = os.platform().includes('win') ? '.cmd' : '';
	const cucumberCommand = `cucumber-js${cmd}`;
	const cucumberPath = path.normalize(`${__dirname}/../${cucePath}`);

	console.log('\nExecuting:');
	console.log(`Working Dir: "${cucumberPath}"`);
	console.log(`Command: "${cucumberCommand}"`);
	console.log(`Args: [${cucumberArgs}]\n`);

	const runner = ch.spawn(cucumberCommand, cucumberArgs, { cwd: cucumberPath });

	runner.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`);
	});
	runner.stderr.on('data', (data) => { console.log(`stderr: ${data}`); });

	return new Promise((resolve) => {
		runner.on('error', (error) => {
			console.error(`exec error: ${error}`);
			resolve({ reportTime, story, scenarioId: req.params.scenarioId, reportName });
		});
		runner.on('exit', () => {
			resolve({ reportTime, story, scenarioId: req.params.scenarioId, reportName });
		});
	});
}

function scenarioPrep(scenarios, driver, globalSettings) {
	const parameters = { scenarios: [] };

	scenarios.forEach((scenario) => {
		// eslint-disable-next-line no-param-reassign
		if (!scenario.stepWaitTime) scenario.stepWaitTime = 0;
		// eslint-disable-next-line no-param-reassign
		if (!scenario.browser) scenario.browser = 'chrome';
		// eslint-disable-next-line no-param-reassign
		if (!scenario.daisyAutoLogout) scenario.daisyAutoLogout = false;

		const additionalParams = getSettings(scenario, globalSettings);

		if (scenario.stepDefinitions.example.length <= 0) {
			parameters.scenarios.push({
				oneDriver: driver,
				...additionalParams
			});
		} else {
			scenario.stepDefinitions.example.forEach((index) => {
				if (index > 0) {
					parameters.scenarios.push({
						oneDriver: driver,
						...additionalParams
					});
				}
			});
		}
	});
	return { scenarios, parameters };
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

async function replaceRefBlocks(scenarios) {
	if (!scenarios.some((scen) => scen.hasRefBlock)) return scenarios;
	const retScenarios = [];
	for (const scen of scenarios) {
		let stepdef = {};
		// eslint-disable-next-line guard-for-in
		for (const steps in scen.stepDefinitions) { // iterate over given, when, then
			const promised = await scen.stepDefinitions[steps].map(async (elem) => {
				if (!elem._blockReferenceId) return [elem];
				return mongo.getBlock(elem._blockReferenceId).then((block) => {
					// Get an array of the values of the given, when, then and example properties
					let steps = Object.values(block.stepDefinitions);
					// Flatten array
					return steps.flat(1);
				});
			});
			stepdef[steps] = await Promise.all(promised).then((resSteps) => resSteps.flat(1));
		}
		scen.stepDefinitions = stepdef;
		retScenarios.push(scen);
	}
	return retScenarios;
}

async function exportSingleFeatureFile(_id) {
	const dbStory = mongo.getOneStory(_id);
	return dbStory.then(async (story) => {
		story.scenarios = await replaceRefBlocks(story.scenarios);
		writeFile(story);
		return pfs.readFile(`./features/${this.cleanFileName(story.title + story._id.toString())}.feature`, 'utf8')
			.catch((err) => console.log('couldn`t read File'));
	});
}

async function exportProjectFeatureFiles(repoId, versionId) {
	const dbStories = mongo.getAllStoriesOfRepo(repoId);
	return dbStories.then(async (stories) => {
		const zip = new AdmZip();
		return Promise.all(stories.map(async (story) => {
			story.scenarios = await replaceRefBlocks(story.scenarios);
			writeFile(story);
			const postfix = versionId ? `-v${versionId}` : '';
			const filename = this.cleanFileName(story.title + story._id.toString());
			const file = await pfs.readFile(`./features/${filename}.feature`, 'utf8').catch((err) => { console.log('Couldn\'t read file'); });
			if (file != null) {
				zip.addFile(`${filename + postfix}.feature`, file);
			}
		})).then(() => zip.toBuffer());
	});
}

module.exports = {
	executeTest,
	updateLatestTestStatus,
	getReportHistory,
	cleanFileName,
	getFeatureContent,
	getScenarioContent,
	writeFile,
	getExamples,
	getSteps,
	getBackgroundContent,
	getBackgroundSteps,
	getValues,
	updateFeatureFile,
	deleteFeatureFile,
	exportSingleFeatureFile,
	exportProjectFeatureFiles
};
