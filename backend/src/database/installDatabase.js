const { MongoClient } = require('mongodb');
const { exit } = require('process');
const stepTypes = require('./stepTypes');
require('dotenv').config();

const uri = process.env.DATABASE_URI || 'mongodb://SeedAdmin:SeedTest@localhost:27017';

async function checkConnection() {
	let fails = 1;
	while (fails <= 3) try {
		const client = await MongoClient.connect(uri, { poolSize: 20, useNewUrlParser: true, useUnifiedTopology: true });
		return client;
	} catch (err) {
		console.log(`Connection failed! Retrying... ${fails}`);
		fails++;
	}

	throw new Error('Failed to connect to the database after multiple retries.');
}

async function makeCollection(dbo, name) {
	const exists = (await dbo.listCollections({ name }).toArray()).length > 0;
	if (exists) {
		console.log(`Collection: ${name} already exists and will be skipped.\n`);
		return;
	}
	const collection = dbo.collection(name);

	try {
		await dbo.createCollection(name);
		if (name === 'stepTypes') {
			console.log('Inserting stepType documents:');
			const insertionResult = await collection.insertMany(stepTypes(), { ordered: false });
			console.log(`Number of documents inserted: ${insertionResult.insertedCount}`);
		}
		console.log(`Collection ${name} created!\n`);
	} catch (error) {
		console.error(`\x1b[31m Error creating collection: ${name}\n\x1b[0m`, error.message);
	}
}

async function installDatabase() {
	console.log(`\x1b[33m Setting Up DB in: ${uri}\n\x1b[0m`);
	const client = await checkConnection();
	const dbo = client.db('Seed');

	console.log('Starting: steps');
	await makeCollection(dbo, 'stepTypes');
	console.log('Starting: stories');
	await makeCollection(dbo, 'Stories');
	console.log('Starting: user');
	await makeCollection(dbo, 'User');

	console.log('\x1b[32m Database set up! \x1b[0m');
	client.close();
}

installDatabase().then(() => {
	exit();
})
	.catch((err) => {
		console.error(err);
		exit(1);
	});
