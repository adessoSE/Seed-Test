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
const emptyStory = require('../models/emptyStory');
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');

if (!process.env.NODE_ENV) {
	const dotenv = require('dotenv').config();
}

const uri = process.env.DATABASE_URI;
const dbName = 'Seed';
const userCollection = 'User';
const storiesCollection = 'Stories';
const repositoriesCollection = 'Repositories';
const steptypesCollection = 'stepTypes';
const PwResetReqCollection = 'PwResetRequests';
const CustomBlocksCollection = 'CustomBlocks';
const WorkgroupsCollection = 'Workgroups';
const ReportDataCollection = 'ReportData';
const ReportsCollection = 'Reports';

// ////////////////////////////////////// API Methods /////////////////////////////////////////////
// async function createTTLIndex(){
//   let db = await connectDb()
//   let dbo = db.db(dbName);
//   let collection = await dbo.collection("PwResetRequests")
//   collection.createIndex({"createdAt": 1 }, { expireAfterSeconds: 3600 } )
//   db.close()
// }

function connectDb() {
	return new Promise((resolve, reject) => {
		mongodb.MongoClient
			.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, (err, db) => {
				if (err) reject(err);
				else resolve(db);
			});
	});
}

async function createResetRequest(request) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(PwResetReqCollection);
		return await collection.insertOne(request);
	} catch (e) {
		console.log(`UPS!!!!FEHLER im ResetRequest: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - createResetRequest');
	}
}

async function getResetRequest(id) {
	const db = await connectDb();
	try {
		const dbo = db.db(dbName);
		const collection = await dbo.collection(PwResetReqCollection);
		return await collection.findOne({ uuid: id });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getResetRequest: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here -get ResetRequest');
	}
}

async function getResetRequestByEmail(mail) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(PwResetReqCollection);
		return await collection.findOne({ email: mail });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getResetRequestByEmail: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getResetRequestByEmail');
	}
}

async function deleteRequest(mail) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(PwResetReqCollection);
		return await collection.deleteOne({ email: mail });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteRequest: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteRequest');
	}
}

async function registerUser(user) {
	const db = await connectDb();
	const dbo = db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const dbUser = await getUserByEmail(user.email);
	let result;
	if (dbUser !== null) throw Error('User already exists');
	else
	if (user.userId) result = await collection.update({ _id: ObjectId(user.userId) }, { $set: { email: user.email, password: user.password } });
	else {
		delete user.userId;
		result = await collection.insertOne(user);
	}
	if (db) db.close();
	console.log('I am closing the DB here - registerUser');
	return result;
}

async function registerGithubUser(user) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(userCollection);
		return await collection.insertOne({ github: user });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in registerGithubUser: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - registerGithubUser');
	}
}

async function mergeGithub(userId, login, id) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(userCollection);
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
		console.log(`UPS!!!! FEHLER in mergeGithub: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - mergeGithub');
	}
}

async function getUserByEmail(email) {
	let db;
	try {
		db = await connectDb();
		const dbo = await db.db(dbName);
		const collection = await dbo.collection(userCollection);
		return await collection.findOne({ email });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getUserByEmail: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getUserByEmail');
	}
}

async function getUserByGithub(login, id) {
	const db = await connectDb();
	const dbo = await db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const result = await collection.findOne({ $and: [{ 'github.id': id }, { 'github.login': login }] });
	db.close();
	console.log('I am closing the DB here - getUserByGithub');
	return result;
}

async function getUserById(id) {
	const db = await connectDb();
	const dbo = await db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const result = await collection.findOne({ _id: ObjectId(id) });
	db.close();
	console.log('I am closing the DB here - getUserById');
	return result;
}

async function findOrRegister(user) {
	let result = await getUserByGithub(user.login, user.id);
	if (!result) result = await registerGithubUser(user);
	else result = await updateGithubToken(result._id, user.githubToken);
	return result;
}

async function updateGithubToken(objId, updatedToken) {
	const db = await connectDb();
	const dbo = await db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const user = await collection.updateOne({ _id: ObjectId(objId) }, { $set: { 'github.githubToken': updatedToken } });
	db.close();
	console.log('I am closing the DB here - updateGithubToken');
	return user;
}

