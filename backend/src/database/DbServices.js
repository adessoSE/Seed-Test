/* eslint-disable consistent-return */
/* eslint-disable line-comment-position */
/* eslint-disable no-param-reassign */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-await-in-loop */
/* eslint-disable curly */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
const { ObjectId } = require('mongodb');
const str = require('string-to-stream');
const toString = require('stream-to-string');
const assert = require('assert');
const mongodb = require('mongodb');
const fs = require('fs');
const dbConnection = require('./DbConnector');
const emptyStory = require('../models/emptyStory');
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');
const Collection = require('mongodb/lib/collection');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const userCollection = 'User';
const storiesCollection = 'Stories';
const repositoriesCollection = 'Repositories';
const stepTypesCollection = 'stepTypes';
const PwResetReqCollection = 'PwResetRequests';
const CustomBlocksCollection = 'CustomBlocks';
const WorkgroupsCollection = 'Workgroups';
const ReportDataCollection = 'ReportData';
const ReportsCollection = 'Reports';

// TODO: die eigene Methode replace kann oft durch die MongoMethode findOneAndReplace ersetzt werden!

// Opening a pooling Database Connection via DbConnector
dbConnection.establishConnection()
	.then(() => console.log('db ', dbConnection.getConnection()));

/**
 * Writes a PasswordResetRequest in the DB
 * @param {*} request
 * @returns inserted request
 */
async function createResetRequest(request) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(PwResetReqCollection).insertOne(request);
	} catch (e) {
		console.log(`ERROR im ResetRequest: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} id
 * @returns PasswordResetRequest
 */
async function getResetRequest(id) {
	try {
		const db = dbConnection.getConnection();
		const query = { uuid: id.toString() };
		return await db.collection(PwResetReqCollection).findOne(query);
	} catch (e) {
		console.log(`ERROR in getResetRequest: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} mail
 * @returns PasswordResetRequest
 */
async function getResetRequestByEmail(mail) {
	try {
		const db = dbConnection.getConnection();
		const query = { email: mail.toString() };
		return await db.collection(PwResetReqCollection).findOne(query);
	} catch (e) {
		console.log(`ERROR in getResetRequestByEmail: ${e}`);
		throw e;
	}
}

/**
 * deletes Password reset request 
 * @param {*} mail
 * @returns deletion Report
 */
async function deleteRequest(mail) {
	try {
		const db = dbConnection.getConnection();
		const query = { email: mail.toString() };
		return await db.collection(PwResetReqCollection).deleteOne(query);
	} catch (e) {
		console.log(`ERROR in deleteRequest: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} userId
 * @returns User
 */
async function getUserById(userId) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(userCollection).findOne({ _id: ObjectId(userId) });
	} catch (e) {
		console.log(`ERROR in getUserById: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} login
 * @param {*} id githubUserId
 * @returns User
 */
async function getUserByGithub(login, id) {
	try {
		const db = dbConnection.getConnection();
		if (typeof id === 'number') {
			const query = { $and: [{ 'github.id': id }, { 'github.login': login.toString() }] };
			return db.collection(userCollection)
				.findOne(query);
		}
	} catch (e) {
		console.log(`ERROR in getUserByGithub: ${e}`);
		throw e;
	}
}

async function getUserByEmail(email) {
	try {
		const db = dbConnection.getConnection();
		const query = { email: email.toString() };
		return await db.collection(userCollection).findOne(query);
	} catch (e) {
		console.log(`ERROR in getUserByEmail: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {object} user {email:string, userId: String, password: string} 
 * @returns
 */
async function registerUser(user) {
	try {
		console.log(user);
		const db = dbConnection.getConnection();
		const collection = await db.collection(userCollection);
		const dbUser = await getUserByEmail(user.email);
		let result;
		if (dbUser !== null) throw Error('User already exists');
		else if (user.userId) { // update in register? attacker with userId could re-set anything
			result = await collection.update({ _id: ObjectId(user.userId) }, { $set: { email: user.email, password: user.password } });
		} else {
			delete user.userId;
			const query = { email: user.email.toString(), password: user.password };
			result = await collection.insertOne(query);
		}
		return result;
	} catch (e) {
		console.log(`ERROR in registerUser: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {object} user minimum model {login:string,  id:number, githubToken:string}
 * @returns
 */
async function registerGithubUser(user) {
	try {
		const db = dbConnection.getConnection();
		user = mongoSanitize(user);
		console.log(user);
		return await db.collection(userCollection).insertOne({ github: user });
	} catch (e) {
		console.log(`ERROR in registerGithubUser: ${e}`);
		throw e;
	}
}

/**
 * replaces a User in the DB
 * @param {*} newUser
 * @param {Collection} collection
 * @returns
 */
function replaceUser(newUser, collection) {
	const myObjt = { _id: ObjectId(newUser._id) };
	return collection.findOneAndReplace(myObjt, newUser).then((res) => res.value);
}

async function updateGithubToken(objId, updatedToken) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(userCollection).updateOne({ _id: ObjectId(objId) }, { $set: { 'github.githubToken': updatedToken } });
	} catch (e) {
		console.log(`ERROR in updateGithubToken: ${e}`);
		throw e;
	}
}

async function findOrRegisterGithub(user) {
	let result = await getUserByGithub(user.login, user.id);
	if (!result) result = await registerGithubUser(user);
	else result = await updateGithubToken(result._id, user.githubToken);
	return result;
}

async function mergeGithub(userId, login, id) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(userCollection);
		const githubAccount = await getUserByGithub(login, id);
		const seedAccount = await getUserById(userId);
		seedAccount.github = githubAccount.github;
		if (githubAccount.hasOwnProperty('jira') && !seedAccount.hasOwnProperty('jira')) seedAccount.jira = githubAccount.jira;

		if (githubAccount.email) {
			delete githubAccount.github;
			await replaceUser(githubAccount, collection);
		} else await deleteUser(githubAccount._id);
		return await replaceUser(seedAccount, collection);
	} catch (e) {
		console.log(`ERROR in mergeGithub: ${e}`);
		throw e;
	}
}

/**
 *
 * @returns updated UserObject
 * @param storyId
 * @param storySource
 * @param collection
 */
// TODO: storySource wont be needed anymore
function findStory(storyId, storySource, collection) {
	const id = ObjectId(storyId);
	return new Promise((resolve, reject) => {
		collection.findOne({ _id: id }, (err, result) => {
			if (err) reject(err);
			else resolve(result);
		});
	});
}

/**
 * replaces a Story in the DB
 * @param {*} story
 * @param {*} collection
 * @returns
 */
function replace(story, collection) {
	const filter = {
		_id: ObjectId(story._id.toString()),
	};
	story._id = ObjectId(story._id);
	return new Promise((resolve, reject) => {
		collection.findOneAndReplace(filter, story, (err, result) => {
			if (err) reject(err);
			else resolve(result.value);
		});
	});
}

async function disconnectGithub(user) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(userCollection);
		return await replaceUser(user, collection);
	} catch (e) {
		console.log(`ERROR in disconnectGithub: ${e}`);
		throw e;
	}
}

