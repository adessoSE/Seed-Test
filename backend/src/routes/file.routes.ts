import express from 'express';
import multer from 'multer';
import * as fileController from '../controllers/file.controller.js';
import { authorizeRepo } from '../middleware/authorize.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Setup multer for file uploads in memory
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Authorization: all file operations require repo-level access
const canRead = authorizeRepo('repoId');
const canEdit = authorizeRepo('repoId', { requireEdit: true });

// --- File Routes ---

/**
 * @route   POST /api/files/:repoId
 * @desc    Upload a new file to a repository
 * @access  Private (repo editor)
 */
router.post('/:repoId', canEdit, upload.single('file'), fileController.fileUpload);

/**
 * @route   GET /api/files/:repoId
 * @desc    Get a list of all files for a repository
 * @access  Private (repo member)
 */
router.get('/:repoId', canRead, fileController.getFileList);

/**
 * @route   DELETE /api/files/:repoId/:fileId
 * @desc    Delete a specific file from a repository
 * @access  Private (repo editor)
 */
router.delete('/:repoId/:fileId', canEdit, fileController.deleteFile);


export default router;