function selectRepositoryCollection(db) {
	const dbo = db.db(dbName);
	return new Promise((resolve, reject) => {
		dbo.collection(repositoriesCollection, (err, collection) => {
			if (err) reject(err);
			else resolve(collection);
		});
	});
}
function selectStoriesCollection(db) {
	const dbo = db.db(dbName);
	return new Promise((resolve, reject) => {
		dbo.collection(storiesCollection, (err, collection) => {
			if (err) reject(err);
			else resolve(collection);
		});
	});
}
function selectUsersCollection(db) {
	const dbo = db.db(dbName);
	return new Promise((resolve, reject) => {
		dbo.collection(userCollection, (err, collection) => {
			if (err) reject(err);
			else resolve(collection);
		});
	});
}

function findStory(storyId, storySource, collection) {
	const id = ObjectId(storyId);
	return new Promise((resolve, reject) => {
		collection.findOne({ _id: id, storySource }, (err, result) => {
			if (err) reject(err);
			else resolve(result);
		});
	});
}

function replace(story, collection) {
	const filter = {
		_id: ObjectId(story._id),
		storySource: story.storySource
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
	const db = await connectDb();
	const dbo = await db.db(dbName);
	const collection = await dbo.collection(userCollection);
	return await replaceUser(user, collection);
}

function replaceUser(newUser, collection) {
	const myObjt = { _id: ObjectId(newUser._id) };
	return new Promise((resolve, reject) => {
		collection.findOneAndReplace(myObjt, newUser, (err, result) => {
			if (err) reject(err);
			else resolve(result.value);
		});
	});
}

async function updateStory(updatedStuff) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		return await replace(updatedStuff, collection);
	} catch (e) {
		console.log(`UPS!!!! FEHLER updateStory: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateStory');
	}
}

// get One Story
async function getOneStory(storyId, storySource) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		let story = await collection.findOne({ _id: ObjectId(storyId), storySource });
		// TODO remove later when all used stories have the tag storySource
		if (!story) story = await collection.findOne({ _id: ObjectId(storyId), storySource: undefined });
		return story;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getOneStory: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getOneStory');
	}
}

async function getOneStoryByStoryId(storyId, storySource) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		let story = await collection.findOne({ story_id: storyId, storySource });
		// TODO remove later when all used stories have the tag storySource
		if (!story) story = await collection.findOne({ story_id: storyId, storySource: undefined });
		return story;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getOneStoryByStoryId: ${e}`);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getOneStoryByStoryId');
	}
}

async function createStoryGroup(repoID, name, members, sequence) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);

		const groups = await collection.findOneAndUpdate(
			{ _id: ObjectId(repoID) },
			{
				$push: {
					groups: {
						_id: ObjectId(), name, member_stories: members, isSequential: sequence || []
					}
				}
			},
			{ upsert: true, projection: { groups: 1 } }
		);
		return groups.value.groups.slice(-1)._id;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in createStoryGroup: ${e}`);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - createStoryGroup');
	}
}

async function updateStoryGroup(repoId, groupId, updatedGroup) {
	let db;
	try {
		db = await connectDb();
		updatedGroup._id = ObjectId(updatedGroup._id);
		const collection = await selectRepositoryCollection(db);
		const repo = await collection.findOne({ _id: ObjectId(repoId) });
		// leave with double equal:
		const index = repo.groups.findIndex((o) => o._id == groupId);
		repo.groups[index] = updatedGroup;
		await collection.updateOne({ _id: ObjectId(repoId) }, { $set: repo });
		return updatedGroup;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateStoryGroup: ${e}`);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateStoryGroup');
	}
}

async function deleteStoryGroup(repoId, groupId) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		const repo = await collection.findOne({ _id: ObjectId(repoId) });
		// leave with double equal:
		const index = repo.groups.findIndex((o) => o._id == groupId);
		repo.groups.splice(index, 1);
		await collection.updateOne({ _id: ObjectId(repoId) }, { $set: repo });
		return null;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteStoryGroup: ${e}`);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteStoryGroup');
	}
}

async function addToStoryGroup(repoId, groupId, storyId) {
	try {
		const group = await getOneStoryGroup(repoId, groupId);
		group.member_stories.push(storyId);
		await updateStoryGroup(repoId, groupId, group);
		return group;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in AddToStoryGroup: ${e}`);
	}
}