async function updateStory(updatedStory) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		updatedStory._id = ObjectId(updatedStory._id.toString())
		return await collection.findOneAndReplace({_id: ObjectId(updatedStory._id.toString())}, updatedStory, {returnDocument: "after"})
	} catch (e) {
		console.log(`ERROR updateStory: ${e}`);
		throw e;
	}
}

// get One Story
// searches the story either by mongoDB _id:ObjectId() or by story_id (from GitHub or Jira)
async function getOneStory(storyId, storySource) {
	let query;
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		console.log(storyId);
		if (typeof storyId === 'number' && (storySource === 'github' || storySource === 'jira')) {
			query = {
				story_id: storyId,
				storySource: storySource.toString()
			};
		} else {
			query = {
				_id: ObjectId(storyId.toString())
			};
		}
		return await collection.findOne(query);
	} catch (e) {
		// console.warn(`ERROR in getOneStory: ${e}`);
		// throw e;
		// if there is no Story (e.g. if its a new GitHub repo), return null
		console.log('if no match return null');
		return null;
	}
}

async function createStoryGroup(repoID, name, members, sequence) {
	try {
		const db = dbConnection.getConnection();
		const groups = await db.collection(repositoriesCollection).findOneAndUpdate(
			{ _id: ObjectId(repoID) },
			{
				$push: {
					groups: {
						_id: ObjectId(), name, member_stories: members, isSequential: sequence
					}
				}
			},
			{ upsert: true, projection: { groups: 1 } }
		);
		return groups.value.groups.slice(-1)._id;
	} catch (e) {
		console.log(`ERROR in createStoryGroup: ${e}`);
	}
}

async function updateStoryGroup(repoId, groupId, updatedGroup) {
	try {
		const db = dbConnection.getConnection();
		updatedGroup._id = ObjectId(updatedGroup._id);
		const collection = await db.collection(repositoriesCollection);
		const repo = await collection.findOne({ _id: ObjectId(repoId) });
		// leave with double equal:
		const index = repo.groups.findIndex((o) => o._id == groupId);
		repo.groups[index] = updatedGroup;
		await collection.updateOne({ _id: ObjectId(repoId) }, { $set: repo });
		return updatedGroup;
	} catch (e) {
		console.log(`ERROR in updateStoryGroup: ${e}`);
	}
}

async function deleteStoryGroup(repoId, groupId) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(repositoriesCollection);
		const repo = await collection.findOne({ _id: ObjectId(repoId) });
		// leave with double equal:
		const index = repo.groups.findIndex((o) => o._id == groupId);
		repo.groups.splice(index, 1);
		await collection.updateOne({ _id: ObjectId(repoId) }, { $set: repo });
		return null;
	} catch (e) {
		console.log(`ERROR in deleteStoryGroup: ${e}`);
	}
}

async function getAllStoryGroups(repoId) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection).findOne({ _id: ObjectId(repoId) }, { projection: { groups: 1 } });
	} catch (e) {
		console.log(`ERROR in getAllStoryGroups: ${e}`);
	}
}

async function getOneStoryGroup(repoId, groupId) {
	try {
		const groups = await getAllStoryGroups(repoId);
		return groups.groups.find((o) => o._id == groupId);
	} catch (e) {
		console.log(`ERROR in getOneStoryGroup: ${e}`);
	}
}

async function addToStoryGroup(repoId, groupId, storyId) {
	try {
		const group = await getOneStoryGroup(repoId, groupId);
		group.member_stories.push(storyId);
		await updateStoryGroup(repoId, groupId, group);
		return group;
	} catch (e) {
		console.log(`ERROR in AddToStoryGroup: ${e}`);
	}
}

async function removeFromStoryGroup(repoId, groupId, storyId) {
	try {
		const group = await getOneStoryGroup(repoId, groupId);
		group.member_stories.splice(group.indexOf(storyId), 1);
		await updateStoryGroup(repoId, groupId, group);
		return group;
	} catch (e) {
		console.log(`ERROR in removeFromStoryGroup: ${e}`);
	}
}

