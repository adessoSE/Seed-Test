import express from 'express';
import multer from 'multer';
import * as fileController from '../controllers/file.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Setup multer for file uploads in memory
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// --- File Routes ---

/**
 * @route   POST /api/files/:repoId
 * @desc    Upload a new file to a repository
 * @access  Private
 */
router.post('/:repoId', upload.single('file'), fileController.fileUpload);

/**
 * @route   GET /api/files/:repoId
 * @desc    Get a list of all files for a repository
 * @access  Private
 */
router.get('/:repoId', fileController.getFileList);

/**
 * @route   DELETE /api/files/:repoId/:fileId
 * @desc    Delete a specific file from a repository
 * @access  Private
 */
router.delete('/:repoId/:fileId', fileController.deleteFile);


export default router;