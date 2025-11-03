import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bodyParser from 'body-parser';
import * as fileController from '../controllers/file.controller';

const router = express.Router();

// Setup multer for file uploads in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
// Authentication is assumed to be handled globally.
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json({ limit: '500kb' })) // Keep json limit small
    .use(bodyParser.urlencoded({
        limit: '500kb',
        extended: true
    }))
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log('Time of file router request:', Date.now());
        next();
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
 * @route   DELETE /api/files/:fileId
 * @desc    Delete a specific file
 * @access  Private
 */
router.delete('/:fileId', fileController.deleteFile);


export default router;