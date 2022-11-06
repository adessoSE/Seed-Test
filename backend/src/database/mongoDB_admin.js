/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const mongo = require('./DbServices');
const stepTypes = require('./stepTypes');
require('dotenv').config();

const uri = process.env.DATABASE_URI;
const dbName = 'Seed';

// ///////////////////////////////////////////    ADMIN  METHODS  ////////////////////////////////////////////

// Please keep in mind that when you change the stepDefs in the Database with this function, you also have to apply that change manualy in the stepdefs.js in features/step_definitions
// if "story_id" Parameter is null: Updates "pre" Stepdefinitions in the "Stories" Collection and sets each step to outdated: true
// else: Updates "pre" Stepdefinitions in the selected Story and sets each step to outdated: true
async function updatePreStepsInOneStory(oldText, newText, story_id) {
	let myObjt;
	if (story_id == null) myObjt = {};
	else myObjt = { story_id };

	try {
		const db = await mongo.connectDb();
		const collection = await mongo.selectStoriesCollection(db);
		await collection.updateMany(myObjt, { $set: { 'background.stepDefinitions.when.$[elem].outdated': true } }, { arrayFilters: [{ 'elem.pre': oldText }], upsert: true });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.given.$[elem].outdated': true } }, { arrayFilters: [{ 'elem.pre': oldText }], upsert: true });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.when.$[elem].outdated': true } }, { arrayFilters: [{ 'elem.pre': oldText }], upsert: true });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.then.$[elem].outdated': true } }, { arrayFilters: [{ 'elem.pre': oldText }], upsert: true });
		await collection.updateMany(myObjt, { $set: { 'background.stepDefinitions.when.$[elem].pre': newText } }, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.given.$[elem].pre': newText } }, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.when.$[elem].pre': newText } }, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.then.$[elem].pre': newText } }, { arrayFilters: [{ 'elem.pre': oldText }] });
		db.close();
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	}
}

// Please keep in mind that when you change the stepDefs in the Database with this function, you also have to apply that change manualy in the stepdefs.js in features/step_definitions
// if "story_id" Parameter is null: Updates "mid" Stepdefinitions in the "Stories" Collection and sets each step to outdated: true
// else: Updates "mid" Stepdefinitions in the selected Story and sets each step to outdated: true
async function updateMidStepsInOneStory(oldText, newText, story_id) {
	let myObjt;
	if (story_id == null) myObjt = {};
	else myObjt = { story_id };

	try {
		const db = await mongo.connectDb();
		const collection = await mongo.selectStoriesCollection(db);
		await collection.updateMany(myObjt, { $set: { 'background.stepDefinitions.when.$[elem].outdated': true } }, { arrayFilters: [{ 'elem.mid': oldText }], upsert: true });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.given.$[elem].outdated': true } }, { arrayFilters: [{ 'elem.mid': oldText }], upsert: true });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.when.$[elem].outdated': true } }, { arrayFilters: [{ 'elem.mid': oldText }], upsert: true });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.then.$[elem].outdated': true } }, { arrayFilters: [{ 'elem.mid': oldText }], upsert: true });
		await collection.updateMany(myObjt, { $set: { 'background.stepDefinitions.when.$[elem].mid': newText } }, { arrayFilters: [{ 'elem.mid': oldText }] });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.given.$[elem].mid': newText } }, { arrayFilters: [{ 'elem.mid': oldText }] });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.when.$[elem].mid': newText } }, { arrayFilters: [{ 'elem.mid': oldText }] });
		await collection.updateMany(myObjt, { $set: { 'scenarios.$[].stepDefinitions.then.$[elem].mid': newText } }, { arrayFilters: [{ 'elem.mid': oldText }] });
		db.close();
		return result;
	} catch (e) {
		console.log(`UPS!!!! FEHLER: ${e}`);
	}
}

// Creates Database Backupfile
async function writeBackup() {
	fs.writeFile(path.join('./dbbackups/dbbackup.json'), await createContent(), (err) => {
		if (err) throw err;
	});
}