async function updateStoryGroupsArray(repoId, groupsArray) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection).findOneAndUpdate({ _id: ObjectId(repoId) }, { $set: { groups: groupsArray } }, { projection: { groups: 1 } });
	} catch (e) {
		console.log(`ERROR in updateStoryGroupsArray: ${e}`);
	}
}

/**
 * GET all StepTypes
 * @returns all StepTypeObjects
 */
async function showSteptypes() {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(stepTypesCollection).find({})
			.toArray();
	} catch (e) {
		console.log(`ERROR in showSteptypes: ${e}`);
		throw e;
	}
}

// UPDATE Background
async function updateBackground(storyId, storySource, updatedBackground) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		return collection.findOneAndUpdate({ _id: ObjectId(storyId) },{$set:{"background": updatedBackground}},{returnDocument: "after", upsert: true}).then((res)=>res.value);
	} catch (e) {
		console.log(`ERROR in updateBackground: ${e}`);
		throw e;
	}
}

// DELETE Background
async function deleteBackground(storyId, storySource) {
	return updateBackground(storyId, null, emptyBackground());
}

async function createStory(storyTitle, storyDescription, repoId) {
	const iNumberArray = [];
	let finalIssueNumber = 0;
	try {
		const db = dbConnection.getConnection();
		const repo = await db.collection(repositoriesCollection).findOne({ _id: ObjectId(repoId) });
		if (repo) if (repo.stories.length > 0) {
			for (const storyId of repo.stories) {
				const story = await db.collection(storiesCollection).findOne({ _id: ObjectId(storyId) });
				iNumberArray.push(story.issue_number);
			}
			for (let i = 0; i <= iNumberArray.length; i++) {
				const included = iNumberArray.includes(i);
				if (!included) {
					finalIssueNumber = i;
					break;
				}
			}
		}
		const story = emptyStory(storyTitle, storyDescription);
		story.issue_number = finalIssueNumber;
		const result = await db.collection(storiesCollection).insertOne(story);
		return result.insertedId;
	} catch (e) {
		console.log(`ERROR in createStory: ${e}`);
		throw e;
	}
}

/**
 * Deletes the Story in the StoryCollection and deletes the _id in the corresponding Repository and the StoryGroups
 * @param {*} repoId
 * @param {*} storyId
 * @returns deleteReport
 */
async function deleteStory(repoId, storyId) { //TODO refactor use promise all
	try {
		const db = dbConnection.getConnection();
		const repo = await db.collection(repositoriesCollection);
		try {
			const groups = await repo.findOne({ _id: ObjectId(repoId) }, { projection: { groups: 1 } });
			for (const index in groups.groups) groups.groups[index].member_stories = groups.groups[index].member_stories.filter((story) => story !== storyId);
			await repo.findOneAndUpdate({ _id: ObjectId(repoId) }, { $set: { groups: groups.groups } });
			try {
				await repo.findOneAndUpdate({ _id: ObjectId(repoId) }, { $pull: { stories: ObjectId(storyId) } });
				try {
					return await db.collection(storiesCollection).findOneAndDelete({ _id: ObjectId(storyId) });
				} catch (e) {
					console.log(`ERROR in deleteStory, couldn't delete the Story. Trying to recreate the Repo- and GroupsEntry: ${e}`);
					// TODO: recreate both Entrys
				}
			} catch (e) {
				console.log(`ERROR in deleteStory, couldn't delete the Story_id in the Repo. Trying to recreate the deleted GroupEntry : ${e}`);
				// TODO: recreate the GroupEntry
			}
		} catch (e) {
			console.log(`ERROR in deleteStory, couldn't delete GroupEntry: ${e}`);
			throw e;
		}
	} catch (e) {
		console.log(`ERROR in deleteStory, couldnt establish a Connection: ${e}`);
		throw e;
	}
}

async function insertStoryIdIntoRepo(storyId, repoId) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection).findOneAndUpdate({ _id: ObjectId(repoId) }, { $push: { stories: ObjectId(storyId) } });
	} catch (e) {
		console.log(`ERROR in insertStoryIdIntoRepo: ${e}`);
		throw e;
	}
}

async function updateScenarioList(storyId, scenarioList) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(storiesCollection).findOneAndUpdate({ _id: ObjectId(storyId) }, { $set: { scenarios: scenarioList } });
	} catch (e) {
		console.log(`ERROR in insertStoryIdIntoRepo: ${e}`);
		throw e;
	}
}

async function getAllStoriesOfRepo( repoId) {
	const storiesArray = [];
	try {
		const db = dbConnection.getConnection();
		const repo = await db.collection(repositoriesCollection).findOne({ _id: ObjectId(repoId) });
		if (repo) for (const entry of repo.stories) {
			const story = await db.collection(storiesCollection).findOne({ _id: ObjectId(entry) });
			storiesArray.push(story);
		}
		return storiesArray;
	} catch (e) {
		console.log(`ERROR in getAllStoriesOfRepo: ${e}`);
		throw e;
	}
}

// GET ONE Scenario
async function getOneScenario(storyId, storySource, scenarioId) { // TODO: remove storySource
	try {
		const db = dbConnection.getConnection();
		const scenarios = await db.collection(storiesCollection).findOne({ _id: ObjectId(storyId), 'scenarios.scenario_id': scenarioId }, { projection: { scenarios: 1 } });
		return scenarios.scenarios.find((o) => o.scenario_id === scenarioId);
	} catch (e) {
		console.log(`ERROR in getOneScenario: ${e}`);
		throw e;
	}
}

