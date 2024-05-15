import * as mongodb from "mongodb";
import { setTimeout } from "timers/promises";
const { MongoClient } = mongodb;
const uri = process.env.DATABASE_URI || 'mongodb://SeedAdmin:SeedTest@seedmongodb:27017';
let connection = [];
// Create the database connection
async function establishConnection(attempt) {
    const attempts = attempt || 1;
    if (attempt > 3)
        throw new Error('\x1b[31mFailed to connect to the database after multiple retries.\x1b[0m');
    try {
        const client = await MongoClient.connect(uri, { maxPoolSize: 20 });
        connection = client.db('Seed');
        return client;
    }
    catch (err) {
        console.log(`\x1b[38;5;208mConnection failed! Retrying... ${attempts}\x1b[0m`);
        await setTimeout(3000);
        return establishConnection(attempts + 1);
    }
}
function getConnection() {
    return connection;
}
export { establishConnection };
export { getConnection };
export default {
    establishConnection,
    getConnection
};
