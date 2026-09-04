import { type ObjectId, type Filter, type ClientSession, type MongoClient, type WithId, type UpdateResult, type UpdateFilter, type AnyBulkWriteOperation, type Document } from 'mongodb';
import { logger } from '../logging.js';
import * as dbConnection from '../database/DbConnector.js';
import { type Story } from '@seed-test/shared/models/Story.js';
import { type StoryDoc, type RepositoryDoc, oid } from '../types/mongo.types.js';
import { type Scenario } from '@seed-test/shared/models/Scenario.js';
import { type Background } from '@seed-test/shared/models/Background.js';
import { emptyStory } from '../models/emptyStory.js';
import { emptyScenario } from '../models/emptyScenario.js';
import { emptyBackground } from '../models/emptyBackground.js';
import { deleteReport } from './report.service.js';
import { AppError } from '../helpers/AppError.js';

const storiesCollection = 'Stories';
const repositoriesCollection = 'Repositories';

/**
 * Normalises a story's background for output. TypeScript declares background as required on
 * Story, but legacy (or hand-edited) DB documents can genuinely lack the field, so a runtime
 * fallback is still load-bearing. The param is typed background-optional so the guard's
 * null-check stays meaningful to the compiler while legacy data is preserved.
 * @param story - A story whose background may be absent at runtime.
 * @returns The story's background, or a fresh empty background when the document lacks one.
 */
export function backgroundOrEmpty(story: { background?: Background }): Background {
	return story.background ?? emptyBackground();
}

// --- Story Functions ---

/**
 * Fetches a single story from the database by its MongoDB ObjectId or its numeric story_id.
 * @param storyId - The MongoDB ObjectId (as a string) or the numeric story_id.
 * @returns A Promise that resolves to the story object or null if not found.
 */
export async function getOneStory(storyId: string | number | ObjectId): Promise<Story | null> {
	const db = dbConnection.getConnection();
	const collection = db.collection<StoryDoc>(storiesCollection);
	let query: Filter<StoryDoc>;

	if (typeof storyId === 'number') 
		query = { story_id: storyId };
	else 
		query = { _id: oid(storyId.toString()) };
    
	const story = await collection.findOne(query) as unknown as Story | null;
	if (!story) return null;
	return {
		...story,
		background: backgroundOrEmpty(story)
	};
}

/**
 * Fetches all stories associated with a specific repository.
 * @param repoId - The ObjectId of the repository.
 * @returns A Promise that resolves to an array of story objects.
 */
export async function getAllStoriesOfRepo(repoId: string): Promise<Story[]> {
	const db = dbConnection.getConnection();
	const repo = await db.collection(repositoriesCollection).findOne({ _id: oid(repoId) }) as RepositoryDoc | null;
	if (!repo?.stories) 
		return [];
    
	const storyIds = repo.stories.map((id: string | ObjectId) => oid(id));
	const stories = await db.collection<StoryDoc>(storiesCollection).find({ _id: { $in: storyIds } }).toArray() as unknown as Story[];
	return stories.map((story: Story) => ({
		...story,
		background: backgroundOrEmpty(story)
	}));
}

/**
 * Re-assigns issue_number = 1..N to the custom (db) stories of a repository so the
 * persisted numbers match a newly saved story order. Linked (jira/github) stories
 * keep their external key and are excluded from numbering, so the running count
 * only advances for db stories.
 * @param repoId - ObjectId (as string) of the repository whose stories were reordered.
 * @param orderedStoryIds - Story ObjectIds (as strings) in the new (persisted) order.
 * @returns A Promise that resolves when the renumber write completes.
 */
export async function renumberCustomStories(repoId: string, orderedStoryIds: string[]): Promise<void> {
	const db = dbConnection.getConnection();
	const collection = db.collection(storiesCollection);

	// Load only the source flag for every story in scope so we can tell custom (db)
	// stories apart from linked (jira/github) ones without pulling full documents.
	const orderedObjectIds = orderedStoryIds.map(id => oid(id));
	const stories = await collection.find(
		{ _id: { $in: orderedObjectIds } },
		{ projection: { storySource: 1 } }
	).toArray();

	// Map storyId -> storySource for O(1) lookup while walking the new order.
	const sourceByStoryId = new Map(stories.map(s => [s._id.toString(), s.storySource]));

	// Custom stories are numbered 1..N by their position among db stories in the new
	// order; the counter skips linked stories entirely (their key must stay untouched).
	let nextNumber = 1;
	const updates: AnyBulkWriteOperation<Document>[] = [];
	for (const storyId of orderedObjectIds) 
		if (sourceByStoryId.get(storyId.toString()) === 'db') {
			updates.push({
				updateOne: {
					filter: { _id: storyId },
					update: { $set: { issue_number: nextNumber } }
				}
			});
			nextNumber++;
		}
	

	// A repository with no custom stories needs no renumber write at all.
	if (updates.length === 0) return;

	// Single batched write keeps the renumber durable in one round-trip.
	await collection.bulkWrite(updates);
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
	const repo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) }, { session });

	let finalIssueNumber: number | undefined = 1;
	if (repo?.stories && repo.stories.length > 0) {
		// Fetch all issue numbers from stories in the current repository to find the next free number.
		const stories = await db.collection<StoryDoc>(storiesCollection).find({ _id: { $in: repo.stories.map((id) => oid(id)) } }, { projection: { issue_number: 1 }, session }).toArray();
		const iNumberArray = stories.map(s => s.issue_number).filter((n): n is number => n !== undefined);

		let i = 1;
		while (iNumberArray.includes(i)) 
			i++;
        
		finalIssueNumber = i;
	}

	const storyObject = emptyStory(storyTitle, storyDescription);
	storyObject.issue_number = finalIssueNumber;

	// StoryDoc cast — emptyStory returns an object without an _id
	const result = await db.collection<StoryDoc>(storiesCollection).insertOne(storyObject, { session });
	return result.insertedId;
}

