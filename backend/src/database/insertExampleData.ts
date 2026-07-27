import { exit } from 'process';
import bcrypt from 'bcrypt';
import * as userService from '../services/user.service.js';
import * as repositoryService from '../services/repository.service.js';
import * as storyService from '../services/story.service.js';
import { Scenario } from '@shared/models/Scenario.js';
import { User } from '@shared/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const exampleUserEmail = 'seed@test.de';
const examplePassword = 'seedtest';
const exampleStoryTitle = 'Example Story';
const exampleDescription = 'Example Description';
const exampleScenarioData: Partial<Scenario> = { // Use Partial as DB _id is missing initially
	scenario_id: 1,
	name: 'Example Scenario',
	comment: '', // Changed from null to empty string for consistency
	stepDefinitions: {
		given: [
			{
				id: 1, // Changed id to number
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
				id: 1, // Changed id to number
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
	lastTestPassed: undefined // Use undefined instead of null
};

const saltRounds = 10; // Define salt rounds for bcrypt

/**
 * Inserts the example user if they don't exist.
 * @returns The user object (either newly created or existing).
 */
async function insertExampleUser(): Promise<User | null> {
	try {
		const existingUser = await userService.getUserByEmail(exampleUserEmail);
		if (existingUser) {
			console.log('\x1b[33mExample-User already exists.\x1b[0m');
			return existingUser;
		}
        
		const hashedPassword = await bcrypt.hash(examplePassword, saltRounds);
		const userToRegister: Partial<User> = { 
			email: exampleUserEmail, 
			password: hashedPassword,
			transitioned: true // Mark as using new hash format
		};
		const result = await userService.registerUser(userToRegister);
		console.log('\x1b[32mExample-User inserted!\x1b[0m');
		// Fetch the newly created user to get the full object with _id
		return await userService.getUserById(result.insertedId);
	} catch (error: any) {
		console.error(`\x1b[31mError inserting/finding example user: ${error.message}\x1b[0m`);
		return null; // Return null on error
	}
}

/**
 * Inserts example repository, story, and scenario for the given user.
 * @param user The user object to associate the data with.
 */
async function insertExampleTest(user: User): Promise<void> {
	if (!user?._id) {
		console.error('\x1b[31mCannot insert example test without a valid user.\x1b[0m');
		return;
	}
    
	try {
		// Check if repo already exists for this user
		const existingRepos = await repositoryService.getRepository(user._id.toString());
		let repoId: string;
		const exampleRepo = existingRepos.find(r => r.repoName === 'Test Repo' && r.source === 'db');

		if (exampleRepo) {
			console.log('\x1b[33mExample-Repo already exists.\x1b[0m');
			repoId = exampleRepo._id!.toString();
		} else {
			const repoResult = await repositoryService.createRepo(user._id.toString(), 'Test Repo');
			repoId = repoResult.toString();
			console.log('\x1b[32mExample-Repo inserted!\x1b[0m');
		}

		// Check if story already exists in this repo
		const existingStories = await storyService.getAllStoriesOfRepo(repoId);
		let storyId: string;
		const exampleStory = existingStories.find(s => s.title === exampleStoryTitle);

		if (exampleStory) {
			console.log('\x1b[33mExample-Story already exists.\x1b[0m');
			storyId = exampleStory._id!.toString();
		} else {
			const storyResult = await storyService.createStory(exampleStoryTitle, exampleDescription, repoId);
			storyId = storyResult.toString();
			// Associate story with repo (now handled within createStory or needs separate call?)
			// Assuming createStory doesn't associate, call insertStoryIdIntoRepo
			await repositoryService.insertStoryIdIntoRepo(storyId, repoId);
			console.log('\x1b[32mExample-Story inserted!\x1b[0m');
		}

		// Add or update the example scenario
		// Fetch the story to check/update scenarios
		const story = await storyService.getOneStory(storyId);
		if (story) {
			const existingScenario = story.scenarios.find(s => s.scenario_id === exampleScenarioData.scenario_id);
			if (existingScenario) {
				console.log('\x1b[33mExample-Scenario already exists. Updating...\x1b[0m');
				// Merge existing with example data, ensuring _id is kept if present
				const scenarioToUpdate = { ...existingScenario, ...exampleScenarioData };
				await storyService.updateScenario(storyId, scenarioToUpdate as Scenario);
			} else {
				console.log('\x1b[32mAdding Example-Scenario...\x1b[0m');
				story.scenarios.push(exampleScenarioData as Scenario);
				await storyService.updateStory(story); // Update story with new scenario
			}
			console.log('\x1b[32mExample-Scenario-Data ensured!\x1b[0m');
		} else 
			console.error(`\x1b[31mFailed to fetch story ${storyId} to add scenario.\x1b[0m`);
        

	} catch (error: any) {
		console.error(`\x1b[31mError during example test insertion: ${error.message}\x1b[0m`);
	}
}

/**
 * Main function to insert all example data.
 */
async function insertExampleData(): Promise<void> {
	console.log('\x1b[33mSetting Up DB-Example-Data...\n\x1b[0m');
	const user = await insertExampleUser();
	if (user) 
		await insertExampleTest(user);
	else 
		console.error('\x1b[31mSkipping test data insertion due to user error.\x1b[0m');
    
	console.log('\x1b[32mExample-Data setup finished!\x1b[0m');
}

// Execute the data insertion
insertExampleData()
	.then(() => {
		exit(0);
	})
	.catch((err) => {
		console.error(err);
		exit(1);
	});