// CREATE Scenario
async function createScenario(storyId, storySource, scenarioTitle) { // TODO: remove storySource
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		const story = await findStory(storyId, null, collection);
		const tmpScenario = emptyScenario();
		if (story.scenarios.length === 0) {
			tmpScenario.name = scenarioTitle;
			story.scenarios.push(tmpScenario);
		} else {
			let newScenId = 0;
			for (const scenario of story.scenarios) {
				if (scenario.scenario_id > newScenId) {
					newScenId = scenario.scenario_id;
				}
			}
			tmpScenario.scenario_id = newScenId + 1;
			tmpScenario.name = scenarioTitle;
			story.scenarios.push(tmpScenario);
		}
		await replace(story, collection);
		return tmpScenario;
	} catch (e) {
		console.log(`ERROR in createScenario: ${e}`);
		throw e;
	}
}

// PUT Scenario
/**
 *
 * @param {*} storyId
 * @param {*} storySource
 * @param {*} updatedScenario
 * @returns updated Scenario
 */
async function updateScenario(storyId, storySource, updatedScenario) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		return collection.findOneAndUpdate({ _id: ObjectId(storyId) },{$set:{"scenarios.$[it]": updatedScenario}},
			{arrayFilters:[{"it.scenario_id": updatedScenario.scenario_id}], returnDocument: "after", upsert: true, projection:{scenarios:true}})//Options
		.then((res)=>{return res.value})
		.then((result)=> result.scenarios.find((scen)=>scen.scenario_id==updatedScenario.scenario_id))
	} catch (e) {
		console.log(`ERROR in updateScenario: ${e}`);
		throw e;
	}
}

// DELETE Scenario
async function deleteScenario(storyId, storySource, scenarioId) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		return collection.findOneAndUpdate({ _id: ObjectId(storyId) },{$pull:{"scenarios":{"scenario_id": scenarioId}}},{returnDocument: "after"}).then((res)=> res.value);
	} catch (e) {
		console.log(`ERROR in deleteScenario: ${e}`);
		throw e;
	}
}

// gets all Repositories of one user
async function getRepository(userID) {
	try {
		const myObjt = { owner: ObjectId(userID) };
		const db = dbConnection.getConnection();
		const wGCollection = await db.collection(WorkgroupsCollection);
		const repoCollection = await db.collection(repositoriesCollection);
		const user = await db.collection(userCollection).findOne({ _id: ObjectId(userID) });
		const positiveWorkgroups = await wGCollection.find({ Members: { $elemMatch: { email: user.email, canEdit: true } } }).toArray();
		const PWgArray = positiveWorkgroups.map((entry) => ObjectId(entry.Repo));
		const PWgRepos = await repoCollection.find({ _id: { $in: PWgArray } }).toArray();
		PWgRepos.forEach((element) => {
			element.canEdit = true;
		});
		const negativeWorkgroups = await wGCollection.find({ Members: { $elemMatch: { email: user.email, canEdit: false } } }).toArray();
		const NWgArray = negativeWorkgroups.map((entry) => ObjectId(entry.Repo));
		const NWgRepos = await repoCollection.find({ _id: { $in: NWgArray } }).toArray();
		NWgRepos.forEach((element) => {
			element.canEdit = false;
		});
		const result = await repoCollection.find(myObjt).toArray();
		result.forEach((element) => {
			element.canEdit = true;
		});
		return result.concat(PWgRepos, NWgRepos);
	} catch (e) {
		console.log(`ERROR in getRepository${e}`);
		throw e;
	}
}

// deletes all Repositories of own User
async function deleteRepositorys(ownerID) { // TODO: Dringend! Die eingetragenen Storys und die Einträge in Stories und Groups müssen gelöscht werden
	try {
		const query = { owner: ObjectId(ownerID) };
		const db = dbConnection.getConnection();
		const collection = await db.collection(repositoriesCollection);
		return await collection.deleteMany(query);
	} catch (e) {
		console.log(`ERROR in deleteRepositorys${e}`);
		throw e;
	}
}

async function deleteRepository(repoId, ownerId) { // TODO: Dringend! Die eingetragenen Storys und die Einträge in Stories und Groups müssen gelöscht werden
	try {// todo delete Workgroup, delete story Reports
		const db = dbConnection.getConnection();
		const collectionRepo = await db.collection(repositoriesCollection)
		// const collectionStory = await db.collection(storiesCollection)
		// const repo = await collectionRepo.findOne({ owner: ObjectId(ownerId), _id: ObjectId(repoId)})
		// const storIds = repo.stories.map((val)=>ObjectId(val))
		// const storiesRes = await collectionStory.deleteMany({_id:{$in: storIds}})
		return collectionRepo.deleteOne({ owner: ObjectId(ownerId), _id: ObjectId(repoId)})
	} catch (e) {
		console.log(`ERROR in deleteRepository${e}`);
		throw e;
	}
}

async function getOneRepository(ownerId, name) {
	try {
		const repo = { owner: ObjectId(ownerId), repoName: name };
		const db = dbConnection.getConnection();
		return db.collection(repositoriesCollection).findOne(repo);
	} catch (e) {
		console.log(`ERROR in getOneRepository${e}`);
	}
}

/**
 *
 * @param {*} name
 * @returns one GitRepositoryObject
 */