/**
 * Replaces an existing story document in the database with an updated version.
 * @param updatedStory - The full story object to replace the existing one.
 * @param client - Optional MongoClient for transaction support.
 * @param session - Optional ClientSession for transaction support.
 * @returns A Promise that resolves to the result of the replacement operation.
 */
export async function updateStory(updatedStory: Story, client?: MongoClient, session?: ClientSession): Promise<WithId<StoryDoc> | null> {
	const db = client ? client.db('Seed') : dbConnection.getConnection();
	const doc: StoryDoc = { ...updatedStory, _id: oid(updatedStory._id!) };
	return db.collection<StoryDoc>(storiesCollection).findOneAndReplace(
		{ _id: doc._id },
		doc,
		{ returnDocument: 'after', session }
	);
}

/**
 * Deletes a story and all its references within a repository (stories array, groups) and associated reports.
 * @param repoId - The ObjectId of the repository containing the story.
 * @param storyId - The ObjectId of the story to delete.
 * @returns A Promise that resolves to the result of the deletion operation.
 */
export async function deleteStory(repoId: string, storyId: string): Promise<WithId<StoryDoc> | null> {
	const db = dbConnection.getConnection();
	const repoCollection = db.collection(repositoriesCollection);
	const storyCollection = db.collection<StoryDoc>(storiesCollection);

	// Remove the story's ObjectId from any groups it might be a member of.
	// MongoDB driver types (v7 PullOperator/NotAcceptedFields) reject computed paths on Document
	// collections, so route the update object through unknown before casting to UpdateFilter.
	await repoCollection.updateMany(
		{ _id: oid(repoId) },
		{ $pull: { 'groups.$[].member_stories': oid(storyId) } } as unknown as UpdateFilter<Document>
	);

	// Remove the story's ObjectId from the main stories array of the repository.
	await repoCollection.updateOne(
		{ _id: oid(repoId) },
		{ $pull: { stories: oid(storyId) } } as unknown as UpdateFilter<Document>
	);

	// Find and delete all associated test reports for this story.
	const reports = await db.collection('ReportData').find({ storyId: oid(storyId) }).toArray();

	const reportDeletionPromises = reports.map(report => 
		deleteReport(report._id.toHexString())
	);

	await Promise.all(reportDeletionPromises);

	// Finally, delete the story document itself.
	return storyCollection.findOneAndDelete({ _id: oid(storyId) });
}

/**
 * Updates an existing story identified by its external story_id or creates it if it doesn't exist.
 * This function replicates the logic of the old DbServices.upsertEntry.
 * It primarily uses $set to update fields.
 * @param storyId The external story ID (numeric, from GitHub/Jira).
 * @param updatedContent A partial Story object containing fields to be updated or the full story for insertion.
 * @param session Optional ClientSession for transaction support.
 * @param client Optional MongoClient for transaction support.
 * @returns A promise resolving to the result of the findOneAndUpdate operation (original document by default).
 */
