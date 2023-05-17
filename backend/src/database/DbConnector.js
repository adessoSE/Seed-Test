const { MongoClient } = require('mongodb');
const assert = require('assert');
const { exit } = require('process');

const uri = process.env.DATABASE_URI || "mongodb://SeedAdmin:SeedTest@seedmongodb:27017";

let connection = [];
// Create the database connection
async function establishConnection(callback) {
	// eslint-disable-next-line max-len
	MongoClient.connect(uri, { poolSize: 20, useNewUrlParser: true, useUnifiedTopology: true }, async (err, db) => {
		if(err) {
			console.log('DB_ERROR: Can`t connect to DB. The Proejct may hasn`t been set up correctly. For more information read the README');
			exit(-1)
		}
		connection = db.db('Seed');
		if (typeof callback === 'function' && callback()) callback(connection);
		console.log('Established Database Connection!');
	});
}

function getConnection() {
	return connection;
}

module.exports = {
	establishConnection,
	getConnection
};
