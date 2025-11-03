import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bodyParser from 'body-parser';
import * as storyController from '../controllers/story.controller';

const router = express.Router();

// Setup multer for file uploads (used in import route)
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
    // Use different limits for JSON vs file uploads if needed
    .use(bodyParser.json({ limit: '500kb' }))
    .use(bodyParser.urlencoded({
        limit: '500kb',
        extended: true
    }))
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect, repoid'); // Added repoid for AI header
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log(`Time of story router request: ${_.method} ${_.originalUrl}`, Date.now());
        next();
    });

// --- Story Routes ---

/**
 * @route   GET /api/story/
 * @desc    Get all stories for a specific repository (from DB, GitHub, or Jira)
 * @access  Private
 */
router.get('/', storyController.getStories);

router.post('/', storyController.createStory);
router.get('/:_id', storyController.getStoryById);
router.get('/issueKey/:issue_key', storyController.getStoryByIssueKey);
router.put('/:_id', storyController.updateStory);
router.delete('/:repo_id/:_id', storyController.deleteStory);
router.post('/oneDriver/:storyID', storyController.setOneDriver); // Changed param name

// --- Scenario Routes ---
router.patch('/:story_id', storyController.updateScenarioList); // Update whole list (reorder etc.)
router.get('/:story_id/:_id', storyController.getScenario); // Scenario ID is numeric
router.post('/:story_id', storyController.createScenario);
router.put('/:story_id/:_id', storyController.updateScenario); // Scenario ID is numeric
router.delete('/scenario/:story_id/:_id', storyController.deleteScenario); // Scenario ID is numeric

// --- Download/Export Routes ---
router.get('/download/story/:_id', storyController.downloadSingleFeature);
router.get('/download/project/:repo_id', storyController.downloadProjectFeatures);
router.get('/download/export/:repo_id', storyController.exportProjectArchive);

// --- Import Routes ---
router.post('/upload/import/', upload.single('file'), storyController.importProjectArchive); // New project
router.put('/upload/import/', upload.single('file'), storyController.importProjectArchive); // Existing project

// --- Other Actions ---
router.post('/specialCommands/resolve', storyController.resolveSpecialCommands);

// --- AI Routes ---
router.post('/:story_id/generate-scenarios', storyController.generateAiScenarios);
router.get('/:story_id/generate-scenarios/status', storyController.getAiGenerationStatus); // SSE Route

export default router;