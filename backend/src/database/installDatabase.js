const { MongoClient } = require('mongodb');
const stepTypes = require('./stepTypes');
require('dotenv').config();

const uri = process.env.DATABASE_URI;

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
	// eslint-disable-next-line max-len
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

// insert Many documents ("collectionname", [{documents},{...}] )
function insertMore(name, content) {
	MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
		if (err) throw err;
		const dbo = db.db('Seed');
		dbo.collection(name).insertMany(content, (error, res) => {
			if (error) throw error;
			console.log(`Number of documents inserted: ${res.insertedCount}`);
			db.close();
		});
	});
}

installDatabase();
