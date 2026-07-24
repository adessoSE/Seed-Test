import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as fileService from '../services/file.service';

/**
 * Handles the upload of a single file to a repository.
 * Expects 'repoId' in params and the file in 'req.file'.
 */
export async function fileUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		if (!req.file) {
			res.status(400).json({ error: 'No file uploaded.' });
			return;
		}
		const { repoId } = req.params;
		if (!ObjectId.isValid(repoId)) {
			res.status(400).json({ error: 'Invalid repository ID format' });
			return;
		}

		// The file service handles GridFS upload
		const fileMetadata = await fileService.fileUpload(
			req.file.originalname, 
			repoId, 
			req.file.buffer
		);
        
		res.status(200).json(fileMetadata);
	} catch (error) {
		next(error);
	}
}

/**
 * Retrieves a list of all files associated with a repository.
 * Expects 'repoId' in params.
 */
export async function getFileList(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repoId } = req.params;
		if (!ObjectId.isValid(repoId)) {
			res.status(400).json({ error: 'Invalid repository ID format' });
			return;
		}

		const files = await fileService.getFileList(repoId);
		res.status(200).json(files);
	} catch (error) {
		next(error);
	}
}

/**
 * Deletes a specific file by its ID.
 * Expects 'fileId' in params.
 */
export async function deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repoId, fileId } = req.params;
		if (!ObjectId.isValid(fileId) || !ObjectId.isValid(repoId)) {
			res.status(400).json({ error: 'Invalid file or repository ID format' });
			return;
		}

		await fileService.deleteFile(fileId, repoId);
		res.status(200).json({ message: 'File deleted successfully' });
	} catch (error) {
		next(error);
	}
}