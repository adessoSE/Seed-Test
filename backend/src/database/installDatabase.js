const { MongoClient } = require('mongodb');
const { resolve } = require('path');
const { exit } = require('process');
const stepTypes = require('./stepTypes');
require('dotenv').config();

const uri = process.env.DATABASE_URI;

async function checkConnection() {
	var fails = 1;
	await MongoClient.connect(uri, { poolSize: 20, useNewUrlParser: true, useUnifiedTopology: true }, async (err, dbo) => {
		if (err) {
			console.log("Connection failed ! retrying ... " + fails);
			fails++;
			checkConnection()
		}
	});
}

async function installDatabase() {
	console.log (`Setting Up DB in: ${uri}`);
	await checkConnection()
	console.log("Starting: steps");
	await makeCollection('stepTypes');
	console.log("Starting: stories");
	await makeCollection('Stories');
	console.log("Starting: user");
	await makeCollection('User');
}

// create Collection
async function makeCollection(name) {
	let connection = [];
	// eslint-disable-next-line max-len
	await MongoClient.connect(uri, { poolSize: 20, useNewUrlParser: true, useUnifiedTopology: true }, async (err, dbo) => {
		if (err) throw err;
		connection = dbo.db('Seed');
	});
	// sleep 3000 ms
	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	await delay(3000);
	await new Promise((resolve) => { connection.createCollection(name, (error) => {
		if (error) {
			if (error.message.includes("already exists")) {
				console.log("Collection: " + name + " already exists and will be skipped.");
				resolve();
				return;
			} else {
				throw error;
			}
		};
		console.log(`Collection ${name} created!`);
		if (name === "stepTypes") {
			console.log("Adding StepTypes: ");
			insertMore('stepTypes', stepTypes());
		}
		resolve();
	})});
}

// insert Many documents ("collectionname", [{documents},{...}] )
function insertMore(name, content) {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db('Seed');
		dbo.collection(name).insertMany(content, (error, res) => {
			if (error) throw error;
			console.log(`Number of documents inserted: ${res.insertedCount}`);
		});
	});
}

installDatabase().then(() => {exit()})