// Callers access .value and .lastErrorObject which the MongoDB v7 driver does not include
// by default — those always yield undefined at runtime, matching the old `any`-era behaviour
interface UpsertStoryResult {
	value?: WithId<StoryDoc> | null;
	lastErrorObject?: { upserted?: ObjectId };
	_id?: ObjectId | string;
}
export async function upsertStoryByExternalId(storyId: number, updatedContent: Partial<Story>, session?: ClientSession, client?: MongoClient): Promise<UpsertStoryResult | null> {
	try {
		const db = session && client ? client.db('Seed', session) : dbConnection.getConnection();
		const collection = db.collection<StoryDoc>(storiesCollection);

		// Define the primary filter based on the external story_id
		const primaryFilter: Filter<StoryDoc> = {
			story_id: storyId
		};

		// Remove _id from updatedContent if present, as it might conflict during upsert
		// and findOneAndUpdate with $set doesn't typically require it for the update part.
		const { _id, ...updateData } = updatedContent;

		// Attempt to find and update the document WITHOUT upsert first
		let result = await collection.findOneAndUpdate(
			primaryFilter,
			{ $set: updateData },
			{ upsert: false, session } // Explicitly no upsert on the first try
		);

		// If the document wasn't found (result is null), try the legacy fallback and then upsert
		if (!result) {
			// Legacy check: Try finding with story_id and undefined storySource
			const legacyFilter: Filter<StoryDoc> = {
				story_id: storyId,
				storySource: undefined
			};

			result = await collection.findOneAndUpdate(
				legacyFilter,
				{ $set: updateData },
				{ upsert: true, session } // UPSERT enabled on the second try
			);
		}
        
		return result;

	} catch (error: unknown) {
		logger.error(`ERROR in upsertStoryByExternalId: ${error instanceof Error ? error.message : String(error)}`);
		throw error;
	}
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
	const collection = db.collection<StoryDoc>(storiesCollection);
	const story = await collection.findOne({ _id: oid(storyId) });

	if (!story)
		throw AppError.notFound('Story not found');
    

	const newScenario = emptyScenario();
	newScenario.name = scenarioTitle;
    
	// Calculate the next available scenario_id.
	if (story.scenarios.length > 0) {
		const maxId = Math.max(...story.scenarios.map(s => s.scenario_id));
		newScenario.scenario_id = maxId + 1;
	}

	await collection.updateOne(
		{ _id: oid(storyId) },
		{ $push: { scenarios: newScenario } } // ESLint: no-unnecessary-type-assertion resolved by typing
	);
	return newScenario;
}

/**
 * Updates an existing scenario within a story.
 * @param storyId - The ObjectId of the parent story.
 * @param updatedScenario - The full scenario object to update.
 * @returns A Promise resolving to the result of the update operation.
 */
export async function updateScenario(storyId: string, updatedScenario: Scenario): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<StoryDoc>(storiesCollection).updateOne(
		{ _id: oid(storyId), 'scenarios.scenario_id': updatedScenario.scenario_id },
		{ $set: { 'scenarios.$': updatedScenario } }
	);
}

/**
 * Deletes a scenario from a story's scenario array.
 * @param storyId - The ObjectId of the parent story.
 * @param scenarioId - The numeric ID of the scenario to delete.
 * @returns A Promise resolving to the result of the update operation.
 */
export async function deleteScenario(storyId: string, scenarioId: number): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<StoryDoc>(storiesCollection).updateOne(
		{ _id: oid(storyId) },
		{ $pull: { scenarios: { scenario_id: scenarioId } } } // ESLint: no-unnecessary-type-assertion resolved by typing
	);
}

export async function updateScenarioList(storyId: string, scenarioList: Scenario[]): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<StoryDoc>(storiesCollection).updateOne(
		{ _id: oid(storyId) },
		{ $set: { scenarios: scenarioList } }
	);
}

// --- Background Functions ---

export async function updateBackground(storyId: string, updatedBackground: Background): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<StoryDoc>(storiesCollection).updateOne(
		{ _id: oid(storyId) },
		{ $set: { background: updatedBackground } }
	);
}

export async function deleteBackground(storyId: string): Promise<UpdateResult> {
	return updateBackground(storyId, emptyBackground());
}

// --- Status Update Functions ---

export async function updateStoryStatus(storyId: string, storyLastTestStatus: boolean): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<StoryDoc>(storiesCollection).updateOne(
		{ _id: oid(storyId) },
		{ $set: { lastTestPassed: storyLastTestStatus } }
	);
}

export async function updateScenarioStatus(storyId: string, scenarioId: number, scenarioLastTestStatus: boolean): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<StoryDoc>(storiesCollection).updateOne(
		{ _id: oid(storyId), 'scenarios.scenario_id': scenarioId },
		{ $set: { 'scenarios.$.lastTestPassed': scenarioLastTestStatus } }
	);
}

export async function updateOneDriver(storyId: string, currentOneDriver: boolean): Promise<Story | null> {
	const db = dbConnection.getConnection();
	const oneDriver = !currentOneDriver;
	await db.collection<StoryDoc>(storiesCollection).updateOne(
		{ _id: oid(storyId) },
		{ $set: { oneDriver: oneDriver } }
	);
	return await db.collection<StoryDoc>(storiesCollection).findOne({ _id: oid(storyId) }) as unknown as Story | null;
}

// --- Issue Tracker specific Functions ---

export async function getStoriesByIssueKeys(issueKeys: string[]): Promise<string[]> {
	const db = dbConnection.getConnection();
	const stories = await db.collection<StoryDoc>(storiesCollection).find({
		issue_number: { $in: issueKeys }
	})
		.project({ _id: 1 })
		.toArray();
	return stories.map((story) => (story as { _id: { toString: () => string } })._id.toString());
}

export async function getOneStoryByIssueKey(issueKey: string): Promise<Story | null> {
	const db = dbConnection.getConnection();
	const story = await db.collection<StoryDoc>(storiesCollection).findOne({ issue_number: issueKey }) as unknown as Story | null;
	if (!story) return null;
	return {
		...story,
		background: backgroundOrEmpty(story)
	};
}