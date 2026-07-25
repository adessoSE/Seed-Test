import { ObjectId, GridFSBucket } from 'mongodb';
import { logger } from '../logging';
import * as dbConnection from '../database/DbConnector';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileElement } from '@shared/models/FileElement';
import { oid } from '../types/mongo.types';

/**
 * Generates a unique filename if a file with the same name already exists in the target repository.
 * Appends a counter like " (2)", " (3)", etc.
 * @param existingFilenames - An array of filenames that already exist.
 * @param baseFilename - The filename without extension and counter.
 * @param originalFilename - The original filename including extension.
 * @returns A unique filename.
 */
function generateUniqueFilename(existingFilenames: string[], baseFilename: string, originalFilename: string): string {
	let newFilename = originalFilename;
	let count = 2;
	const extension = originalFilename.split('.').pop();

	while (existingFilenames.includes(newFilename)) 
		newFilename = `${baseFilename} (${count++}).${extension}`;
    
	return newFilename;
}

/**
 * Uploads a file to GridFS, associated with a specific repository.
 * @param originalname - The original name of the file.
 * @param repoId - The ObjectId of the repository.
 * @param buffer - The file content as a Buffer.
 * @returns A promise that resolves with the metadata of the uploaded file.
 */
export async function fileUpload(originalname: string, repoId: string, buffer: Buffer): Promise<any> {
	const db = dbConnection.getConnection();
	const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });
	const repoObjId = oid(repoId);

	// base filename may be the same as filename, excluding extension
	const baseFilename = originalname.replace(/\s?(\(\d+\))?\.\w+$/, '');
	// the regex searches for files <filename> and any <filename> (0-9)
	const escapedBase = baseFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const existingFiles = await db.collection('GridFS.files').find({
		filename: { $regex: `^${escapedBase}` },
		'metadata.repoId': repoObjId
	}, { projection: { filename: 1 } }).toArray();

	const existingFilenames = existingFiles.map(file => file.filename);
	const newFilename = generateUniqueFilename(existingFilenames, baseFilename, originalname);

	const id = new ObjectId();

	const readableStream = Readable.from(buffer);

	return new Promise((resolve, reject) => {
		readableStream.pipe(bucket.openUploadStreamWithId(id, newFilename, { metadata: { repoId: repoObjId } }))
			.on('error', (error) => reject(error))
			.on('finish', () => resolve({
				_id: id,
				filename: newFilename,
				uploadDate: new Date(),
				metadata: { repoId: repoObjId }
			}));
	});
}

/**
 * Deletes a file from GridFS by its ObjectId.
 * @param fileId - The ObjectId of the file to delete.
 */
export async function deleteFile(fileId: string, repoId: string): Promise<void> {
	const db = dbConnection.getConnection();
	const fileDoc = await db.collection('GridFS.files').findOne({ _id: oid(fileId) });
	if (!fileDoc || fileDoc.metadata?.repoId?.toString() !== repoId) 
		throw new Error('File not found or not authorized');
    
	const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });
	await bucket.delete(oid(fileId));
}

/**
 * Retrieves a list of all files associated with a repository.
 * @param repoId - The ObjectId of the repository.
 * @returns A promise that resolves to an array of file metadata.
 */
export async function getFileList(repoId: string): Promise<FileElement[]> {
	const db = dbConnection.getConnection();
	const files = await db.collection('GridFS.files').find({ 'metadata.repoId': oid(repoId) }).toArray();
	// MongoDB returns ObjectId for _id, cast to shared interface (string _id)
	return files as unknown as FileElement[];
}

/**
 * Downloads files from GridFS and stores them temporarily in the local file system.
 * @param fileTitles - An array of filenames to download.
 * @param repoId - The ObjectId of the repository where the files are stored.
 */
export async function getFiles(fileTitles: string[], repoId: string): Promise<void> {
	const db = dbConnection.getConnection();
	const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });

	const uniqueDir = crypto.randomUUID();
	const destinationDirectory = path.join(os.tmpdir(), 'SeedTmp', repoId, uniqueDir) + path.sep;

	fs.mkdirSync(destinationDirectory, { recursive: true });

	for (const fileTitle of fileTitles) {
		const fileInfo = await db.collection('GridFS.files').findOne({ 'metadata.repoId': oid(repoId), filename: fileTitle });
		if (!fileInfo) {
			logger.warn(`File not found in GridFS: ${fileTitle}`);
			continue;
		}

		const downloadStream = bucket.openDownloadStream(fileInfo._id);
		const destinationPath = `${destinationDirectory}${fileInfo.filename}`;
		const fileWriteStream = fs.createWriteStream(destinationPath);

		// Set a timeout to delete the temporary file after 5 hours
		setTimeout(() => {
			fs.unlink(destinationPath, (err) => {
				if (err) logger.error(`Error deleting temp file ${destinationPath}: ${err}`);
				else logger.info(`Temp file ${fileInfo.filename} deleted.`);
			});
		}, 18000000); // 5 hours in milliseconds

		await new Promise<void>((resolve, reject) => {
			downloadStream.pipe(fileWriteStream);
			downloadStream.on('error', reject);
			fileWriteStream.on('finish', resolve);
			fileWriteStream.on('error', reject);
		});
	}
}