async function removeFromStoryGroup(repoId, groudId, storyId) {
	try {
		const group = await getOneStoryGroup(repoId, groudId);
		group.member_stories.splice(group.indexOf(storyId), 1);
		await updateStoryGroup(repoId, groudId, group);
		return group;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in removeFromStoryGroup: ${e}`);
	}
}

async function getAllStoryGroups(repoId) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		return await collection.findOne({ _id: ObjectId(repoId) }, { projection: { groups: 1 } });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getAllStoryGroups: ${e}`);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getAllStoryGroups');
	}
}

async function updateStoryGroupsArray(repoId, groupsArray) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		return await collection.findOneAndUpdate({ _id: ObjectId(repoId) }, { $set: { groups: groupsArray } }, { projection: { groups: 1 } });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateStoryGroupsArray: ${e}`);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateStoryGroupsArray');
	}
}

async function getOneStoryGroup(repoId, groupId) {
	try {
		const groups = await getAllStoryGroups(repoId);
		return groups.groups.find((o) => o._id == groupId);
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getOneStoryGroup: ${e}`);
	}
}

// GET all StepTypes
async function showSteptypes() {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(steptypesCollection);
		return await collection.find({}).toArray();
	} catch (e) {
		console.log(`UPS!!!! FEHLER in showSteptypes: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - showSteptypes');
	}
}

// UPDATE Background
async function updateBackground(storyId, storySource, updatedBackground) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const story = await findStory(storyId, storySource, collection);
		story.background = updatedBackground;
		return await replace(story, collection);
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateBackground: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateBackground');
	}
}

// DELETE Background
async function deleteBackground(storyId, storySource) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const story = await findStory(storyId, storySource, collection);
		story.background = emptyBackground();
		return await replace(story, collection);
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteBackground: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteBackground');
	}
}

async function createStory(storyTitel, storyDescription, repoId) {
	let db;
	const iNumberArray = [];
	let finalIssueNumber = 0;
	try {
		db = await connectDb();
		const repoCollection = await selectRepositoryCollection(db);
		const collection = await selectStoriesCollection(db);
		const repo = await repoCollection.findOne({ _id: ObjectId(repoId) });
		if (repo) if (repo.stories.length > 0) {
			for (const storyId of repo.stories) {
				const story = await collection.findOne({ _id: ObjectId(storyId) });
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

		const story = emptyStory();
		story.title = storyTitel;
		story.body = storyDescription;
		story.issue_number = finalIssueNumber;
		const result = await collection.insertOne(story);
		return result.insertedId;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in createStory: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - createStory');
	}
}

async function deleteStory(repoId, storyId) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const repo = await selectRepositoryCollection(db);
		const delStory = await collection.findOneAndDelete({ _id: ObjectId(storyId) });
		await repo.findOneAndUpdate({ _id: ObjectId(repoId) }, { $pull: { stories: ObjectId(storyId) } });

		const groups = await repo.findOne({ _id: ObjectId(repoId) }, { projection: { groups: 1 } });
		for (const index in groups.groups) groups.groups[index].member_stories = groups.groups[index].member_stories.filter((story) => story !== storyId);
		await repo.findOneAndUpdate({ _id: ObjectId(repoId) }, { $set: { groups: groups.groups } });
		return delStory;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteStory: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteStory');
	}
}

async function insertStoryIdIntoRepo(storyId, repoId) {
	let db;
	try {
		db = await connectDb();
		const collectionRepo = await selectRepositoryCollection(db);
		return await collectionRepo.findOneAndUpdate({ _id: ObjectId(repoId) }, { $push: { stories: ObjectId(storyId) } });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in insertStoryIdIntoRepo: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - insertStoryIdIntoRepo');
	}
}

async function updateScenarioList(storyId, source, scenarioList) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		return await collection.findOneAndUpdate({ _id: ObjectId(storyId) }, { $set: { scenarios: scenarioList } });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in insertStoryIdIntoRepo: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateScenarioList');
	}
}

async function getAllStoriesOfRepo(ownerId, repoName, repoId) {
	let db;
	const storiesArray = [];
	try {
		db = await connectDb();
		const collectionRepo = await selectRepositoryCollection(db);
		const collectionStories = await selectStoriesCollection(db);
		const repo = await collectionRepo.findOne({ _id: ObjectId(repoId) });
		if (repo) for (const entry of repo.stories) {
			const story = await collectionStories.findOne({ _id: ObjectId(entry) });
			storiesArray.push(story);
		}
		return storiesArray;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getAllStoriesOfRepo: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getAllStoriesOfRepo');
	}
}

// GET ONE Scenario
async function getOneScenario(storyId, storySource, scenarioId) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const scenarios = await collection.findOne({ _id: ObjectId(storyId), storySource, 'scenarios.scenario_id': scenarioId }, { projection: { scenarios: 1 } });
		return scenarios.scenarios.find((o) => o.scenario_id === scenarioId);
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getOneScenario: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getOneScenario');
	}
}

// CREATE Scenario
async function createScenario(storyId, storySource) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const story = await findStory(storyId, storySource, collection);
		const lastScenarioIndex = story.scenarios.length;
		const tmpScenario = emptyScenario();
		if (story.scenarios.length === 0) story.scenarios.push(tmpScenario);
		else {
			tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
			story.scenarios.push(tmpScenario);
		}
		await replace(story, collection);
		return tmpScenario;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in createScenario: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - createScenario');
	}
}

// PUT Scenario
async function updateScenario(storyId, storySource, updatedScenario) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const story = await findStory(storyId, storySource, collection);
		for (const scenario of story.scenarios) {
			if (story.scenarios.indexOf(scenario) === story.scenarios.length) {
				story.scenarios.push(scenario);
				break;
			}
			if (scenario.scenario_id === updatedScenario.scenario_id) {
				story.scenarios.splice(story.scenarios.indexOf(scenario), 1, updatedScenario);
				break;
			}
		}
		let result = await replace(story, collection);
		result = result.scenarios.find((o) => o.scenario_id === updatedScenario.scenarioId);
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateScenario: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateScenario');
	}
}

// DELETE Scenario
async function deleteScenario(storyId, storySource, scenarioId) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const story = await findStory(storyId, storySource, collection);
		for (let i = 0; i < story.scenarios.length; i++) {
			if (story.scenarios[i].scenario_id === scenarioId) story.scenarios.splice(i, 1);
		}
		const result = await replace(story, collection);
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteScenario: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteScenario');
	}
}

// gets all Repositories of one user
async function getRepository(userID) {
	let db;
	try {
		const myObjt = { owner: ObjectId(userID) };
		db = await connectDb();
		const dbo = db.db(dbName);
		const wGCollection = await dbo.collection(WorkgroupsCollection);
		const repoCollection = await selectRepositoryCollection(db);
		const usersCollection = await selectUsersCollection(db);
		const user = await usersCollection.findOne({ _id: ObjectId(userID) });
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
		const finalResult = result.concat(PWgRepos, NWgRepos);
		return finalResult;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getRepository${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - GetRepository');
	}
}

// deletes all Repositories of own User
async function deleteRepositorys(ownerID) {
	let db;
	try {
		const myObjt = { owner: ObjectId(ownerID) };
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		return await collection.deleteMany(myObjt);
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteRepositorys${e}`);
		throw e;
	} finally {
		db.close();
		console.log('I am closing the DB here  - deleteRepositorys');
	}
}

