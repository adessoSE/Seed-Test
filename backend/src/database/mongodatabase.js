/* eslint-disable no-unused-vars */
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID;
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
const testreportCollection = 'TestReport';
const repositoriesCollection = 'Repositories';
const steptypesCollection = 'stepTypes';
const PwResetReqCollection = 'PwResetRequests';
const CustomBlocksCollection = 'CustomBlocks';
const WorkgroupsCollection = 'Workgroups';
// ////////////////////////////////////// API Methods /////////////////////////////////////////////
// async function createTTLIndex(){
//   let db = await connectDb()
//   let dbo = db.db(dbName);
//   let collection = await dbo.collection("PwResetRequests")
//   collection.createIndex({"createdAt": 1 }, { expireAfterSeconds: 3600 } )
//   db.close()
// }

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
	}
}

async function deleteRequest(mail) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(PwResetReqCollection);
		const result = await collection.deleteOne({ email: mail });
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteRequest: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
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
	}
}

async function getUserByGithub(login, id) {
	const db = await connectDb();
	const dbo = await db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const result = await collection.findOne({ $and: [{ 'github.id': id }, { 'github.login': login }] });
	db.close();
	return result;
}

async function getUserById(id) {
	const db = await connectDb();
	const dbo = await db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const result = await collection.findOne({ _id: ObjectId(id) });
	db.close();
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
	return user;
}

function connectDb() {
	return new Promise((resolve, reject) => {
		MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
			if (err) reject(err);
			else resolve(db);
		});
	});
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
	const myObjt = {
		_id: ObjectId(story._id),
		storySource: story.storySource
	};
	story._id = ObjectId(story._id);
	return new Promise((resolve, reject) => {
		collection.findOneAndReplace(myObjt, story, { returnOriginal: false }, (err, result) => {
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
		collection.findOneAndReplace(myObjt, newUser, { returnOriginal: false }, (err, result) => {
			if (err) reject(err);
			else resolve(result.value);
		});
	});
}

async function updateStory(updatedStuff) {
	console.log('updateStuff', updatedStuff);
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
	}
}

async function createStoryGroup(repoID, name, members) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectRepositoryCollection(db);

		const groups = await collection.findOneAndUpdate(
			{ _id: ObjectId(repoID) },
			{ $push: { groups: { _id: ObjectId(), name, member_stories: members || [] } } },
			{ upsert: true, projection: { groups: 1 }, returnOriginal: false }
		);
		return groups.value.groups.slice(-1)._id;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in createStoryGroup: ${e}`);
	} finally {
		if (db) db.close();
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
	}
}

async function getAllStoriesOfRepo(ownerId, repoName, repoId) {
	console.log('getAllStoriesOfRepo', ownerId, repoName, repoId);
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
	}
}

// DELETE Scenario
async function deleteScenario(storyId, storySource, scenarioID) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const story = await findStory(storyId, storySource, collection);
		for (let i = 0; i < story.scenarios.length; i++) {
			if (story.scenarios[i].scenario_id === scenarioID) story.scenarios.splice(i, 1);
		}
		const result = await replace(story, collection);
		db.close();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in deleteScenario: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
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
	}
}

async function getOneRepository(ownerId, name) {
	try {
		const repo = { owner: ObjectId(ownerId), repoName: name };
		const db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		const result = await collection.findOne(repo);
		db.close();
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
			returnOriginal: false,
			upsert: false
		});
		// TODO remove later when all used stories have the tag storySource
		if (!result.value) {
			myObjt.storySource = undefined;
			result = await collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
				returnOriginal: false,
				upsert: true
			});
		}
		return result.value;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in upsertEntry: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
	}
}

async function getTestReports(storyId) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(testreportCollection);
		console.log('Getting Report for storyId :', storyId);
		const result = await collection.find({ storyId: ObjectId(storyId) },
			{ projection: { json: 0, reportOptions: 0 } }).toArray();
		db.close();
		console.log('Got ', result.length, ' reports for  :', storyId);
		return result;
	} catch (e) {
		console.log('UPS!!!! FEHLER in getTestReports', e);
	}
}

async function deleteReport(testReportId) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(testreportCollection);
		const result = await collection.deleteOne({ _id: ObjectId(testReportId) });
		db.close();
		return result;
	} catch (e) {
		console.log('UPS!!!! FEHLER in getTestReports', e);
	}
}

async function setIsSavedTestReport(testReportId, isSaved) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(testreportCollection);
		const updatedReport = await collection.findOne({ _id: ObjectId(testReportId) });
		updatedReport.isSaved = isSaved;
		const result = await collection.findOneAndReplace({ _id: ObjectId(testReportId) },
			updatedReport, { returnOriginal: false });
		db.close();
		return result;
	} catch (e) {
		console.log('UPS!!!! FEHLER in getTestReports', e);
	}
}

async function uploadReport(reportData) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(testreportCollection);
		const result = await collection.insertOne(reportData);
		db.close();
		return result;
	} catch (e) {
		console.log('UPS!!!! FEHLER in uploadReport', e);
	}
}

async function getReport(reportName) {
	let db;
	try {
		const report = { reportName };
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(testreportCollection);
		const result = await collection.findOne(report);
		db.close();
		return result;
	} catch (e) {
		console.log('UPS!!!! FEHLER in getReport', e);
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
	}
}

// delete User in DB needs ID TODO: Chris alles überarbeiten!!!!
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
		const result = await collection.findOneAndReplace(myObjt, updatedUser, { returnOriginal: false });
		return result.value;
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateUser: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
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
	}
}

async function updateBlock(name, updatedBlock) {
	let db;
	const oldBlock = { name };
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(CustomBlocksCollection);
		await collection.findOneAndReplace(oldBlock, updatedBlock, { returnOriginal: false });
	} catch (e) {
		console.log(`UPS!!!! FEHLER in updateBlock: ${e}`);
		throw e;
	} finally {
		if (db) db.close();
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
	}
}

async function updateOneDriver(id, driver) {
  let db;
  try {
    let oneDriver = !driver.oneDriver
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let result = await collection.findOneAndUpdate({ _id: ObjectId(id) }, { $set: {oneDriver: oneDriver }}, {returnOriginal: false})
    return result.value
  } catch (e) {
    console.log("UPS!!!! FEHLER in updateOneDriver: " + e)
  } finally {
    if (db) db.close()
  }
}


module.exports = {

	setIsSavedTestReport,
	deleteReport,
	getTestReports,
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
	removeFromWorkgroup
  updateOneDriver,
};
