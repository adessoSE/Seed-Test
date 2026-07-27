import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as blockService from '../services/block.service.js';
import { Block } from '@shared/models/Block.js';
import { oid } from '../types/mongo.types.js';
import { AppError } from '../helpers/AppError.js';

/**
 * Handles the creation of a new block.
 * Expects block data in the request body.
 * Assumes user is authenticated via global middleware.
 */
export async function saveBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		// User object should be available from global auth middleware
		const user = req.user as { _id?: ObjectId | string }; // Adjust type as per your passport setup
		if (!user?._id)
			throw AppError.unauthorized('User not authenticated');
		const blockData: Block = req.body;
		// Block.owner is typed as string but MongoDB stores ObjectId
		(blockData as any).owner = oid(user._id);

		const result = await blockService.saveBlock(blockData);
		res.status(200).json({ insertedId: result.insertedId });
	} catch (error) {
		next(error);
	}
}

/**
 * Handles retrieving all blocks for a specific repository.
 * Expects repository ID in the URL parameters.
 * Assumes authentication might not be strictly required or handled globally.
 */
export async function getBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = req.params.repoId;
		if (!ObjectId.isValid(repoId))
			throw AppError.badRequest('Invalid repository ID format');
		const result = await blockService.getBlocks(repoId);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/**
 * Handles updating an existing block.
 * Expects block ID in the URL parameters and updated block data in the request body.
 * Assumes user is authenticated via global middleware.
 */
export async function updateBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const blockId = req.params.blockId;
		if (!ObjectId.isValid(blockId))
			throw AppError.badRequest('Invalid block ID format');

		const user = req.user as { _id?: ObjectId | string };
		if (!user?._id) // Still good practice to check user exists
			throw AppError.unauthorized('User not authenticated');
		const updatedBlockData: Block = req.body;
		const userId = user._id.toString();

		const result = await blockService.updateBlock(blockId, updatedBlockData, userId);
		if (!result)
			throw AppError.notFound('Block not found or user not authorized to update');
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/**
 * Handles deleting a block.
 * Expects block ID in the URL parameters.
 * Assumes user is authenticated via global middleware for ownership check.
 */
export async function deleteBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const blockId = req.params.blockId;
		if (!ObjectId.isValid(blockId))
			throw AppError.badRequest('Invalid block ID format');

		const user = req.user as { _id?: ObjectId | string };
		if (!user?._id)
			throw AppError.unauthorized('User not authenticated');
		const userId = user._id.toString();

		const result = await blockService.deleteBlock(blockId, userId);
		if (result.deletedCount === 0)
			throw AppError.notFound('Block not found or user not authorized to delete');
		res.status(200).json({ message: 'Block deleted successfully' });
	} catch (error) {
		next(error);
	}
}