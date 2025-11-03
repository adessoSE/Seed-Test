import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as storyService from '../services/story.service';
import * as featureFileService from '../services/feature-file.service';
import { Background } from '@shared/models/Background';

/**
 * Handles updating the background section of a story.
 * Expects story ID in URL parameters and background data in the request body.
 */
export async function updateBackground(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storyId = req.params.storyID;
        if (!ObjectId.isValid(storyId)) {
            res.status(400).json({ error: 'Invalid story ID format' });
            return;
        }
        const backgroundData: Background = req.body;

        await storyService.updateBackground(storyId, backgroundData);
        // Trigger feature file update after successful DB update
        await featureFileService.updateFeatureFile(storyId);

        // Send back the updated background data (or fetch the updated story if needed)
        res.status(200).json(backgroundData);
    } catch (error) {
        next(error); // Pass error to the central handler
    }
}

/**
 * Handles deleting the background section of a story (resets it to empty).
 * Expects story ID in URL parameters.
 */
export async function deleteBackground(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storyId = req.params.storyID;
         if (!ObjectId.isValid(storyId)) {
            res.status(400).json({ error: 'Invalid story ID format' });
            return;
        }

        await storyService.deleteBackground(storyId);
        // Trigger feature file update after successful DB update
        await featureFileService.updateFeatureFile(storyId);

        res.status(200).json({}); // Send back an empty object or success message
    } catch (error) {
        next(error); // Pass error to the central handler
    }
}