import { Request, Response, NextFunction } from 'express';
import { requireValidId } from '../utils/validation.js';
import * as fileService from '../services/file.service.js';
import { AppError } from '../helpers/AppError.js';

/**
 * Handles the upload of a single file to a repository.
 * Expects 'repoId' in params and the file in 'req.file'.
 */
export async function fileUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		if (!req.file)
			throw AppError.badRequest('No file uploaded.');

		const { repoId } = req.params;
		requireValidId(repoId, 'repository ID');

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
		requireValidId(repoId, 'repository ID');

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
		requireValidId(fileId, 'file ID');
		requireValidId(repoId, 'repository ID');

		await fileService.deleteFile(fileId, repoId);
		res.status(200).json({ message: 'File deleted successfully' });
	} catch (error) {
		next(error);
	}
}