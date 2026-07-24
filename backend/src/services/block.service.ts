import { ClientSession, MongoClient } from 'mongodb';
import * as dbConnection from '../database/DbConnector';
import { Block } from '@shared/models/Block';
import { BlockDoc, oid } from '../types/mongo.types';

const customBlocksCollection = 'CustomBlocks';

/**
 * Saves a new block to the database.
 * @param block The block object to save.
 * @param session Optional ClientSession for transaction support.
 * @returns The result of the insertion operation.
 */
export async function saveBlock(block: Block, session?: ClientSession, client?: MongoClient): Promise<any> {
	const db = session
		? client!.db('Seed', session)
		: dbConnection.getConnection();
	const sanitizedBlock = mongoSanitize(block);
	// Convert string IDs to ObjectId for MongoDB storage
	const doc: BlockDoc = {
		...sanitizedBlock,
		repositoryId: sanitizedBlock.repositoryId ? oid(sanitizedBlock.repositoryId) : undefined,
		owner: sanitizedBlock.owner ? oid(sanitizedBlock.owner) : undefined
	};
	return await db.collection<BlockDoc>(customBlocksCollection).insertOne(doc as BlockDoc, { session });
}

/**
 * Fetches a single block by its ObjectId.
 * @param blockId The ID of the block to fetch.
 * @returns A Promise that resolves to the block object or null if not found.
 */
export async function getBlock(blockId: string): Promise<Block | null> {
	const db = dbConnection.getConnection();
	return await db.collection<BlockDoc>(customBlocksCollection).findOne({ _id: oid(blockId) }) as unknown as Block | null;
}

/**
 * Fetches all blocks associated with a specific repository.
 * @param repoId The ID of the repository.
 * @returns A Promise that resolves to an array of block objects.
 */
export async function getBlocks(repoId: string): Promise<Block[]> {
	const db = dbConnection.getConnection();
	return await db.collection<BlockDoc>(customBlocksCollection).find({ repositoryId: oid(repoId) }).toArray() as unknown as Block[];
}

/**
 * Replaces an existing block document with an updated version.
 * @param blockId The ID of the block to update.
 * @param updatedBlock The full block object to replace the existing one.
 * @param session Optional ClientSession for transaction support.
 * @returns The result of the replacement operation.
 */
export async function updateBlock(blockId: string, updatedBlock: Block, userId: string, session?: ClientSession, client?: MongoClient): Promise<any> {
	const db = session
		? client!.db('Seed', session)
		: dbConnection.getConnection();
	// Convert string IDs to ObjectId for MongoDB storage
	const doc: BlockDoc = {
		...updatedBlock,
		_id: oid(blockId),
		repositoryId: updatedBlock.repositoryId ? oid(updatedBlock.repositoryId) : undefined,
		owner: oid(userId)
	};

	return await db.collection<BlockDoc>(customBlocksCollection).findOneAndReplace(
		{ _id: oid(blockId), owner: oid(userId) },
		doc,
		{ session }
	);
}

/**
 * Deletes a block from the database.
 * @param blockId The ID of the block to delete.
 * @param userId The ID of the user performing the deletion (for ownership verification).
 * @returns The result of the deletion operation.
 */
export async function deleteBlock(blockId: string, userId: string): Promise<any> {
	const db = dbConnection.getConnection();
	return await db.collection<BlockDoc>(customBlocksCollection).deleteOne({
		_id: oid(blockId),
		owner: oid(userId)
	});
}


// Simple sanitizer function to prevent NoSQL injection
function mongoSanitize(v: any): any {
	if (v instanceof Object) 
		for (const key in v) 
			if (/^\$/.test(key)) 
				delete v[key];
			else 
				mongoSanitize(v[key]);
		
	
	return v;
}
