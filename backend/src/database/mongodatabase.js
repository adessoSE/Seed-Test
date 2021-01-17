/* eslint-disable no-unused-vars */
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID;
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');

// if (!process.env.NODE_ENV) {
// 	const dotenv = require('dotenv').config();
// }

const uri = process.env.DATABASE_URI;
const dbName = 'Seed';
const userCollection = 'User';
const storiesCollection = 'Stories';
const testReportCollection = 'TestReport';
const repositoriesCollection = 'Repositories';
const steptypesCollection = 'stepTypes';
// ////////////////////////////////////// API Methods /////////////////////////////////////////////

function connectDb() {
	return new Promise((resolve, reject) => {
		MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
			if (err) reject(err);
			else resolve(db);
		});
	});
}

async function getUserByEmail(email) {
	const db = await connectDb();
	const dbo = await db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const result = await collection.findOne({ email });
	db.close();
	return result;
}

async function registerUser(user) {
	const db = await connectDb();
	const dbo = db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const dbUser = await getUserByEmail(user.email);
	let result;
	if (dbUser !== null) result = 'User already exists';
	else result = await collection.insertOne(user);
	return result;
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

async function registerGithubUser(user) {
	const db = await connectDb();
	const dbo = db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const result = await collection.insertOne({ github: user });
	return result;
}

// delete User in DB needs ID
async function deleteUser(userID) {
	let db;
	try {
		const oId = ObjectId(userID);
		const myObjt = { _id: oId };
		db = await connectDb();
		const collection = await selectUsersCollection(db);
		await collection.deleteOne(myObjt);
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	} finally {
		if (db) db.close();
	}
}
// update a User in DB needs ID and JsonObject User returns altered JsonObject User
async function updateUser(userID, updatedUser) {
	let db;
	try {
		oId = ObjectId(userID);
		const myObjt = { _id: oId };
		db = await connectDb();
		const collection = await selectUsersCollection(db);
		const result = await collection.findOneAndReplace(myObjt, updatedUser, { returnOriginal: false });
		return result.value;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	} finally {
		if (db) db.close();
	}
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

async function mergeGithub(userId, login, id) {
	const db = await connectDb();
	const dbo = db.db(dbName);
	const collection = await dbo.collection(userCollection);
	const githubAccount = await getUserByGithub(login, id);
	const seedAccount = await getUserById(userId);
	seedAccount.github = githubAccount.github;
	if (githubAccount.hasOwnProperty('jira') && !seedAccount.hasOwnProperty('jira')) seedAccount.jira = githubAccount.jira;
	await deleteUser(githubAccount._id);
	const result = await replaceUser(seedAccount, collection);
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

async function findOrRegister(user) {
	let result = await getUserByGithub(user.login, user.id);
	if (!result) result = await registerGithubUser(user);
	else result = await updateGithubToken(result._id, user.githubToken);
	return result;
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
	const myObjt = {
		_id: ObjectId(storyId),
		storySource
	};
	return new Promise((resolve, reject) => {
		collection.findOne(myObjt, (err, result) => {
			if (err) reject(err);
			else resolve(result);
		});
	});
}


function replace(story, collection) {
	const myObjt = {
		_id: ObjectId(story.story_id),
		storySource: story.storySource
	};
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
	const removedUser = await replaceUser(user, collection);
	return removedUser;
}


async function updateStory(updatedStuff) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const story = await replace(updatedStuff, collection);
		return story;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
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
		let story = await findStory(storyId, storySource, collection);
		// TODO remove later when all used stories have the tag storySource
		if (!story) story = await findStory(storyId, undefined, collection);

		return story;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	} finally {
		if (db) db.close();
	}
}

// GET all  Steptypes
async function showSteptypes() {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(steptypesCollection);
		const result = await collection.find({}).toArray();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	} finally {
		if (db) db.close();
	}
}

// Create Background
// async function createBackground(storyId, storySource) {
//  let db;
//  try {
//    db = await connectDb()
//    let collection = await selectStoriesCollection(db)
//    let story = await findStory(storyId, storySource, collection)
//    const tmpBackground = emptyBackground();
//    story.background = tmpBackground;
//    let result = await replace(story, collection)
//    return result
//  } catch (e) {
//    console.log("UPS!!!! FEHLER: " + e)
//  } finally {
//    if(db) db.close()
//  }
// }

// UPDATE Background
async function updateBackground(storyId, storySource, updatedBackground) {
	let db;
	try {
		db = await connectDb();
		const collection = await selectStoriesCollection(db);
		const story = await findStory(storyId, storySource, collection);
		story.background = updatedBackground;
		const result = await replace(story, collection);
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
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
		const result = await replace(story, collection);
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
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
		console.log(`UPS!!!! FEHLER: ${e}`);
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
		for (let i = 0; i < story.scenarios.length; i++) if (story.scenarios[i].scenario_id === scenarioID) story.scenarios.splice(i, 1);

		const result = await replace(story, collection);
		db.close();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	} finally {
		if (db) db.close();
	}
}

// POST Scenario
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
		const result = await replace(story, collection);
		db.close();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	} finally {
		if (db) db.close();
	}
}

//finds all owned repositories of one user
async function getRepository(userID) {
	try {
		const myObjt = { owner: ObjectId(userID) };
		const db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		const result = await collection.find(myObjt).toArray();
		db.close();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	}
}

async function getOneRepository(id, name) {
	try {
		const myObjt = { name: name, owner: ObjectId(id) };
		const db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		const result = await collection.findOne(myObjt);
		db.close();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER${e}`);
	}
}

async function insertEntry(name, id) {
	const myObjt = { name, owner: ObjectId(id), issues: { } };
	const db = await connectDb();
	const collection = await selectRepositoryCollection(db);
	collection.insertOne(myObjt);
}

async function addIssue(issue, name, id) {
	try {
		const myObjt = { name, owner: ObjectId(id)};
		const db = await connectDb();
		const collection = await selectRepositoryCollection(db);
		const result = await collection.findOne(myObjt);
		const { issues } = result;
		let highest = 0;
		if (issues.length > 0) issues.forEach((issue) => {
			if (issue.id > highest) highest = issue.id;
		});

		issue.id = highest + 1;
		issues[issue.id] = issue;
		result.issues = issues;
		collection.findOneAndUpdate(myObjt, { $set: result }, {
			returnOriginal: false,
			upsert: true
		}, (error) => {
			if (error) throw error;
			db.close();
		});
		db.close();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER${e}`);
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
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	} finally {
		if (db) db.close();
	}
}

async function uploadReport(reportData) {
	let db;
	try {
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(testReportCollection);
		const result = await collection.insertOne(reportData);
		db.close();
		return result;
	} catch (e) {
		console.log('UPS!!!! FEHLER', e);
	}
}

async function getReport(reportName) {
	let db;
	try {
		const report = { reportName };
		db = await connectDb();
		const dbo = db.db(dbName);
		const collection = await dbo.collection(testReportCollection);
		const result = await collection.findOne(report);
		db.close();
		return result;
	} catch (e) {
		console.log('UPS!!!! FEHLER', e);
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
		console.log(`UPS!!!! FEHLER: ${e}`);
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
		const result = await collection.findOne(myObjt);
		db.close();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	} finally {
		if (db) db.close();
	}
}

module.exports = {
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
	createScenario,
	deleteScenario,
	updateScenario,
	getOneStory,
	insertEntry,
	upsertEntry,
	updateStory,
	createUser,
	deleteUser,
	updateUser,
	getUserData,
	getRepository,
	getOneRepository,
	addIssue,
	selectStoriesCollection,
	connectDb
};