// writeBackup()
async function createContent() {
	const collection = await getCollection();
	let data = '[\n';
	collection.forEach((item, index, arr) => {
		if (item === arr[arr.length - 1]) data += `${JSON.stringify(item)}\n]`;
		else data += `${JSON.stringify(item)},\n`;
	});
	return data;
}

// show all Collections
function getCollections() {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		dbo.listCollections().toArray((error, result) => {
			if (error) throw error;
			console.log(`showMeCollections error: ${result}`);
			db.close();
		});
	});
}

async function installDatabase() {
	console.log (`Setting Up DB in: ${uri}`);
	await makeCollection('stepTypes');
	await makeCollection('Stories');
	await makeCollection('User');
	await insertMore('stepTypes', stepTypes());
}

// create Collection
async function makeCollection(name) {
	let connection = [];
	await MongoClient.connect(uri, { poolSize: 20, useNewUrlParser: true, useUnifiedTopology: true }, async (err, dbo) => {
		if (err) throw err;
		connection = dbo.db('Seed');
	});
	// sleep 3000 ms
	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	await delay(3000);
	await connection.createCollection(name, (error) => {
		if (error) throw error;
		console.log(`Collection ${name} created!`);
	});
}

// insert One document (collectionname, {document})
function insertOne(collection, content) {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		dbo.collection(collection).insertOne(content, (error) => {
			if (error) throw error;
			db.close();
		});
	});
}

// show content of a specific collection
async function getCollection() {
	const db = await mongo.connectDb();
	const collection = await mongo.selectStoriesCollection(db);
	const result = await collection.find({}).toArray();
	db.close();
	return result;
}
async function backupScenarios() {
	const stories = await getCollection();
	const backup = dbBackup();
	for (x of stories) {
		console.log(`Checking Story: ${x.story_id}`);
		if (x.scenarios[0] !== undefined) {
			console.log(x.scenarios[0].stepDefinitions);
			if (x.scenarios[0].stepDefinitions.given.length === 0 && x.scenarios[0].stepDefinitions.when.length === 0 && x.scenarios[0].stepDefinitions.then.length === 0) for (const y of backup) if (y.story_id === x.story_id) {
				console.log(`Updating Story: ${x.story_id}`);
				await mongo.updateStory(y);
				console.log(`Replaced Story: ${x.story_id}`);
			}
		}
	}
}

// insert Many documents ("collectionname", [{documents},{...}] )
function insertMore(name, content) {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		dbo.collection(name).insertMany(content, (error, res) => {
			if (error) throw error;
			console.log(`Number of documents inserted: ${res.insertedCount}`);
			db.close();
		});
	});
}

function update(story_id, updatedStuff) {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		dbo.collection(collection).updateOne({ story_id }, { $set: updatedStuff }, (error, res) => {
			if (error) throw error;
			db.close();
		});
	});
}

// doesnt work yet
function eraseAllStories() {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		dbo.collection(collection).deleteOne({}, (error) => {
			if (error) throw error;
			db.close();
		});
	});
}

// shows single story
function showStory(story_id) {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		const myObjt = { story_id };
		dbo.collection(collection).findOne(myObjt, (error, result) => {
			if (error) throw error;
			console.log(`showStory error: ${result}`);
			db.close();
		});
	});
}

// delete collection
function dropCollection() {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		dbo.collection(collection).drop((error, delOK) => {
			if (error) throw error;
			if (delOK) console.log('Collection deleted');
			db.close();
		});
	});
}


function deleteOldReports() {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		dbo.collection('TestReport').deleteMany({ reportTime: { $lt: 1622505600000 } });
		console.log('Deleted and Updated Something');
		db.close();
	});
}

function fixOldReports() {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db(dbName);
		dbo.collection('TestReport')
			// use updateMany for all reports
			.updateOne({}, {
				$rename: {
					'testStatus': 'overallTestStatus',
					'jsonReport': 'json'
				}
			});
		console.log('Updated Something');
		db.close();
	});
}

module.exports = {
	installDatabase
};
