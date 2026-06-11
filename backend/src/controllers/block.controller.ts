import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as blockService from '../services/block.service';
import { Block } from '@shared/models/Block';

/**
 * Handles the creation of a new block.
 * Expects block data in the request body.
 * Assumes user is authenticated via global middleware.
 */
export async function saveBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // User object should be available from global auth middleware
        const user = req.user as { _id?: ObjectId | string }; // Adjust type as per your passport setup
        if (!user?._id) {
             res.sendStatus(401); // Should ideally not be reached if global auth is effective
             return;
        }
        const blockData: Block = req.body;
        blockData.owner = new ObjectId(user._id); // Assign owner

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
        if (!ObjectId.isValid(repoId)) {
             res.status(400).json({ error: 'Invalid repository ID format' });
             return;
        }
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
        if (!ObjectId.isValid(blockId)) {
             res.status(400).json({ error: 'Invalid block ID format' });
             return;
        }
        const user = req.user as { _id?: ObjectId | string };
         if (!user?._id) { // Still good practice to check user exists
             res.sendStatus(401);
             return;
        }
        const updatedBlockData: Block = req.body;

        // Service layer might perform further owner checks if needed
        const result = await blockService.updateBlock(blockId, updatedBlockData);
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
         if (!ObjectId.isValid(blockId)) {
             res.status(400).json({ error: 'Invalid block ID format' });
             return;
        }
        const user = req.user as { _id?: ObjectId | string };
         if (!user?._id) {
            res.sendStatus(401);
            return;
        }
        const userId = user._id.toString();

        const result = await blockService.deleteBlock(blockId, userId);
        if (result.deletedCount === 0) {
             res.status(404).json({ error: 'Block not found or user not authorized to delete' });
             return;
        }
        res.status(200).json({ message: 'Block deleted successfully' });
    } catch (error) {
        next(error);
    }
}