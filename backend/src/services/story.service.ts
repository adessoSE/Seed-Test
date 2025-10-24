import { Collection, ObjectId, Filter, ClientSession, MongoClient } from 'mongodb';
import * as dbConnection from '../database/DbConnector';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import { Background } from '@shared/models/Background';
import { emptyStory } from '../models/emptyStory';
import { emptyScenario } from '../models/emptyScenario';
import { emptyBackground } from '../models/emptyBackground';
import { deleteReport } from './report.service';

const storiesCollection = 'Stories';
const repositoriesCollection = 'Repositories';

// --- Story Functions ---

/**
 * Fetches a single story from the database by its MongoDB ObjectId or its numeric story_id.
 * @param storyId - The MongoDB ObjectId (as a string) or the numeric story_id.
 * @returns A Promise that resolves to the story object or null if not found.
 */
export async function getOneStory(storyId: string | number): Promise<Story | null> {
    const db = dbConnection.getConnection();
    const collection = db.collection<Story>(storiesCollection);
    let query: Filter<Story>;

    if (typeof storyId === 'number') {
        query = { story_id: storyId };
    } else {
        query = { _id: new ObjectId(storyId.toString()) };
    }
    return await collection.findOne(query);
}

/**
 * Fetches all stories associated with a specific repository.
 * @param repoId - The ObjectId of the repository.
 * @returns A Promise that resolves to an array of story objects.
 */
export async function getAllStoriesOfRepo(repoId: string): Promise<Story[]> {
    const db = dbConnection.getConnection();
    const repo = await db.collection(repositoriesCollection).findOne({ _id: new ObjectId(repoId) });
    if (!repo || !repo.stories) {
        return [];
    }
    const storyIds = repo.stories.map((id: string | ObjectId) => new ObjectId(id));
    return await db.collection<Story>(storiesCollection).find({ _id: { $in: storyIds } }).toArray();
}

/**
 * Creates a new story in the database and calculates the next available issue_number within a repository.
 * @param storyTitle - The title of the new story.
 * @param storyDescription - The description of the new story.
 * @param repoId - The repository's ObjectId to associate the story with.
 * @param client - Optional MongoClient for transaction support.
 * @param session - Optional ClientSession for transaction support.
 * @returns A Promise that resolves to the new story's inserted ObjectId.
 */
export async function createStory(storyTitle: string, storyDescription: string, repoId: string, client?: MongoClient, session?: ClientSession): Promise<ObjectId> {
    const db = client ? client.db('Seed') : dbConnection.getConnection();
    const repo = await db.collection(repositoriesCollection).findOne({ _id: new ObjectId(repoId) }, { session });

    let finalIssueNumber: number | undefined = 1;
    if (repo && repo.stories && repo.stories.length > 0) {
        // Fetch all issue numbers from stories in the current repository to find the next free number.
        const stories = await db.collection<Story>(storiesCollection).find({ _id: { $in: repo.stories.map((id: any) => new ObjectId(id)) } }, { projection: { issue_number: 1 }, session }).toArray();
        const iNumberArray = stories.map(s => s.issue_number as number).filter(n => n !== undefined && n !== null);

        let i = 1;
        while (iNumberArray.includes(i)) {
            i++;
        }
        finalIssueNumber = i;
    }

    const storyObject = emptyStory(storyTitle, storyDescription);
    storyObject.issue_number = finalIssueNumber;

    // The 'as Story' cast is necessary because emptyStory returns an object without an _id.
    const result = await db.collection<Story>(storiesCollection).insertOne(storyObject as Story, { session });
    return result.insertedId;
}

/**
 * Replaces an existing story document in the database with an updated version.
 * @param updatedStory - The full story object to replace the existing one.
 * @param client - Optional MongoClient for transaction support.
 * @param session - Optional ClientSession for transaction support.
 * @returns A Promise that resolves to the result of the replacement operation.
 */
export async function updateStory(updatedStory: Story, client?: MongoClient, session?: ClientSession): Promise<any> {
    const db = client ? client.db('Seed') : dbConnection.getConnection();
    updatedStory._id = new ObjectId(updatedStory._id);
    return await db.collection<Story>(storiesCollection).findOneAndReplace(
        { _id: updatedStory._id },
        updatedStory,
        { returnDocument: 'after', session }
    );
}

/**
 * Deletes a story and all its references within a repository (stories array, groups) and associated reports.
 * @param repoId - The ObjectId of the repository containing the story.
 * @param storyId - The ObjectId of the story to delete.
 * @returns A Promise that resolves to the result of the deletion operation.
 */
export async function deleteStory(repoId: string, storyId: string): Promise<any> {
    const db = dbConnection.getConnection();
    const repoCollection = db.collection(repositoriesCollection);
    const storyCollection = db.collection<Story>(storiesCollection);

    // Remove the story's ObjectId from any groups it might be a member of.
    // The 'as any' cast is used to bypass strict type checking for the complex $pull operator.
    await repoCollection.updateMany(
        { _id: new ObjectId(repoId) },
        { $pull: { "groups.$[].member_stories": new ObjectId(storyId) } as any }
    );

    // Remove the story's ObjectId from the main stories array of the repository.
    await repoCollection.updateOne(
        { _id: new ObjectId(repoId) },
        { $pull: { stories: new ObjectId(storyId) } as any }
    );

    // Find and delete all associated test reports for this story.
    const reports = await db.collection('ReportData').find({ storyId: new ObjectId(storyId) }).toArray();

    const reportDeletionPromises = reports.map(report => 
        deleteReport(report._id.toHexString())
    );

    await Promise.all(reportDeletionPromises);

    // Finally, delete the story document itself.
    return await storyCollection.findOneAndDelete({ _id: new ObjectId(storyId) });
}


