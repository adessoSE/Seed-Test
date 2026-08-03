import { MongoClient, type Db } from 'mongodb';
import { setTimeout } from 'node:timers/promises';
import { logger } from '../logging.js';

const uri: string = process.env.DATABASE_URI || 'mongodb://SeedAdmin:SeedTest@seedmongodb:27017';
// Docker default above matches docker-compose.yml — override via DATABASE_URI in .env for production

let connection: Db | null = null;
// Module-level client reference — needed for graceful shutdown (closeConnection)
let client: MongoClient | null = null;

// Create the database connection
export async function establishConnection(attempt: number = 1): Promise<MongoClient> {
	if (attempt > 3) 
		throw new Error('Failed to connect to the database after multiple retries.');
	

	try {
		client = await MongoClient.connect(uri, { maxPoolSize: 20 });
		connection = client.db('Seed');
		return client;
	} catch (_err) {
		logger.warn(`Connection failed! Retrying... ${attempt}`);
		await setTimeout(3000);
		return establishConnection(attempt + 1);
	}
}

export function getConnection(): Db {
	if (!connection)
		throw new Error('Database connection has not been established yet.');

	return connection;
}

/** Closes the MongoDB connection pool. Used during graceful shutdown. */
export async function closeConnection(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		connection = null;
	}
}