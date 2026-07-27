import express from 'express';
import multer from 'multer';
import * as storyController from '../controllers/story.controller.js';
import { authorizeRepo, authorizeByStory } from '../middleware/authorize.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Setup multer for file uploads (used in import route)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Authorization helpers — URL-param-based
const canReadRepo = authorizeRepo('repo_id');
const canEditRepo = authorizeRepo('repo_id', { requireEdit: true });
const canEditByStory = authorizeByStory('story_id', { requireEdit: true });
const canEditByStoryAlt = authorizeByStory('storyID', { requireEdit: true });
const canEditById = authorizeByStory('_id', { requireEdit: true });
const canReadById = authorizeByStory('_id');
// Body/query-based authorization for routes without repo ID in URL
const canReadRepoByQuery = authorizeRepo('id', { source: 'query' });
const canEditRepoByBody = authorizeRepo('_id', { requireEdit: true, source: 'body' });

// Static and specific routes MUST be defined before dynamic routes.

// --- Import / Export Routes (Static prefixes) ---
router.post('/upload/import/', upload.single('file'), storyController.importProjectArchive);
router.put('/upload/import/', upload.single('file'), storyController.importProjectArchive);
router.get('/download/story/:_id', canEditById, storyController.downloadSingleFeature);
router.get('/download/project/:repo_id', canReadRepo, storyController.downloadProjectFeatures);
router.get('/download/export/:repo_id', canReadRepo, storyController.exportProjectArchive);

// --- Other Specific Action Routes ---
router.post('/specialCommands/resolve', storyController.resolveSpecialCommands);
router.post('/oneDriver/:storyID', canEditByStoryAlt, storyController.setOneDriver);
router.get('/issueKey/:issue_key', storyController.getStoryByIssueKey);

// --- AI Routes (Specific prefixes) ---
router.post('/:story_id/generate-scenarios', canEditByStory, storyController.generateAiScenarios);
router.get('/:story_id/generate-scenarios/status', canEditByStory, storyController.getAiGenerationStatus);

// --- Scenario Routes (More specific than base Story routes) ---
router.delete('/scenario/:story_id/:_id', canEditByStory, storyController.deleteScenario);
router.get('/:story_id/:_id', canEditByStory, storyController.getScenario);
router.put('/:story_id/:_id', canEditByStory, storyController.updateScenario);
router.post('/:story_id', canEditByStory, storyController.createScenario);
router.patch('/:story_id', canEditByStory, storyController.updateScenarioList);

// --- Base Story Routes (Most general routes last) ---
/**
 * @route   GET /api/story/
 * @desc    Get all stories for a specific repository (from DB, GitHub, or Jira)
 * @access  Private (repo access checked in controller via query param)
 */
router.get('/', canReadRepoByQuery, storyController.getStories);
router.post('/', canEditRepoByBody, storyController.createStory);
router.put('/list/:repo_id', canEditRepo, storyController.updateStoryOrder);
router.get('/:_id', canReadById, storyController.getStoryById);
router.put('/:_id', canEditById, storyController.updateStory);
router.delete('/:repo_id/:_id', canEditRepo, storyController.deleteStory);

export default router;