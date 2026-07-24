import { MongoClient, Db } from 'mongodb';
import { setTimeout } from 'timers/promises';

const uri: string = process.env.DATABASE_URI || 'mongodb://SeedAdmin:SeedTest@seedmongodb:27017';

let connection: Db | null = null;

// Create the database connection
export async function establishConnection(attempt: number = 1): Promise<MongoClient> {
	if (attempt > 3) 
		throw new Error('\x1b[31mFailed to connect to the database after multiple retries.\x1b[0m');
	

	try {
		const client = await MongoClient.connect(uri, { maxPoolSize: 20 });
		connection = client.db('Seed');
		return client;
	} catch (_err) {
		console.log(`\x1b[38;5;208mConnection failed! Retrying... ${attempt}\x1b[0m`);
		await setTimeout(3000);
		return establishConnection(attempt + 1);
	}
}

export function getConnection(): Db {
	if (!connection) 
		throw new Error('Database connection has not been established yet.');
	
	return connection;
}