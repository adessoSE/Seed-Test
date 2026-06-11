import { ObjectId, GridFSBucket } from 'mongodb';
import * as dbConnection from '../database/DbConnector';
import { Readable } from 'stream';
import fs from 'fs';
import os from 'os';
import { FileElement } from '@shared/models/FileElement';

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

    while (existingFilenames.includes(newFilename)) {
        newFilename = `${baseFilename} (${count++}).${extension}`;
    }
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
    const repoObjId = new ObjectId(repoId);

    // base filename may be the same as filename, excluding extension
    const baseFilename = originalname.replace(/\s?(\(\d+\))?\.\w+$/, '');
    // the regex searches for files <filename> and any <filename> (0-9)
    const existingFiles = await db.collection('GridFS.files').find({
        filename: { $regex: `^${baseFilename}` },
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
export async function deleteFile(fileId: string): Promise<void> {
    const db = dbConnection.getConnection();
    const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });
    await bucket.delete(new ObjectId(fileId));
}

/**
 * Retrieves a list of all files associated with a repository.
 * @param repoId - The ObjectId of the repository.
 * @returns A promise that resolves to an array of file metadata.
 */
export async function getFileList(repoId: string): Promise<FileElement[]> {
    const db = dbConnection.getConnection();
    const files = await db.collection('GridFS.files').find({ 'metadata.repoId': new ObjectId(repoId) }).toArray();
    return files as FileElement[];
}

/**
 * Downloads files from GridFS and stores them temporarily in the local file system.
 * @param fileTitles - An array of filenames to download.
 * @param repoId - The ObjectId of the repository where the files are stored.
 */
export async function getFiles(fileTitles: string[], repoId: string): Promise<void> {
    const db = dbConnection.getConnection();
    const bucket = new GridFSBucket(db, { bucketName: 'GridFS' });

    let destinationDirectory: string;
    switch (process.platform) {
        case 'win32': //Windows
            destinationDirectory = 'C:\\Users\\Public\\SeedTmp\\';
            break;
        case 'darwin': //macOS
            destinationDirectory = `/Users/${os.userInfo().username}/SeedTmp/`;
            break;
        default:
            destinationDirectory = '/home/public/SeedTmp/';
    }

    if (!fs.existsSync(destinationDirectory)) {
        fs.mkdirSync(destinationDirectory, { recursive: true });
    }

    for (const fileTitle of fileTitles) {
        const fileInfo = await db.collection('GridFS.files').findOne({ 'metadata.repoId': new ObjectId(repoId), filename: fileTitle });
        if (!fileInfo) {
            console.warn(`File not found in GridFS: ${fileTitle}`);
            continue;
        }

        const downloadStream = bucket.openDownloadStream(fileInfo._id);
        const destinationPath = `${destinationDirectory}${fileInfo.filename}`;
        const fileWriteStream = fs.createWriteStream(destinationPath);

        // Set a timeout to delete the temporary file after 5 hours
        setTimeout(() => {
            fs.unlink(destinationPath, (err) => {
                if (err) console.error(`Error deleting temp file ${destinationPath}:`, err);
                else console.log(`Temp file ${fileInfo.filename} deleted.`);
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