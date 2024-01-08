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
const moment = require('../node_modules/moment');

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
	let parameters = {};

	if (mode === 'scenario') {
		const scenario = story.scenarios.find((elem) => elem.scenario_id === parseInt(req.params.scenarioId, 10));

		const scenarioCount = Math.max(scenario.stepDefinitions.example.length, 1);
		parameters = {
			scenarios: Array.from({ length: scenarioCount }).map(() => ({
				browser: scenario.browser || 'chrome',
				waitTime: scenario.stepWaitTime || 0,
				daisyAutoLogout: scenario.daisyAutoLogout || false,
				...(scenario.emulator !== undefined && { emulator: scenario.emulator })
			}))
		};
	} else if (mode === 'feature' || mode === 'group') {
		const prep = scenarioPrep(story.scenarios, story.oneDriver);
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
		...(mode === 'scenario' ? ['--tags', `@${req.params.issueID}_${req.params.scenarioId}`] : []),
		'--format', `json:${path.normalize(jsonPath)}`,
		'--world-parameters', jsParam,
		'--exit'
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
			resolve({
				reportTime, story, scenarioId: req.params.scenarioId, reportName
			});
		});

		runner.on('exit', () => {
			console.log('test finished');
			resolve({
				reportTime, story, scenarioId: req.params.scenarioId, reportName
			});
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
				...(scenario.emulator !== undefined && { emulator: scenario.emulator })
			});
		} else {
			scenario.stepDefinitions.example.forEach((examples, index) => {
				if (index > 0) {
					parameters.scenarios.push({
						browser: scenario.browser,
						waitTime: scenario.stepWaitTime,
						daisyAutoLogout: scenario.daisyAutoLogout,
						oneDriver: driver,
						...(scenario.emulator !== undefined && { emulator: scenario.emulator })
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
		let storyStatus = uploadedReport.status;
		if (uploadedReport.status === true) {
			const scenarios = await mongo.getOneStory(uploadedReport.storyId).then((story) => story.scenarios);
			const updateIndex = scenarios.findIndex((scen) => scen.scenario_id === uploadedReport.scenarioId);
			console.log(scenarios, storyStatus, updateIndex, uploadedReport.scenarioId);
			scenarios[updateIndex].lastTestPassed = uploadedReport.status;
			storyStatus = scenarios.every((scen) => !!scen.lastTestPassed === true);
		}
		updateStoryTestStatus(uploadedReport.storyId, storyStatus, [{ scenarioId: uploadedReport.scenarioId, status: uploadedReport.status }]);
	} catch (e) {
		console.log('Could not Update Scenario LastTestPassed.', e);
	}
}

async function replaceRefBlocks(scenarios) {
	if (!scenarios.some((scen) => scen.hasRefBlock)) return scenarios;
	const retScenarios = [];
	for (const scen of scenarios) {
		const stepdef = {};
		// eslint-disable-next-line guard-for-in
		for (const steps in scen.stepDefinitions) { // iterate over given, when, then
			const promised = await scen.stepDefinitions[steps].map(async (elem) => {
				if (!elem._blockReferenceId) return [elem];
				return mongo.getBlock(elem._blockReferenceId).then((block) => {
					// Get an array of the values of the given, when, then and example properties
					const steps = Object.values(block.stepDefinitions);
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

function applyDateCommand(str) {
	console.log(str);
	let indices = [
		str.indexOf('@@Day'),
		str.indexOf('@@Month'),
		str.indexOf('@@Year'),
		str.indexOf('@@Date')
	];

	// Filtere alle Indizes heraus, die -1 sind (nicht gefunden)
	indices = indices.filter((index) => index !== -1);

	// Wenn das Array leer ist, wurden keine Substrings gefunden
	if (indices.length === 0) {
		return -1;
	}

	// Finde den niedrigsten Index (die erste Vorkommen)
	const start = Math.min(...indices);

	const endString = str.substring(start);
	const end = start + (endString.indexOf(' ') === -1 ? endString.length : endString.indexOf(' '));

	const date = calcDate(str.substring(start, end));

	const startToDate = str.substring(0, start);
	const dateToEnd = str.substring(end);

	return startToDate + date + dateToEnd;
}

function calcDate(value) {
	// Regex that matches the middle: e.g. +@@Day,2-@@Month,4 ....
	const mid_regex = /(^((\+|\-)@@(\d+),(Day|Month|Year))*)|(^\s*$)/;
	// Regex that matches the format end: e.g @@format:DDMMYY€€
	const end_regex = /(^(@@format:\w*€€)*)|(^\s*$)/;

	function getStart(str) {
		let endIndex = str.length;
		const symbols = ['+', '-', '@@format'];

		symbols.forEach((symbol) => {
			const symbolIndex = str.indexOf(symbol);
			if (symbolIndex !== -1 && symbolIndex < endIndex) endIndex = symbolIndex;
		});
		return str.substring(0, endIndex);
	}

	function getMid(str) {
		let endIndex = str.length;
		const symbols = ['@@format'];

		symbols.forEach((symbol) => {
			const symbolIndex = str.indexOf(symbol);
			if (symbolIndex !== -1 && symbolIndex < endIndex) endIndex = symbolIndex;
		});
		return str.substring(0, endIndex);
	}
	const start = getStart(value).replace(' ', '');
	const mid = getMid(value.replace(start, '')).replace(' ', '');
	const end = mid.replace(mid, '').trim();

	// check if the start part is written correctly
	const dates = start.split(/@@Date/);
	const substrings = [/@@Day,\d{1,2}|@@Day/, /@@Month,\d{1,2}|@@Month/, /@@Year,\d{4}|@@Year/];
	const substringsErr = ['@@Day', '@@Month', '@@Year'];
	// check if @@Date has been used
	if (dates.length > 1) if (dates.length - 1 > 1) throw Error('@@Date should only be used once.');
	else for (let i = 0; i < substrings.length; i++) {
		if (substrings[i].test(start)) throw Error(`@@Date should only be used by itself. Found: ${substringsErr[i]}`);
	}

	// check the correct usage of @@Day, @@Month, @@Year
	else {
		let startcopy = start.slice();
		for (let i = 0; i < substrings.length; i++) {
			if (start.split(substrings[i]).length - 1 > 1) throw Error(`${substringsErr[i]} may only be used 0 or 1 time. Input: ${start}`);
			startcopy = startcopy.replace(substrings[i], '');
		}
		// if (startcopy.length !== 0) throw Error(`Unkown tokens in the start section: ${startcopy}`);
	}

	// check if the calculation part is written correctly
	if (!mid_regex.test(mid)) throw Error('Error parsing the calculation section. Example: +@@23,Day-@@Month,1');

	// check if the format part is written correctly
	if (!end_regex.test(end)) throw Error('Error parsing the format section. Example: @@format:XXXXXX€€. Where XXXXX is the Format String. Example: @@format:DD-MM-YY');

	// Get the format e.g @@format:XXXXX€€
	let format = value.match(/(@@format:.*€€)/g);

	// Start Date
	const currDate = new Date();
	let day = value.match(/(@@Day,\d{1,2})/g);
	if (day) day = parseInt(day[0].match(/@@Day,(\d+)/)[1]);
	let month = value.match(/(@@Month,\d{1,2})/g);
	if (month) month = parseInt(month[0].match(/@@Month,(\d+)/)[1] - 1);
	let year = value.match(/(@@Year,\d\d\d\d)/g);
	if (year) year = parseInt(year[0].match(/@@Year,(\d+)/)[1]);

	currDate.setFullYear(
		year == null ? currDate.getFullYear() : year,
		month == null ? currDate.getMonth() : month,
		day == null ? currDate.getDate() : day
	);

	// If no format was found, check the given format e.g. @@Date, @@Day@@Month, @@Day ...
	if (format == null) {
		// Get the Substring until the first add,sub or format e.g @@Day@@Month+@@ ... -> @@Day@@Month
		format = value.split(/[\+\-]/)[0];
		// Replace the @@Day, @@Month, @@Year
		format = format.replace(/@@Day(,(\d\d){1,2}){0,1}/, 'DD.').replace(/@@Month(,(\d\d){1,2}){0,1}/, 'MM.')
			.replace(/@@Year(,(\d\d\d\d)){0,1}/, 'YYYY.')
			.replace('@@Date', 'DD.MM.YYYY.')
			.slice(0, -1);
	} else
		// Get @@format: tag and €€ at the end
		format = format[0].slice(9, -2);

	// console.log(`Day: ${day}\nMonth: ${month}\nYear: ${year}\nFormat: ${format}\nDate: ${currDate.toDateString()}`);

	// Get all adds e.g +@@2,Month
	let adds = value.match(/\+@@(\d+),(\w+)/g);
	// Read values e.g. of +@@5,Day -> {number: 5, kind: "Day"}; or set to empty array if null (no match)
	adds = adds ? adds.map((element) => {
		const match = element.match(/\+@@(\d+),(\w+)/);
		return { number: parseInt(match[1]), kind: match[2] };
	}) : [];
	// Get all subs e.g -@@10,Year
	let subs = value.match(/\-@@(\d+),(\w+)/g);
	// Read values e.g. of -@@2,Month -> {number: 2, kind: "Month"}; or set to empty array if null (no match)
	subs = subs ? subs.map((element) => {
		const match = element.match(/\-@@(\d+),(\w+)/);
		return { number: parseInt(match[1]), kind: match[2] };
	}) : [];

	// Add every add in the adds array
	adds.forEach((add) => {
		switch (add.kind) {
			case 'Day':
				currDate.setDate(currDate.getDate() + add.number);
				break;
			case 'Month':
				currDate.setMonth(currDate.getMonth() + add.number);
				break;
			case 'Year':
				currDate.setFullYear(currDate.getFullYear() + add.number);
				break;
			default:
				Error(`Unknown type to add to the date: ${add.kind}`);
		}
	});

	// Substract every sub in the subs array
	subs.forEach((sub) => {
		switch (sub.kind) {
			case 'Day':
				currDate.setDate(currDate.getDate() - sub.number);
				break;
			case 'Month':
				currDate.setMonth(currDate.getMonth() - sub.number);
				break;
			case 'Year':
				currDate.setFullYear(currDate.getFullYear() - sub.number);
				break;
			default:
				Error(`Unknown type to substract of the date: ${sub.kind}`);
		}
	});

	// Format the date
	const result = moment(currDate).format(format);
	return result;
}

function applySpecialCommands(str) {
	let appliedCommandsString = str;
	if (str.includes('@@Day') || str.includes('@@Month') || str.includes('@@Year') || str.includes('@@Date')) {
		appliedCommandsString = applyDateCommand(str);
	}
	return appliedCommandsString;
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
	exportProjectFeatureFiles,
	applySpecialCommands
};