async function deleteRepository(repoId, ownerId) {
	let db;
	try {
		db = await connectDb();
		const collectionRepo = await selectRepositoryCollection(db);
		const repo = await collectionRepo.findOne({ owner: ObjectId(ownerId), _id: ObjectId(repoId) });
		return await collectionRepo.deleteOne(repo);
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteRepository${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteRepository');
	}
}

async function getOneRepository(ownerId, name) {
	try {
		const repo = { owner: ObjectId(ownerId), repoName: name };
		const db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		const result = await collection.findOne(repo);
		db.close();
		console.log('I am closing the DB here - getOneRepository');
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getOneRepository${e}`);
	}
}

async function getOneGitRepository(name) {
	try {
		const myObjt = { repoName: name, repoType: 'github' };
		const db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		const result = await collection.findOne(myObjt);
		db.close();
		console.log('I am closing the DB here - getOneGitRepository');
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getOneGitRepository${e}`);
	}
}

async function createRepo(ownerId, name) {
	const emptyRepo = {
		owner: ownerId, repoName: name, stories: [], repoType: 'db', customBlocks: [], groups: []
	};
	const db = await connectDb();
	const collection = await selectRepositoryCollection(db);
	const result = await collection.findOne({ owner: ObjectId(ownerId), repoName: name });
	if (result !== null) return 'Sie besitzen bereits ein Repository mit diesem Namen!';
	collection.insertOne(emptyRepo);
}