async function getOneGitRepository(name) {
	try {
		const query = {
			repoName: name.toString(),
			repoType: 'github'
		};
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection)
			.findOne(query);
	} catch (e) {
		console.log(`ERROR in getOneGitRepository${e}`);
	}
}

/**
 *
 * @param {*} name
 * @returns one JiraRepositoryObject
 */
async function getOneJiraRepository(name) {
	try {
		const query = { repoName: name.toString(), repoType: 'jira' };
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection).findOne(query);
	} catch (e) {
		console.log(`ERROR in getOneGitRepository${e}`);
	}
}

/**
 *
 * @param {*} source
 * @returns all RepositoryObjects from the corresponding source
 */
async function getAllSourceReposFromDb(source) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection).find({ repoType: source })
			.toArray();
	} catch (e) {
		console.log(`ERROR in getAllSourceReposFromDb ${e}`);
	}
}

async function createRepo(ownerId, name) { 
	try {
		const emptyRepo = {
			owner: ObjectId(ownerId), repoName: name.toString(), stories: [], repoType: 'db', customBlocks: [], groups: []
		};
		const db = dbConnection.getConnection();
		const collection = await db.collection(repositoriesCollection);
		const query = { owner: ObjectId(ownerId), repoName: name.toString() };
		const existingRepo = await collection.findOne(query);
		if (existingRepo !== null || !name) return 'Sie besitzen bereits ein Repository mit diesem Namen!';// existing or empty name
		return collection.insertOne(emptyRepo).then((ret)=>ret.insertedId)
	} catch (e) {
		console.log(`ERROR in createRepo${e}`);
	}
}

/**
 *
 * @param {*} repoID
 * @param {*} newName
 * @param {*} user
 * @returns
 */
async function updateRepository(repoID, newName, user) { //
	try {
		const repoFilter = { owner: ObjectId(user), _id: ObjectId(repoID) };
		const db = dbConnection.getConnection();
		const collection = await db.collection(repositoriesCollection);
		return collection.findOneAndUpdate(repoFilter, { $set: { repoName: newName } }, { returnNewDocument: true });
	} catch (e) {
		console.log(`ERROR updateRepository: ${e}`);
		throw e;
	}
}

async function createJiraRepo(repoName) {
	try {
		const db = dbConnection.getConnection();
		const repo = {
			owner: '', repoName, stories: [], repoType: 'jira', customBlocks: []
		};
		return await db.collection(repositoriesCollection).insertOne(repo);
	} catch (e) {
		console.log(`ERROR in createJiraRepo ${e}`);
		throw e;
	}
}

async function createGitRepo(gitOwnerId, repoName, userGithubId, userId) {
	let newRepo;
	try {
		const db = dbConnection.getConnection();
		newRepo = {
			owner: '', gitOwner: gitOwnerId, repoName, stories: [], repoType: 'github', customBlocks: []
		};
		if (userGithubId === gitOwnerId) newRepo.owner = ObjectId(userId);
		return await db.collection(repositoriesCollection).insertOne(newRepo);
	} catch (e) {
		console.log(`ERROR in createGitRepo${e}`);
		throw e;
	}
}

async function removeFromWorkgroup(repoId, user) {
	try {
		const db = dbConnection.getConnection();
		const wGcollection = await db.collection(WorkgroupsCollection);
		const repo = await db.collection(repositoriesCollection).findOne({ _id: ObjectId(repoId) });
		const owner = await db.collection(userCollection).findOne({ _id: repo.owner });
		const workGroup = await wGcollection.findOneAndUpdate({ Repo: ObjectId(repoId) }, { $pull: { Members: { email: user.email } } });
		if (workGroup.value) {
			const wG = await wGcollection.findOne({ Repo: ObjectId(repoId) });
			const result = { owner: {}, member: [] };
			result.owner = { email: owner.email, canEdit: true };
			result.member = wG.Members;
			return result;
		}
		return;
	} catch (e) {
		console.log(`ERROR in removeFromWorkgroup: ${e }`);
		throw e;
	}
}

async function updateOwnerInRepo(repoId, newOwnerId, oldOwnerId) {
	try {
		const db = dbConnection.getConnection();
		const oldOwner = await getUserById(oldOwnerId);
		// set new Owner for the given Repo
		const newOwner = await getUserById(newOwnerId);
		await db.collection(repositoriesCollection).findOne({ _id: ObjectId(repoId) });
		await db.collection(repositoriesCollection).findOneAndUpdate({ _id: ObjectId(repoId) }, { $set: { owner: newOwnerId } });
		// remove the new Owner from Workgroup
		await removeFromWorkgroup(repoId, newOwner);

		// add old Owner as Member and update Email in Workgroup
		const wgMember = { email: oldOwner.email, canEdit: Boolean(true) };
		await db.collection(WorkgroupsCollection).findOneAndUpdate({ Repo: ObjectId(repoId) }, { $set: { owner: newOwner.email }, $push: { Members: wgMember } });
		return 'Success';
	} catch (e) {
		console.log(`ERROR in updateOwnerInRepo ${e}`);
		throw e;
	}
}

async function updateStoriesArrayInRepo(repoId, storiesArray) { // TODO: vllt in updateStory reinnehmen dann spare ich den DBAufruf
	try {
		const sortedStoriesArray = storiesArray.map((s) => ObjectId(s));
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection).findOneAndUpdate({ _id: ObjectId(repoId) }, { $set: { stories: sortedStoriesArray } }, { returnNewDocument: true });
	} catch (e) {
		console.log(`ERROR in updateStoriesArrayInRepo${e}`);
		throw e;
	}
}

