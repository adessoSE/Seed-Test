import { Collection, ObjectId, Filter, ClientSession, MongoClient } from 'mongodb';
import * as dbConnection from '../database/DbConnector';
import { Block } from '@shared/models/Block';

const customBlocksCollection = 'CustomBlocks';

/**
 * Saves a new block to the database.
 * @param block The block object to save.
 * @param session Optional ClientSession for transaction support.
 * @returns The result of the insertion operation.
 */
export async function saveBlock(block: Block, session?: ClientSession, client?: MongoClient): Promise<any> {
    const db = session
                ? client.db('Seed', session)
                : dbConnection.getConnection();
    const sanitizedBlock = mongoSanitize(block);
    if (sanitizedBlock.repositoryId) {
        sanitizedBlock.repositoryId = new ObjectId(sanitizedBlock.repositoryId);
    }
    if (sanitizedBlock.owner) {
        sanitizedBlock.owner = new ObjectId(sanitizedBlock.owner);
    }
    return await db.collection<Block>(customBlocksCollection).insertOne(sanitizedBlock as Block, { session });
}

/**
 * Fetches a single block by its ObjectId.
 * @param blockId The ID of the block to fetch.
 * @returns A Promise that resolves to the block object or null if not found.
 */
export async function getBlock(blockId: string): Promise<Block | null> {
    const db = dbConnection.getConnection();
    return await db.collection<Block>(customBlocksCollection).findOne({ _id: new ObjectId(blockId) });
}

/**
 * Fetches all blocks associated with a specific repository.
 * @param repoId The ID of the repository.
 * @returns A Promise that resolves to an array of block objects.
 */
export async function getBlocks(repoId: string): Promise<Block[]> {
    const db = dbConnection.getConnection();
    return await db.collection<Block>(customBlocksCollection).find({ repositoryId: new ObjectId(repoId) }).toArray();
}

/**
 * Replaces an existing block document with an updated version.
 * @param blockId The ID of the block to update.
 * @param updatedBlock The full block object to replace the existing one.
 * @param session Optional ClientSession for transaction support.
 * @returns The result of the replacement operation.
 */
export async function updateBlock(blockId: string, updatedBlock: Block, session?: ClientSession, client?: MongoClient): Promise<any> {
    const db = session
                ? client.db('Seed', session)
                : dbConnection.getConnection();
    updatedBlock._id = new ObjectId(blockId);
    if (updatedBlock.repositoryId) {
        updatedBlock.repositoryId = new ObjectId(updatedBlock.repositoryId);
    }
    if (updatedBlock.owner) {
        updatedBlock.owner = new ObjectId(updatedBlock.owner);
    }
    
    return await db.collection<Block>(customBlocksCollection).findOneAndReplace({ _id: new ObjectId(blockId) }, updatedBlock, { session });
}

/**
 * Deletes a block from the database.
 * @param blockId The ID of the block to delete.
 * @param userId The ID of the user performing the deletion (for ownership verification).
 * @returns The result of the deletion operation.
 */
export async function deleteBlock(blockId: string, userId: string): Promise<any> {
    const db = dbConnection.getConnection();
    return await db.collection<Block>(customBlocksCollection).deleteOne({
        _id: new ObjectId(blockId),
        owner: new ObjectId(userId)
    });
}


// Simple sanitizer function to prevent NoSQL injection
function mongoSanitize(v: any): any {
	if (v instanceof Object) {
		for (const key in v) {
			if (/^\$/.test(key)) {
				delete v[key];
			} else {
				mongoSanitize(v[key]);
			}
		}
	}
	return v;
}