async function createJiraRepoIfNoneExists(repoName, source) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		let result = await collection.findOne({ repoName, repoType: source });
		// create repo / project if there is none
		if (result === null) {
			const repo = {
				owner: '', repoName, stories: [], repoType: source, customBlocks: []
			};
			result = await collection.insertOne(repo);
			return result;
		}
		return result;
	} catch (e) {
		console.log(`ERROR in createJiraRepoIfNoneExists ${e}`);
		throw e;
	} finally {
		db.close();
		console.log('I am closing the DB here - createJiraRepoIfNoneExists');
	}
}

async function createGitOwnerRepoIfNoneExists(ownerId, githubId, gitOwnerId, repoName, source) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		const result = await collection.findOne({ owner: ObjectId(ownerId), repoName });
		if (result === null) {
			let repo = await collection.findOne({ gitOwner: gitOwnerId, repoName });
			// create repo / project if there is none
			if (repo === null) {
				const newRepo = {
					owner: '', gitOwner: gitOwnerId, repoName, stories: [], repoType: source, customBlocks: []
				};
				repo = await collection.insertOne(newRepo);
				return repo;
			}
			if (repo.gitOwner === githubId) repo.owner = ObjectId(ownerId);
			return repo;
		}
		return result._id;
	} catch (e) {
		console.log(`ERROR in createGitOwnerRepoIfNoneExists${e}`);
		throw e;
	} finally {
		db.close();
		console.log('I am closing the DB here - createGitOwnerRepoIfNoneExists');
	}
}

