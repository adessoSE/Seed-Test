import express from 'express';
import multer from 'multer';
import * as fileController from '../controllers/file.controller.js';
import { authorizeRepo } from '../middleware/authorize.js';
import { AppError } from '../helpers/AppError.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Allowed MIME types for file uploads — common document and image formats
const allowedFileMimes = [
	'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
	'application/pdf', 'text/plain', 'text/csv', 'application/json',
	// Office formats (xlsx, docx)
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Setup multer for file uploads in memory with MIME type restriction
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
	fileFilter: (_req, file, cb) => {
		if (allowedFileMimes.includes(file.mimetype))
			cb(null, true);
		else
			cb(new AppError('File type not allowed', 400));
	}
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