async function upsertEntry(storyId, updatedContent, storySource) { // TODO: remove storySource?
	try {
		const myObjt = {
			story_id: storyId,
			storySource
		};
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		let result = await collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
			upsert: false
		});
		// TODO remove later when all used stories have the tag storySource
		if (!result.value) {
			myObjt.storySource = undefined;
			result = await collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
				upsert: true
			});
		}
		return result.value;
	} catch (e) {
		console.log(`ERROR in upsertEntry: ${e}`);
		throw e;
	}
}

async function getTestReports(storyId) {
	let result;
	try {
		const db = dbConnection.getConnection();
		console.log('Getting Report for storyId :', storyId);
		result = await db.collection(ReportDataCollection).find(
			{ storyId: ObjectId(storyId) },
			{ projection: { jsonReport: 0, reportOptions: 0, json: 0 } }
		)
			.toArray();
		console.log('Got ', result.length, ' reports for  :', storyId);
	} catch (e) {
		console.log('ERROR in getTestReports', e);
	}
	return result;
}

async function getGroupTestReports(storyId) {
	try {
		const db = dbConnection.getConnection();
		console.log('Getting Groups Reports for storyId :', storyId);
		// projection value 0 excludes from returning
		const query = { storyStatuses: { $elemMatch: { storyId: ObjectId(storyId) } } };
		const result = await db.collection(ReportDataCollection).find(
			query,
			{ projection: { jsonReport: 0, reportOptions: 0, json: 0 } }
		)
			.toArray();
		console.log('Got ', result.length, ' Group Reports for  :', storyId);
		return result;
	} catch (e) {
		console.log('Error in getGroupTestReports: ', e);
		return {};
	}
}

async function deleteReport(reportId) {
	let result;
	let idToDelete;
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(ReportDataCollection);
		const reportData = await collection.findOne({ _id: ObjectId(reportId) });
		if (reportData.smallReport) {
			idToDelete = reportData.smallReport;
			console.log('Trying to delete smallReport', idToDelete, ' in DB for Report', reportId);
			await db.collection(ReportsCollection).deleteOne({ _id: ObjectId(idToDelete) });
			result = await collection.deleteOne({ _id: ObjectId(reportId) });
		} else {
			idToDelete = reportData.bigReport;
			console.log('trying to delete bigReport', idToDelete, ' in DB for Report', reportId);
			const bucket = await new mongodb.GridFSBucket(db, { bucketName: 'GridFS' });
			bucket.delete(ObjectId(idToDelete));
			result = await collection.deleteOne({ _id: ObjectId(reportId) });
		}
	} catch (e) {
		console.log('ERROR in deleteReport', e);
	}
	return result;
}

async function setIsSavedTestReport(testReportId, isSaved) {
	try {
		const db = dbConnection.getConnection();
		db.collection(ReportDataCollection).updateOne({ _id: ObjectId(testReportId) }, {
			$set: { isSaved }
		});
	} catch (e) {
		console.log('ERROR in setIsSavedTestReport', e);
	}
	return 'done';
}

async function updateStoryStatus(storyId, storyLastTestStatus) {
	try {
		const db = dbConnection.getConnection();
		db.collection(storiesCollection).updateOne({ _id: ObjectId(storyId) }, {
			$set: { lastTestPassed: storyLastTestStatus }
		});
		return 'done';
	} catch (e) {
		console.log('Error in updateStoryStatus: ', e);
		return {};
	}
}

async function updateScenarioStatus(storyId, scenarioId, scenarioLastTestStatus) { // TODO: testen
	try {
		const db = dbConnection.getConnection();
		return await db.collection(storiesCollection).updateOne(
			{
				_id: ObjectId(storyId),
				scenarios: {
					$elemMatch:
						{ scenario_id: scenarioId }
				}
			}, {
				$set: { 'scenarios.$.lastTestPassed': scenarioLastTestStatus }
			});
	} catch (e) {
		console.log('Error in updateScenarioStatus. Could not set scenario LastTestPassed: ', e);
	}
}

async function uploadBigJsonData(data, fileName) {
	const db = dbConnection.getConnection();
	const bucket = await new mongodb.GridFSBucket(db, { bucketName: 'GridFS' });
	const id = ObjectId();
	str(JSON.stringify(data))
		.pipe(bucket.openUploadStreamWithId(id, fileName))
		.on('error', async (error) => {
			assert.ifError(error);
		})
		.on('finish', async () => {
			console.log('Done! Uplaoded BigReport');
			console.log('ObjectID: of Big Report: ', id);
			return id;
		});
	return id;
}

async function uploadReport(reportResults) {
	const reportData = reportResults;
	const db = dbConnection.getConnection();
	const collection = await db.collection(ReportDataCollection);
	fs.readFile(reportResults.reportOptions.jsonFile, 'utf8', async (err, data) => {
		if(err)console.log(err)

		const jReport = { jsonReport: data };
		const len = Buffer.byteLength(JSON.stringify(data));
		if (len >= 16000000) {
			try {
				reportData.bigReport = await uploadBigJsonData(jReport, reportResults.storyId);
				console.log('ObjectID: of Big Report in UploadReport: ', reportData.bigReport);
				collection.insertOne(reportData);
			} catch (e) {
				console.log('ERROR in uploadReport', e);
			}
		} else {
			try {
				db.collection(ReportsCollection).insertOne(jReport);
				reportData.smallReport = jReport._id;
				collection.insertOne(reportData);
			} catch (e) {
				console.log('ERROR in uploadReport', e);
			}
		}
	});
	return reportResults;
}

