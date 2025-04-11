const { exit } = require('process');
const bcrypt = require('bcrypt');
const dbService = require('./DbServices');
require('dotenv').config();

const exampleUser = 'seed@test.de';
const examplePassword = 'seedtest';
const exampleStory = 'Example Story';
const exampleDescription = 'Example Description';
const exampleScenario = {
	scenario_id: 1,
	name: 'Example Scenario',
	comment: null,
	stepDefinitions: {
		given: [
			{
				id: 1,
				mid: '',
				pre: 'I am on the website:',
				stepType: 'given',
				type: 'Website / URL',
				values: [
					'https://www.youtube.com/'
				],
				isExample: [
					false
				]
			}
		],
		when: [],
		then: [
			{
				id: 1,
				mid: '',
				pre: 'I take a screenshot. Optionally: Focus the page on the element',
				stepType: 'then',
				type: 'Screenshot',
				values: [
					''
				],
				isExample: [
					false
				]
			}
		],
		example: []
	},
	browser: 'chromium',
	lastTestPassed: null
};

const uri = process.env.DATABASE_URI || 'mongodb://SeedAdmin:SeedTest@localhost:27017';

async function insertExampleUser() {
	try {
		// eslint-disable-next-line max-len
		const result = await dbService.registerUser({ email: exampleUser, password: bcrypt.hashSync(examplePassword, bcrypt.genSaltSync(10)) });
		console.log('\x1b[32mExample-User inserted! \n\x1b[0m');
		return result;
	} catch (error) {
		console.log(`\x1b[31m${error} \x1b[0m`);
		return dbService.getUserByEmail(exampleUser);
	}
}

async function insertExampleTest(user) {
	try {
		// createRepository
		const repoId = await dbService.createRepo(user.insertedId, 'Test Repo');
		console.log('\x1b[32mExample-Repo inserted! \n\x1b[0m');
		// createStory
		const storyId = await dbService.createStory(exampleStory, exampleDescription, repoId);
		await dbService.insertStoryIdIntoRepo(storyId, repoId);
		console.log('\x1b[32mExample-Story inserted! \n\x1b[0m');
		// fillTestScenario
		await dbService.updateScenario(storyId, exampleScenario);
		console.log('\x1b[32mExample-Scenario-Data inserted! \n\x1b[0m');
	} catch (error) {
		console.log(`\x1b[31m${error} \x1b[0m`);
	}
}

async function insertExampleData() {
	// wait to give establishConnection enough time to establish connection xD
	await new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, 1500);
	});
	console.log(`\x1b[33mSetting Up DB-Exampel-Data in: ${uri}\n\x1b[0m`);
	console.log('\x1b[34mInserting Example User: \x1b[0m');
	const user = await insertExampleUser();
	console.log('\x1b[34mInserting Example Test: \x1b[0m');
	await insertExampleTest(user);
	console.log('\x1b[32mExample-Data set up! \x1b[0m');
}

insertExampleData().then(() => {
	exit();
})
	.catch((err) => {
		console.error(err);
		exit(1);
	});