async function updateStoriesArrayInRepo(repoId, storiesArray) {
	let db;
	try {
		const sortedStoriesArray = storiesArray.map((s) => ObjectId(s));
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		return await collection.findOneAndUpdate({ _id: ObjectId(repoId) }, { $set: { stories: sortedStoriesArray } }, { returnNewDocument: true });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateStoriesArrayInRepo${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateStoriesArrayInRepo');
	}
}

async function upsertEntry(storyId, updatedContent, storySource) {
	let db;
	try {
		const myObjt = {
			story_id: storyId,
			storySource
		};
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
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
		console.log(`UPS!!!! FEHLER in upsertEntry: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - upsertEntry');
	}
}

async function getTestReports(storyId) {
	let db;
	let result;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(ReportDataCollection);
		console.log('Getting Report for storyId :', storyId);
		result = await collection.find({ storyId: ObjectId(storyId) },
			{ projection: { jsonReport: 0, reportOptions: 0, json: 0 } }).toArray();
		console.log('Got ', result.length, ' reports for  :', storyId);
	} catch (e) {
		console.log('UPS!!!! FEHLER in getTestReports', e);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getTestReports');
	}
	return result;
}

async function getGroupTestReports(storyId) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(ReportDataCollection);
		console.log('Getting Groups Reports for storyId :', storyId);
		// projection value 0 excludes from returning
		const query = { storyStatuses: { $elemMatch: { storyId: ObjectId(storyId) } } };
		const result = await collection.find(query,
			{ projection: { jsonReport: 0, reportOptions: 0, json: 0 } }).toArray();
		db.close();
		console.log('I am closing the DB here - getGroupTestReports');
		console.log('Got ', result.length, ' Group Reports for  :', storyId);
		return result;
	} catch (e) {
		console.log('Error in getGroupTestReports: ', e);
		return {};
	}
}

async function deleteReport(reportId) {
	let db;
	let result;
	let idToDelete;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(ReportDataCollection);
		const reportData = await collection.findOne({ _id: ObjectId(reportId) });
		if (reportData.smallReport) {
			idToDelete = reportData.smallReport;
			console.log('trying to delete smallReport', idToDelete, ' for Report', reportId);
			const reportsCollection = await dbo.collection(ReportsCollection);
			await reportsCollection.deleteOne({ _id: ObjectId(idToDelete) });
			result = await collection.deleteOne({ _id: ObjectId(reportId) });
		} else {
			idToDelete = reportData.bigReport;
			console.log('trying to delete bigReport', idToDelete, ' for Report', reportId);
			const bucket = await new mongodb.GridFSBucket(dbo, { bucketName: 'GridFS' });
			bucket.delete(ObjectId(idToDelete));
			result = await collection.deleteOne({ _id: ObjectId(reportId) });
		}
	} catch (e) {
		console.log('UPS!!!! FEHLER in deleteReport', e);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteReport');
	}
	return result;
}

async function setIsSavedTestReport(testReportId, isSaved) {
	let db;
	let result;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(ReportDataCollection);
		const updatedReport = await collection.findOne({ _id: ObjectId(testReportId) });
		updatedReport.isSaved = isSaved;
		result = await collection.findOneAndReplace({ _id: ObjectId(testReportId) },
			updatedReport);
	} catch (e) {
		console.log('UPS!!!! FEHLER in setIsSavedTestReport', e);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - setIsSavedTestReport');
	}
	return result;
}

async function updateStoryStatus(storyId, storyLastTestStatus) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		dbo.collection(storiesCollection).updateOne({ _id: ObjectId(storyId) }, {
			$set: { lastTestPassed: storyLastTestStatus }
		});
		// db.close();
		console.log('I would close the DB here - updateStoryStatus');
	} catch (e) {
		console.log('Error in updateStoryStatus: ', e);
		return {};
	}
}

async function updateScenarioStatus(storyId, scenarioId, scenarioLastTestStatus) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(storiesCollection);
		const story = await collection.findOne({ _id: ObjectId(storyId) });

		const scenarioList = story.scenarios;
		const scenario = scenarioList.find((scen) => scen.scenario_id === parseInt(scenarioId, 10));
		if (scenario) {
			const index = story.scenarios.indexOf(scenario);
			scenario.lastTestPassed = scenarioLastTestStatus;
			story.scenarios[index] = scenario;
		}
		return await collection.findOneAndReplace({ _id: ObjectId(storyId) }, story);
	} catch (e) {
		console.log('Error in updateScenarioStatus. Could not set scenario LastTestPassed: ', e);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateScenarioStatus');
	}
}

async function uploadBigJsonData(data, fileName) {
	const db = await connectDb();
	const dbo = db.db(dbName);
	const bucket = await new mongodb.GridFSBucket(dbo, { bucketName: 'GridFS' });
	const id = ObjectId();
	str(JSON.stringify(data))
		.pipe(bucket.openUploadStreamWithId(id, fileName))
		.on('error', async (error) => {
			assert.ifError(error);
		})
		.on('finish', async () => {
			console.log('done!');
		});
	return id;
}

async function uploadReport(reportResults) {
	const reportData = reportResults;
	const db = await connectDb();
	const dbo = db.db(dbName);
	const collection = await dbo.collection(ReportDataCollection);
	fs.readFile(reportResults.reportOptions.jsonFile, 'utf8', (err, data) => {
		const jReport = { jsonReport: data };
		const len = Buffer.byteLength(JSON.stringify(data));
		if (len >= 16000000) {
			try {
				reportData.bigReport = uploadBigJsonData(jReport, reportResults.storyId);
				collection.insertOne(reportData);
			} catch (e) {
				console.log('UPS!!!! FEHLER in uploadReport', e);
			} finally {
				if (db) if (db) console.log('I would close the DB here - uploadReport');
				// db.close();
			}
		} else {
			try {
				dbo.collection(ReportsCollection).insertOne(jReport);
				reportData.smallReport = jReport._id;
				collection.insertOne(reportData);
			} catch (e) {
				console.log('UPS!!!! FEHLER in uploadReport', e);
			} finally {
				if (db) console.log('I would close the DB here - uploadReport');
				// db.close();
			}
		}
	});
	return reportResults;
}

async function getReport(reportName) {
	let db;
	let result;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const name = { reportName };
		const collection = await dbo.collection(ReportDataCollection);
		const report = await collection.findOne(name);
		if (report.smallReport) {
			const reportCollection = await dbo.collection(ReportsCollection);
			const reportJson = await reportCollection.findOne({ _id: ObjectId(report.smallReport) });
			result = { _id: report._id, jsonReport: reportJson.jsonReport };
		} else {
			const bucket = await new mongodb.GridFSBucket(dbo, { bucketName: 'GridFS' });
			const reportString = await toString(bucket.openDownloadStream(ObjectId(report.bigReport.toString())));
			const reportJson = JSON.parse(reportString);
			result = { _id: report._id, jsonReport: reportJson.jsonReport };
		}
		return result;
	} catch (e) {
		console.log('UPS!!!! FEHLER in getReport', e);
		return {};
	} finally {
		if (db) // db.close();
		console.log('I am closing the DB here - getReport');
	}
}

// create User in DB needs JsonObject User returns JsonObject(user)
async function createUser(user) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectUsersCollection(db);
		const result = await collection.insertOne(user);
		console.log(result.ops[0]);
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in createUser: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - createUser');
	}
}

// delete User in DB needs ID
async function deleteUser(userID) {
	let db;
	try {
		const oId = ObjectId(userID);
		const myObjt = { _id: oId };
		db = await connectDb();
		const collection = await selectUsersCollection(db);
		const collectionRepo = await selectRepositoryCollection(db);
		const collectionStories = await selectStoriesCollection(db);
		const repos = await collectionRepo.find({ owner: oId }).toArray();
		if (repos) {
			for (const repo of repos) for (const storyID of repo.stories) await collectionStories.deleteOne({ _id: ObjectId(storyID) });

			const resultRepo = await collectionRepo.deleteMany({ owner: oId });
			const resultUser = await collection.deleteOne(myObjt);
			return resultUser + resultRepo;
		}
		return null;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteUser: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteUser');
	}
}

// update a User in DB needs ID and JsonObject User returns altered JsonObject User
async function updateUser(userID, updatedUser) {
	let db;
	try {
		const oId = ObjectId(userID);
		const myObjt = { _id: oId };
		db = await connectDb();
		const collection = await selectUsersCollection(db);
		const result = await collection.findOneAndReplace(myObjt, updatedUser);
		return result.value;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateUser: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateUser');
	}
}

// get UserData needs ID returns JsonObject User
async function getUserData(userID) {
	let db;
	try {
		const oId = ObjectId(userID);
		const myObjt = { _id: oId };
		db = await connectDb();
		const collection = await selectUsersCollection(db);
		return await collection.findOne(myObjt);
	} catch (e) {
		console.log(`UPS!!!! FEHLERin getUserData: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getUserData');
	}
}

async function saveBlock(block) {
	let db;
	try {
		block.repositoryId = ObjectId(block.repositoryId);
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(CustomBlocksCollection);
		return await collection.insertOne(block);
	} catch (e) {
		console.log(`UPS!!!! FEHLER in saveBlock: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - saveBlock');
	}
}

async function updateBlock(name, updatedBlock) {
	let db;
	const oldBlock = { name };
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(CustomBlocksCollection);
		await collection.findOneAndReplace(oldBlock, updatedBlock);
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateBlock: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateBlock');
	}
}

// get all Blocks by Id returns Array with all existing CustomBlocks
async function getBlocks(userId, repoId) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(CustomBlocksCollection);
		return await collection.find({ repositoryId: ObjectId(repoId) }).toArray();
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getBlocks: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getBlocks');
	}
}
// deletes the CustomBlock with the given Name, need the name
async function deleteBlock(blockId, userId) {
	let db;
	try {
		const myObjt = {
			_id: ObjectId(blockId),
			owner: ObjectId(userId)
		};
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(CustomBlocksCollection);
		const result = await collection.deleteOne(myObjt);
		// return result
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteBlock: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - deleteBlock');
	}
}

async function getWorkgroup(id) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(WorkgroupsCollection);
		return await collection.findOne({ Repo: ObjectId(id) });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getWorkgroup: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getWorkgroup');
	}
}

async function addMember(id, user) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const wGCollection = await dbo.collection(WorkgroupsCollection);
		const check = await wGCollection.findOne({ Repo: ObjectId(id), Members: { $elemMatch: { email: user.email } } });
		if (check) return 'Dieser User ist bereits in der Workgroup';
		const rCollection = await dbo.collection(repositoriesCollection);
		const repo = await rCollection.findOne({ _id: ObjectId(id) });
		const usersCollection = await selectUsersCollection(db);
		const owner = await usersCollection.findOne({ _id: repo.owner });
		const workGroup = await wGCollection.findOne({ Repo: ObjectId(id) });
		if (!workGroup) {
			await wGCollection.insertOne({
				name: repo.repoName, owner: owner.email, Repo: ObjectId(id), Members: [{ email: user.email, canEdit: user.canEdit }]
			});
			const result = { owner: {}, member: [] };
			const wG = await wGCollection.findOne({ Repo: ObjectId(id) });
			result.owner = { email: owner.email, canEdit: true };
			result.member = wG.Members;
			return result;
		}
		// if there is a workGroup already:
		await wGCollection.findOneAndUpdate({ Repo: ObjectId(id) }, { $push: { Members: user } });
		const result = { owner: {}, member: [] };
		const wG = await wGCollection.findOne({ Repo: ObjectId(id) });
		result.owner = { email: owner.email, canEdit: true };
		result.member = wG.Members;
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in addMember: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - addMember');
	}
}

async function updateMemberStatus(repoId, user) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const wGCollection = await dbo.collection(WorkgroupsCollection);
		const rCollection = await dbo.collection(repositoriesCollection);
		const repo = await rCollection.findOne({ _id: ObjectId(repoId) });
		const usersCollection = await selectUsersCollection(db);
		const owner = await usersCollection.findOne({ _id: repo.owner });
		const updatedWG = await wGCollection.findOneAndUpdate({ Repo: ObjectId(repoId) }, { $set: { 'Members.$[elem].canEdit': user.canEdit } }, { arrayFilters: [{ 'elem.email': user.email }] });
		if (updatedWG) {
			const wG = await wGCollection.findOne({ Repo: ObjectId(repoId) });
			const result = { owner: {}, member: [] };
			result.owner = { email: owner.email, canEdit: true };
			result.member = wG.Members;
			return result;
		}
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateMemberStatus: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateMemberStatus');
	}
}

async function getMembers(id) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const wGCollection = await dbo.collection(WorkgroupsCollection);
		const rCollection = await dbo.collection(repositoriesCollection);
		const repo = await rCollection.findOne({ _id: ObjectId(id) });
		const usersCollection = await selectUsersCollection(db);
		const owner = await usersCollection.findOne({ _id: repo.owner });
		const wG = await wGCollection.findOne({ Repo: ObjectId(id) });
		if (!wG) return { owner: { email: owner.email, canEdit: true }, member: [] };
		const result = { owner: {}, member: [] };
		result.owner = { email: owner.email, canEdit: true };
		result.member = wG.Members;
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in getMembers: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - getMembers');
	}
}

async function removeFromWorkgroup(id, user) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const wGcollection = await dbo.collection(WorkgroupsCollection);
		const rCollection = await dbo.collection(repositoriesCollection);
		const repo = await rCollection.findOne({ _id: ObjectId(id) });
		const usersCollection = await selectUsersCollection(db);
		const owner = await usersCollection.findOne({ _id: repo.owner });
		const workGroup = await wGcollection.findOneAndUpdate({ Repo: ObjectId(id) }, { $pull: { Members: { email: user.email } } });
		if (workGroup) {
			const wG = await wGcollection.findOne({ Repo: ObjectId(id) });
			const result = { owner: {}, member: [] };
			result.owner = { email: owner.email, canEdit: true };
			result.member = wG.Members;
			return result;
		}
	} catch (e) {
		console.log(`UPS!!!! FEHLER in removeFromWorkgroup: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - removeFromWorkgroup');
	}
}

async function updateOneDriver(id, driver) {
	let db;
	try {
		const oneDriver = !driver.oneDriver;
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const result = await collection.findOneAndUpdate(
			{ _id: ObjectId(id) },
			{ $set: { oneDriver } }
		);
		return result.value;
	} catch (e) {
		console.log('UPS!!!! FEHLER in updateOneDriver: ', e);
	} finally {
		if (db) db.close();
		console.log('I am closing the DB here - updateOneDriver');
	}
}

module.exports = {
	setIsSavedTestReport,
	deleteReport,
	getTestReports,
	getGroupTestReports,
	getReport,
	uploadReport,
	disconnectGithub,
	mergeGithub,
	findOrRegister,
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
	getOneStoryByStoryId,
	upsertEntry,
	updateStory,
	createUser,
	deleteUser,
	updateUser,
	getUserData,
	createGitOwnerRepoIfNoneExists,
	createJiraRepoIfNoneExists,
	updateStoriesArrayInRepo,
	getRepository,
	deleteRepository,
	getOneRepository,
	getOneGitRepository,
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
	selectStoriesCollection,
	connectDb,
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
	updateStoryStatus
};
