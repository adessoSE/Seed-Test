
// ///////////////////////////////////////////    Whole File deprecated?! Potentially delete  ////////////////////////////////////////////




import { MongoClient, Db, ObjectId } from 'mongodb';
import fs from 'fs';
import pfs from 'fs/promises';
import path from 'path';
import * as dbConnector from './DbConnector';
import { Story } from '@shared/models/Story';
import dotenv from 'dotenv';

dotenv.config();

const dbName = 'Seed';
const storiesCollection = 'Stories';
const testReportCollection = 'TestReport'; // TODO: Original name? Use 'ReportData' from new structure?

// ///////////////////////////////////////////    ADMIN  METHODS  ////////////////////////////////////////////

// NOTE: Direct manipulation of steps across stories is generally discouraged.
// This logic should ideally be handled within the application when a step definition changes.
// Mark as potentially DEPRECATED.
/**
 * @deprecated Prefer application-level updates over direct DB manipulation.
 * Updates "pre" Stepdefinitions in the "Stories" Collection and sets affected steps to outdated: true.
 */
// Please keep in mind that when you change the stepDefs in the Database with this function, you also have to apply that change manualy in the stepdefs.js in features/step_definitions
// if "story_id" Parameter is null: Updates "pre" Stepdefinitions in the "Stories" Collection and sets each step to outdated: true
// else: Updates "pre" Stepdefinitions in the selected Story and sets each step to outdated: true
async function updatePreStepsInStories(oldText: string, newText: string, story_id?: number): Promise<void> {
	let client: MongoClient | null = null;
    let filter: any = {};
    if (story_id != null) {
         filter = { story_id }; // Filter by external story_id if provided
    }

	try {
        client = await dbConnector.establishConnection();
		const collection = dbConnector.getConnection().collection<Story>(storiesCollection);
		
        // Mark steps as outdated (consider if this flag is still used/needed)
		await collection.updateMany(filter, { $set: { 'background.stepDefinitions.when.$[elem].outdated': true } } as any, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(filter, { $set: { 'scenarios.$[].stepDefinitions.given.$[elem].outdated': true } } as any, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(filter, { $set: { 'scenarios.$[].stepDefinitions.when.$[elem].outdated': true } } as any, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(filter, { $set: { 'scenarios.$[].stepDefinitions.then.$[elem].outdated': true } } as any, { arrayFilters: [{ 'elem.pre': oldText }] });
		
        // Update the 'pre' text
        await collection.updateMany(filter, { $set: { 'background.stepDefinitions.when.$[elem].pre': newText } } as any, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(filter, { $set: { 'scenarios.$[].stepDefinitions.given.$[elem].pre': newText } } as any, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(filter, { $set: { 'scenarios.$[].stepDefinitions.when.$[elem].pre': newText } } as any, { arrayFilters: [{ 'elem.pre': oldText }] });
		await collection.updateMany(filter, { $set: { 'scenarios.$[].stepDefinitions.then.$[elem].pre': newText } } as any, { arrayFilters: [{ 'elem.pre': oldText }] });

        console.log(`Updated 'pre' steps from "${oldText}" to "${newText}"`);
	} catch (e) {
		console.error(`ERROR updating pre steps: ${e}`);
	} finally {
        if (client) await client.close();
    }
}
// NOTE: See comment for updatePreStepsInStories
/**
 * @deprecated Prefer application-level updates over direct DB manipulation.
 * Updates "mid" Stepdefinitions in the "Stories" Collection and sets affected steps to outdated: true.
 */
// Please keep in mind that when you change the stepDefs in the Database with this function, you also have to apply that change manualy in the stepdefs.js in features/step_definitions
// if "story_id" Parameter is null: Updates "mid" Stepdefinitions in the "Stories" Collection and sets each step to outdated: true
// else: Updates "mid" Stepdefinitions in the selected Story and sets each step to outdated: true
async function updateMidStepsInStories(oldText: string, newText: string, story_id?: number): Promise<void> {
    // Similar logic to updatePreStepsInStories, just targeting 'mid'
    // ... (Implementation would be analogous, marked as deprecated)
    console.warn("updateMidStepsInStories is deprecated.");
}

// NOTE: Using dedicated DB backup tools like mongodump is generally recommended over scripting.
/**
 * Creates a JSON backup file of the Stories collection.
 * @param filePath The path to save the backup file. Defaults to './dbbackups/dbbackup_stories.json'.
 * @deprecated We already backup to JIRA
 */
async function writeStoriesBackup(filePath: string = './dbbackups/dbbackup_stories.json'): Promise<void> {
    let client: MongoClient | null = null;
    try {
        client = await dbConnector.establishConnection();
		const collection = dbConnector.getConnection().collection<Story>(storiesCollection);
        const stories = await collection.find({}).toArray();
        
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        await pfs.writeFile(filePath, JSON.stringify(stories, null, 2)); // Pretty print JSON
        console.log(`Backup of Stories collection written to ${filePath}`);
	} catch (e) {
		console.error(`ERROR writing backup: ${e}`);
	} finally {
        if (client) await client.close();
    }
}

/**
 * Lists all collections in the database.
 */
async function getCollections(): Promise<string[]> {
    let client: MongoClient | null = null;
    try {
        client = await dbConnector.establishConnection();
		const dbo = dbConnector.getConnection();
		const collections = await dbo.listCollections().toArray();
        return collections.map(c => c.name);
	} catch (e) {
        console.error(`ERROR getting collections: ${e}`);
        return [];
    } finally {
        if (client) await client.close();
    }
}

/**
 * Creates a new collection.
 * @param name Name of the collection to create.
 */
async function makeCollectionAdmin(name: string): Promise<void> {
    let client: MongoClient | null = null;
	try {
        client = await dbConnector.establishConnection();
		const dbo = dbConnector.getConnection();
        await dbo.createCollection(name);
        console.log(`Collection ${name} created!`);
	} catch (e: any) {
        if (e.codeName === 'NamespaceExists') {
             console.warn(`Collection ${name} already exists.`);
        } else {
		    console.error(`ERROR creating collection ${name}: ${e}`);
        }
	} finally {
        if (client) await client.close();
    }
}

// NOTE: Deprecated. Use services for data insertion.
/** @deprecated Use corresponding service methods instead. */
function insertOneAdmin(collectionName: string, content: any): void {
	console.warn("insertOneAdmin is deprecated. Use services.");
    // Implementation omitted
}

// NOTE: Deprecated. Use services for data insertion.
/** @deprecated Use corresponding service methods instead. */
function insertMoreAdmin(collectionName: string, content: any[]): void {
    console.warn("insertMoreAdmin is deprecated. Use services.");
	// Implementation omitted
}

// NOTE: Deprecated. Use services for data updates.
/** @deprecated Use corresponding service methods instead. */
function updateAdmin(story_id: number, updatedStuff: any): void {
    console.warn("updateAdmin is deprecated. Use services.");
    // Implementation omitted
}

// NOTE: Potentially dangerous. Use with caution. More or less deprecated, just use MondoDB Compass!
/**
 * Deletes ALL stories from the Stories collection. Use with extreme caution.
 */
async function eraseAllStoriesAdmin(): Promise<void> {
	let client: MongoClient | null = null;
    console.warn("WARNING: This will delete ALL stories. Proceed with caution.");
    // Add a confirmation step or delay here in a real script
	try {
		client = await dbConnector.establishConnection();
		const dbo = dbConnector.getConnection();
		const result = await dbo.collection(storiesCollection).deleteMany({});
        console.log(`Deleted ${result.deletedCount} stories.`);
	} catch (e) {
		console.error(`ERROR erasing all stories: ${e}`);
	} finally {
        if (client) await client.close();
    }
}

// NOTE: Deprecated. Use storyService.getOneStory.
/** @deprecated Use storyService.getOneStory instead. */
function showStoryAdmin(story_id: number): void {
    console.warn("showStoryAdmin is deprecated. Use storyService.getOneStory.");
    // Implementation omitted
}

// NOTE: Potentially dangerous. Use with caution. More or less deprecated, just use MondoDB Compass!
/**
 * Drops (deletes) a specified collection. Use with extreme caution.
 * @param collectionName The name of the collection to drop.
 */
async function dropCollectionAdmin(collectionName: string): Promise<void> {
    let client: MongoClient | null = null;
    console.warn(`WARNING: This will permanently delete the collection '${collectionName}'.`);
    // Add a confirmation step or delay here in a real script
	try {
        client = await dbConnector.establishConnection();
		const dbo = dbConnector.getConnection();
        const success = await dbo.collection(collectionName).drop();
        if (success) console.log(`Collection ${collectionName} deleted.`);
        else console.warn(`Collection ${collectionName} might not have existed.`);
	} catch (e: any) {
        if (e.codeName === 'NamespaceNotFound') {
             console.warn(`Collection ${collectionName} not found, nothing to delete.`);
        } else {
		    console.error(`ERROR dropping collection ${collectionName}: ${e}`);
        }
	} finally {
        if (client) await client.close();
    }
}

// NOTE: These seem like one-time migration scripts. Keep if needed, otherwise remove. We have such an service built into application, see report.service.ts
/**
 * Deletes reports older than a specific timestamp (hardcoded).
 * Consider using TTL indexes or a more flexible script.
 */
async function deleteOldReportsAdmin(): Promise<void> {
    let client: MongoClient | null = null;
    const cutoffTimestamp = 1622505600000; // June 1st, 2021
	try {
        client = await dbConnector.establishConnection();
		const dbo = dbConnector.getConnection();
        // Assuming 'TestReport' is the old collection name, use 'ReportData' from new structure
		const result = await dbo.collection(testReportCollection).deleteMany({ reportTime: { $lt: cutoffTimestamp } });
		console.log(`Deleted ${result.deletedCount} old reports (before ${new Date(cutoffTimestamp).toISOString()}).`);
	} catch (e) {
        console.error(`ERROR deleting old reports: ${e}`);
    } finally {
        if (client) await client.close();
    }
}

// NOTE: These seem like one-time migration scripts. Keep if needed, otherwise remove.
/**
 * Renames fields in old report documents (hardcoded).
 * This should only be run once during migration.
 */
async function fixOldReportsAdmin(): Promise<void> {
    let client: MongoClient | null = null;
	try {
        client = await dbConnector.establishConnection();
		const dbo = dbConnector.getConnection();
        // Assuming 'TestReport' is the old collection name
		const result = await dbo.collection(testReportCollection).updateMany( // Use old name here
            { "testStatus": { $exists: true } }, // Only update documents with the old field
            { 
                $rename: { 
                    testStatus: 'overallTestStatus', 
                    jsonReport: 'json' // Check if 'json' is correct target name
                } 
            });
		console.log(`Updated field names in ${result.modifiedCount} old reports.`);
	} catch (e) {
        console.error(`ERROR fixing old reports: ${e}`);
    } finally {
        if (client) await client.close();
    }
}

// Export functions if you intend to run them individually via node or ts-node
export {
    /* updatePreStepsInStories,
    updateMidStepsInStories,
    writeStoriesBackup,
    getCollections,
    makeCollectionAdmin,
    eraseAllStoriesAdmin,
    dropCollectionAdmin,
    deleteOldReportsAdmin,
    fixOldReportsAdmin */
    // insertOneAdmin, insertMoreAdmin, updateAdmin, showStoryAdmin are deprecated
};