async function getReportFromDB(report) {
	let result;
	try {
		const db = dbConnection.getConnection();
		if (report.smallReport) {
			const reportJson = await db.collection(ReportsCollection)
				.findOne({ _id: report.smallReport });
			result = {
				_id: report._id,
				jsonReport: reportJson.jsonReport
			};
		} else {
			const bucket = await new mongodb.GridFSBucket(db, { bucketName: 'GridFS' });
			const reportString = await toString(bucket.openDownloadStream(ObjectId(report.bigReport.toString())));
			const reportJson = JSON.parse(reportString);
			result = {
				_id: report._id,
				jsonReport: reportJson.jsonReport
			};
		}
		return result;
	} catch (e) {
		console.log('ERROR in getReportFromDB', e);
		return {};
	}
}

async function getReportByName(reportName) {
	try {
		const db = dbConnection.getConnection();
		const report = await db.collection(ReportDataCollection).findOne({ reportName });
		return await getReportFromDB(report);
	} catch (e) {
		console.log('ERROR in getReportByName', e);
		return {};
	}
}

async function getReportById(reportId) {
	try {
		const db = dbConnection.getConnection();
		const report = await db.collection(ReportDataCollection).findOne({ _id: ObjectId(reportId.toString()) });
		return await getReportFromDB(report);
	} catch (e) {
		console.log('ERROR in getReportById (DBServices)', e);
		return {};
	}
}

async function getReportDataById(reportId) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(ReportDataCollection)
			.findOne({ _id: ObjectId(reportId.toString()) });
	} catch (e) {
		console.log('ERROR in getReportDataById (DBServices)', e);
		return {};
	}
}

// delete User in DB needs ID
async function deleteUser(userID) {
	try {// delete user from Workgroup
		const oId = ObjectId(userID);
		const myObjt = { _id: oId };
		const db = dbConnection.getConnection();
		const repos = await db.collection(repositoriesCollection).find({ owner: oId }).toArray();
		if (repos) {
			for (const repo of repos) for (const storyID of repo.stories) await db.collection(storiesCollection).deleteOne({ _id: ObjectId(storyID) }); // use delete repo?

			const resultRepo = await db.collection(repositoriesCollection).deleteMany({ owner: oId });
			const resultUser = await db.collection(userCollection).deleteOne(myObjt);
			return {resultUser, resultRepo};
		}
		return null;
	} catch (e) {
		console.log(`ERROR in deleteUser: ${e}`);
		throw e;
	}
}

// update a User in DB needs ID and JsonObject User returns altered JsonObject User
async function updateUser(userID, updatedUser) {
	try {
		const oId = ObjectId(userID);
		const myObjt = { _id: oId };
		const db = dbConnection.getConnection();
		const result = await db.collection(userCollection).findOneAndReplace(myObjt, updatedUser);
		return result.value;
	} catch (e) {
		console.log(`ERROR in updateUser: ${e}`);
		throw e;
	}
}

// get UserData needs ID returns JsonObject User
async function getUserData(userID) {
	try {
		const oId = ObjectId(userID);
		const myObjt = { _id: oId };
		const db = dbConnection.getConnection();
		return await db.collection(userCollection).findOne(myObjt);
	} catch (e) {
		console.log(`ERROR FEHLERin getUserData: ${e}`);
		throw e;
	}
}

async function saveBlock(block) {
	try {
		block = mongoSanitize(block);
		block.repositoryId = ObjectId(block.repositoryId)
		block.owner = ObjectId(block.owner.toString())
		const db = dbConnection.getConnection();
		return await db.collection(CustomBlocksCollection).insertOne(block);
	} catch (e) {
		console.log(`ERROR in saveBlock: ${e}`);
		throw e;
	}
}

async function updateBlock(name, updatedBlock) { // delete by id but update by name?
	const oldBlock = { name };
	try {
		const db = dbConnection.getConnection();
		updatedBlock._id = ObjectId(updatedBlock._id)
		updatedBlock.repositoryId = ObjectId(updatedBlock.repositoryId);
		updatedBlock.owner = ObjectId(updatedBlock.owner);
		await db.collection(CustomBlocksCollection).findOneAndReplace(oldBlock, updatedBlock);
	} catch (e) {
		console.log(`ERROR in updateBlock: ${e}`);
		throw e;
	}
}

// get all Blocks by Id returns Array with all existing CustomBlocks
async function getBlocks(repoId) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(CustomBlocksCollection).find({ repositoryId: ObjectId(repoId) })
		.toArray();
	} catch (e) {
		console.log(`ERROR in getBlocks: ${e}`);
		throw e;
	}
}
// deletes the CustomBlock with the given Name, need the name
async function deleteBlock(blockId, userId) {
	try {
		const myObjt = {
			_id: ObjectId(blockId),
			owner: ObjectId(userId)
		};
		const db = dbConnection.getConnection();
		await db.collection(CustomBlocksCollection).deleteOne(myObjt);
		return 'done';
	} catch (e) {
		console.log(`ERROR in deleteBlock: ${e}`);
		throw e;
	}
}

async function getWorkgroup(id) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(WorkgroupsCollection).findOne({ Repo: ObjectId(id) });
	} catch (e) {
		console.log(`ERROR in getWorkgroup: ${e}`);
		throw e;
	}
}

/**
 * 
 * @param {*} repoId Repository Id
 * @param {object} user User object {email:string, canEdit:boolean}
 * @returns 
 */
