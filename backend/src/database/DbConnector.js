const { MongoClient } = require('mongodb');
const assert = require('assert');

const uri = process.env.DATABASE_URI;

let connection = [];
// Create the database connection
async function establishConnection(callback) {
	// eslint-disable-next-line max-len
	MongoClient.connect(uri, { poolSize: 20, useNewUrlParser: true, useUnifiedTopology: true }, async (err, db) => {
		assert.equal(null, err);
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
