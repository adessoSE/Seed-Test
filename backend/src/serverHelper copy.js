/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle,curly */
const fs = require('fs');
const pfs = require('fs/promises');
const path = require('path');
const AdmZip = require('adm-zip');
const mongo = require('./database/DbServices');
const moment = require('../node_modules/moment');

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
		return str;
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

/**
* Applies the special commands to a string.
* Special commands are marked via: {Regex: TEXT}.
* return the string with the special commands applied.
*/
function applySpecialCommands(str) {
	const pattern = /(((((@@(Day|Month|Year),(\d\d?\d?\d?))+)|(@@((\d|\d\d),)?[a-zA-Z]+))((\+|-)(@@((\d|\d\d),)?[a-zA-Z]+))+)|(((@@(Day|Month|Year),(\d\d?\d?\d?))+)|(@@((\d|\d\d),)?[a-zA-Z]+)))(@@format:.*€€)?/g;
	let appliedCommandsString = str;

	// appliedCommandsString = applyDateCommand(str);
	appliedCommandsString = str.replace(pattern, (match) => applyDateCommand(match));
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
