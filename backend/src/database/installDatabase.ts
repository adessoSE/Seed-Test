import { MongoClient, Db } from 'mongodb';
import { exit } from 'process';
import * as dbConnector from './DbConnector.js';
import { stepDefs } from './stepTypes.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates a collection if it doesn't exist.
 * @param dbo The database instance.
 * @param name The name of the collection to create.
 */
async function makeCollection(dbo: Db, name: string): Promise<void> {
	try {
		const collections = await dbo.listCollections({ name }).toArray();
		const exists = collections.length > 0;

		if (exists) {
			console.log(`Collection: ${name} already exists and will be skipped.\n`);
			return;
		}

		const collection = dbo.collection(name);
		await dbo.createCollection(name);
		console.log(`Collection ${name} created!`);

		// Insert initial data for stepTypes
		if (name === 'stepTypes') {
			console.log('Inserting stepType documents:');
			// Assuming stepDefs returns the correct type array
			const stepTypesData = stepDefs(); 
			if (stepTypesData && stepTypesData.length > 0) {
				const insertionResult = await collection.insertMany(stepTypesData as any[], { ordered: false });
				console.log(`Number of documents inserted: ${insertionResult.insertedCount}`);
			} else 
				console.warn('No step types data found to insert.');
            
		}
		console.log(''); // New line
	} catch (error: any) {
		console.error(`\x1b[31m Error creating collection: ${name}\n\x1b[0m`, error.message);
		// Decide if script should exit on error
		// throw error; 
	}
}

/**
 * Main function to set up the initial database structure.
 */
async function installDatabase(): Promise<void> {
	let client: MongoClient | null = null;
	console.log('\x1b[33m Setting Up DB...\n\x1b[0m');
	try {
		// Establish connection using the connector
		client = await dbConnector.establishConnection();
		const dbo = dbConnector.getConnection(); // Get the Db instance

		console.log('Starting: stepTypes');
		await makeCollection(dbo, 'stepTypes');
		console.log('Starting: Stories');
		await makeCollection(dbo, 'Stories');
		console.log('Starting: User');
		await makeCollection(dbo, 'User');
		console.log('Starting: Repositories');
		await makeCollection(dbo, 'Repositories');
		console.log('Starting: PwResetRequests');
		await makeCollection(dbo, 'PwResetRequests');
		console.log('Starting: CustomBlocks');
		await makeCollection(dbo, 'CustomBlocks');
		console.log('Starting: Workgroups');
		await makeCollection(dbo, 'Workgroups');
		console.log('Starting: ReportData');
		await makeCollection(dbo, 'ReportData');
		console.log('Starting: Reports');
		await makeCollection(dbo, 'Reports');
		console.log('Starting: GridFS buckets (implicitly created on first use)');
		// GridFS collections (fs.files, fs.chunks) are created automatically by MongoDB driver

		console.log('\x1b[32m Database collections ensured! \x1b[0m');
	} catch (err: any) {
		console.error('\x1b[31m Database setup failed:\x1b[0m', err.message);
		exit(1); // Exit with error code
	} finally {
		// Close the client connection if it was established
		if (client) {
			await client.close();
			console.log('Database connection closed.');
		}
	}
}

// Execute the installation
installDatabase()
	.then(() => {
		exit(0); // Exit successfully
	})
	.catch(() => {
		// Error is already logged in installDatabase
		exit(1);
	});