// --- Scenario Functions ---

/**
 * Retrieves a single scenario from a story by its scenario_id.
 * @param storyId - The ObjectId of the parent story.
 * @param scenarioId - The numeric ID of the scenario.
 * @returns A Promise that resolves to the scenario object or undefined if not found.
 */
export async function getOneScenario(storyId: string, scenarioId: number): Promise<Scenario | undefined> {
    const story = await getOneStory(storyId);
    return story?.scenarios.find((s) => s.scenario_id === scenarioId);
}

/**
 * Creates a new, empty scenario and adds it to an existing story.
 * @param storyId - The ObjectId of the story to add the scenario to.
 * @param scenarioTitle - The name for the new scenario.
 * @returns A Promise that resolves to the newly created scenario object.
 */
export async function createScenario(storyId: string, scenarioTitle: string): Promise<Scenario> {
    const db = dbConnection.getConnection();
    const collection = db.collection<Story>(storiesCollection);
    const story = await collection.findOne({ _id: new ObjectId(storyId) });

    if (!story) {
        throw new Error('Story not found');
    }

    const newScenario = emptyScenario();
    newScenario.name = scenarioTitle;
    
    // Calculate the next available scenario_id.
    if (story.scenarios.length > 0) {
        const maxId = Math.max(...story.scenarios.map(s => s.scenario_id));
        newScenario.scenario_id = maxId + 1;
    }

    await collection.updateOne(
        { _id: new ObjectId(storyId) },
        { $push: { scenarios: newScenario as any } }
    );
    return newScenario;
}

/**
 * Updates an existing scenario within a story.
 * @param storyId - The ObjectId of the parent story.
 * @param updatedScenario - The full scenario object to update.
 * @returns A Promise resolving to the result of the update operation.
 */
export async function updateScenario(storyId: string, updatedScenario: Scenario): Promise<any> {
    const db = dbConnection.getConnection();
    return await db.collection<Story>(storiesCollection).updateOne(
        { _id: new ObjectId(storyId), "scenarios.scenario_id": updatedScenario.scenario_id },
        { $set: { "scenarios.$": updatedScenario } }
    );
}

/**
 * Deletes a scenario from a story's scenario array.
 * @param storyId - The ObjectId of the parent story.
 * @param scenarioId - The numeric ID of the scenario to delete.
 * @returns A Promise resolving to the result of the update operation.
 */
export async function deleteScenario(storyId: string, scenarioId: number): Promise<any> {
    const db = dbConnection.getConnection();
    return await db.collection<Story>(storiesCollection).updateOne(
        { _id: new ObjectId(storyId) },
        { $pull: { scenarios: { scenario_id: scenarioId } } as any }
    );
}

export async function updateScenarioList(storyId: string, scenarioList: Scenario[]): Promise<any> {
    const db = dbConnection.getConnection();
    return await db.collection<Story>(storiesCollection).updateOne(
        { _id: new ObjectId(storyId) },
        { $set: { scenarios: scenarioList } }
    );
}

// --- Background Functions ---

export async function updateBackground(storyId: string, updatedBackground: Background): Promise<any> {
    const db = dbConnection.getConnection();
    return await db.collection<Story>(storiesCollection).updateOne(
        { _id: new ObjectId(storyId) },
        { $set: { background: updatedBackground } }
    );
}

export async function deleteBackground(storyId: string): Promise<any> {
    return await updateBackground(storyId, emptyBackground());
}

// --- Status Update Functions ---

export async function updateStoryStatus(storyId: string, storyLastTestStatus: boolean): Promise<any> {
    const db = dbConnection.getConnection();
    return await db.collection<Story>(storiesCollection).updateOne(
        { _id: new ObjectId(storyId) },
        { $set: { lastTestPassed: storyLastTestStatus } }
    );
}

export async function updateScenarioStatus(storyId: string, scenarioId: number, scenarioLastTestStatus: boolean): Promise<any> {
    const db = dbConnection.getConnection();
    return await db.collection<Story>(storiesCollection).updateOne(
        { _id: new ObjectId(storyId), "scenarios.scenario_id": scenarioId },
        { $set: { "scenarios.$.lastTestPassed": scenarioLastTestStatus } }
    );
}

export async function updateOneDriver(storyId: string, driver: any): Promise<any> {
    const db = dbConnection.getConnection();
    const oneDriver = !driver.oneDriver;
    return await db.collection<Story>(storiesCollection).updateOne(
        { _id: new ObjectId(storyId) },
        { $set: { oneDriver: oneDriver } }
    );
}

// --- Issue Tracker specific Functions ---

export async function getStoriesByIssueKeys(issueKeys: string[]): Promise<string[]> {
    const db = dbConnection.getConnection();
    const stories = await db.collection<Story>(storiesCollection).find({
        issue_number: { $in: issueKeys }
    })
    .project({ _id: 1 })
    .toArray();
    return stories.map((story) => story._id!.toString());
}

export async function getOneStoryByIssueKey(issueKey: string): Promise<Story | null> {
    const db = dbConnection.getConnection();
    return await db.collection<Story>(storiesCollection).findOne({ issue_number: issueKey });
}