import express from 'express';
import multer from 'multer';
import * as storyController from '../controllers/story.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Setup multer for file uploads (used in import route)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});


// Static and specific routes MUST be defined before dynamic routes.

// --- Import / Export Routes (Static prefixes) ---
router.post('/upload/import/', upload.single('file'), storyController.importProjectArchive);
router.put('/upload/import/', upload.single('file'), storyController.importProjectArchive); // <-- This now comes before /:story_id/:_id
router.get('/download/story/:_id', storyController.downloadSingleFeature);
router.get('/download/project/:repo_id', storyController.downloadProjectFeatures);
router.get('/download/export/:repo_id', storyController.exportProjectArchive);

// --- Other Specific Action Routes ---
router.post('/specialCommands/resolve', storyController.resolveSpecialCommands);
router.post('/oneDriver/:storyID', storyController.setOneDriver);
router.get('/issueKey/:issue_key', storyController.getStoryByIssueKey);

// --- AI Routes (Specific prefixes) ---
router.post('/:story_id/generate-scenarios', storyController.generateAiScenarios);
router.get('/:story_id/generate-scenarios/status', storyController.getAiGenerationStatus); // SSE Route

// --- Scenario Routes (More specific than base Story routes) ---
// Note: '/scenario/...' prefix makes it distinct
router.delete('/scenario/:story_id/:_id', storyController.deleteScenario); 
// These routes with 2 parameters must come before routes with 1 parameter
router.get('/:story_id/:_id', storyController.getScenario); 
router.put('/:story_id/:_id', storyController.updateScenario);
router.post('/:story_id', storyController.createScenario);
router.patch('/:story_id', storyController.updateScenarioList);

// --- Base Story Routes (Most general routes last) ---
/**
 * @route   GET /api/story/
 * @desc    Get all stories for a specific repository (from DB, GitHub, or Jira)
 * @access  Private
 */
router.get('/', storyController.getStories);
router.post('/', storyController.createStory);
router.put('/list/:repo_id', storyController.updateStoryOrder);
router.get('/:_id', storyController.getStoryById);
router.put('/:_id', storyController.updateStory);
router.delete('/:repo_id/:_id', storyController.deleteStory);

export default router;