async function addMember(repoId, user) {
	try {
		const db = dbConnection.getConnection();
		const wGCollection = await db.collection(WorkgroupsCollection);
		const check = await wGCollection.findOne({ Repo: ObjectId(repoId), Members: { $elemMatch: { email: user.email } } });
		if (check) return 'Dieser User ist bereits in der Workgroup';
		const repo = await db.collection(repositoriesCollection).findOne({ _id: ObjectId(repoId) });
		const owner = await db.collection(userCollection).findOne({ _id: repo.owner });
		const workGroup = await wGCollection.findOne({ Repo: ObjectId(repoId) });
		if (!workGroup) { 
			await wGCollection.insertOne({
				name: repo.repoName, owner: owner.email, Repo: ObjectId(repoId), Members: [{ email: user.email, canEdit: Boolean(user.canEdit) }]
			});
		} else {
			await wGCollection.findOneAndUpdate({ Repo: ObjectId(repoId) }, { $push: { Members: user } });
		}
		const result = { owner: {}, member: [] };
		const wG = await wGCollection.findOne({ Repo: ObjectId(repoId) });
		result.owner = { email: owner.email, canEdit: true };
		result.member = wG.Members;
		return result;
	} catch (e) {
		console.log(`ERROR in addMember: ${e}`);
		throw e;
	}
}

async function updateMemberStatus(repoId, user) {
	try {
		const db = dbConnection.getConnection();
		const wGCollection = await db.collection(WorkgroupsCollection);
		const repo = await db.collection(repositoriesCollection).findOne({ _id: ObjectId(repoId) });
		const usersCollection = await db.collection(userCollection);
		const owner = await usersCollection.findOne({ _id: repo.owner });
		const updatedWG = await wGCollection.findOneAndUpdate({ Repo: ObjectId(repoId) }, { $set: { 'Members.$[elem].canEdit': Boolean(user.canEdit) } }, { arrayFilters: [{ 'elem.email': user.email }] });
		if (updatedWG) {
			const wG = await wGCollection.findOne({ Repo: ObjectId(repoId) });
			const result = { owner: {}, member: [] };
			result.owner = { email: owner.email, canEdit: true };
			result.member = wG.Members;
			return result;
		}
	} catch (e) {
		console.log(`ERROR in updateMemberStatus: ${e}`);
		throw e;
	}
}

async function getMembers(id) {
	try {
		const db = dbConnection.getConnection();
		const repo = await db.collection(repositoriesCollection).findOne({ _id: ObjectId(id) });
		const owner = await db.collection(userCollection).findOne({ _id: repo.owner });
		const wG = await db.collection(WorkgroupsCollection).findOne({ Repo: ObjectId(id) });
		if (!wG) return { owner: { email: owner.email, canEdit: true }, member: [] };
		const result = { owner: {}, member: [] };
		result.owner = { email: owner.email, canEdit: true };
		result.member = wG.Members;
		return result;
	} catch (e) {
		console.log(`ERROR in getMembers: ${e}`);
		throw e;
	}
}

async function updateOneDriver(id, driver) {
	try {
		const oneDriver = !driver.oneDriver;
		const db = dbConnection.getConnection();
		const result = await db.collection(storiesCollection).findOneAndUpdate(
			{ _id: ObjectId(id) },
			{ $set: { oneDriver } }
		);
		return result.value;
	} catch (e) {
		console.log('ERROR in updateOneDriver: ', e);
	}
}

function mongoSanitize(v) { // from https://github.com/vkarpov15/mongo-sanitize
	if (v instanceof Object) {
		for (var key in v) {
			if (/^\$/.test(key)) {
				delete v[key];
			} else {
				mongoSanitize(v[key]);
			}
		}
	}
	return v;
};

module.exports = {
	setIsSavedTestReport,
	deleteReport,
	getTestReports,
	getGroupTestReports,
	getReportByName,
	getReportById,
	getReportDataById,
	uploadReport,
	disconnectGithub,
	mergeGithub,
	findOrRegisterGithub,
	getUserByGithub,
	getUserById,
	registerUser,
	getUserByEmail,
	showSteptypes,
	// createBackground,
	deleteBackground,
	updateBackground,
	getOneScenario,
	createScenario,
	updateScenario,
	deleteScenario,
	updateScenarioList,
	createStory,
	deleteStory,
	insertStoryIdIntoRepo,
	getOneStory,
	upsertEntry,
	updateStory,
	deleteUser,
	updateUser,
	getUserData,
	createJiraRepo,
	updateStoriesArrayInRepo,
	getRepository,
	deleteRepository,
	getOneRepository,
	getOneGitRepository,
	getOneJiraRepository,
	getAllStoriesOfRepo,
	createRepo,
	createStoryGroup,
	updateStoryGroup,
	deleteStoryGroup,
	addToStoryGroup,
	removeFromStoryGroup,
	getAllStoryGroups,
	getOneStoryGroup,
	updateStoryGroupsArray,
	createResetRequest,
	getResetRequest,
	deleteRequest,
	getResetRequestByEmail,
	saveBlock,
	updateBlock,
	getBlocks,
	deleteBlock,
	getWorkgroup,
	addMember,
	updateMemberStatus,
	getMembers,
	removeFromWorkgroup,
	updateOneDriver,
	updateScenarioStatus,
	updateStoryStatus,
	getAllSourceReposFromDb,
	createGitRepo,
	updateOwnerInRepo,
	updateRepository
};