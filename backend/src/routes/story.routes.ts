import express, { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import * as storyController from '../controllers/story.controller.js';
import { authorizeRepo, authorizeByStory, authorizeByIssueKey } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createStorySchema, createScenarioSchema, setOneDriverSchema, resolveCommandSchema, updateStoryOrderSchema, scenarioSchema, updateScenarioListSchema, updateStorySchema } from '@seed-test/shared/schemas/story.schemas.js';
import { AppError } from '../helpers/AppError.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Setup multer for file uploads (used in import route) with file type restriction
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
	fileFilter: (_req, file, cb) => {
		const allowedMimes = ['application/zip', 'application/x-zip-compressed'];
		const ext = path.extname(file.originalname).toLowerCase();
		// Allow .zip by MIME type, or .seed by extension (transmitted as application/octet-stream)
		if (allowedMimes.includes(file.mimetype) || (ext === '.seed' && file.mimetype === 'application/octet-stream'))
			cb(null, true);
		else
			cb(new AppError('Only .zip and .seed files are allowed for import.', 400));
	}
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
// Import routes — POST may create a new project (no repo_id), PUT always targets an existing repo
const canEditRepoByImportQuery = authorizeRepo('repo_id', { requireEdit: true, source: 'query' });
/** Conditional auth for import POST — only enforces repo auth when updating an existing project. */
const canImport = async (req: Request, res: Response, next: NextFunction) => {
	if (req.query.repo_id)
		return canEditRepoByImportQuery(req, res, next);
	next();
};
// Issue key route — read-only access via external issue key lookup
const canReadByIssueKey = authorizeByIssueKey('issue_key');

// Static and specific routes MUST be defined before dynamic routes.

// --- Import / Export Routes (Static prefixes) ---
router.post('/upload/import/', canImport, upload.single('file'), storyController.importProjectArchive);
router.put('/upload/import/', canEditRepoByImportQuery, upload.single('file'), storyController.importProjectArchive);
router.get('/download/story/:_id', canEditById, storyController.downloadSingleFeature);
router.get('/download/project/:repo_id', canReadRepo, storyController.downloadProjectFeatures);
router.get('/download/export/:repo_id', canReadRepo, storyController.exportProjectArchive);

// --- Other Specific Action Routes ---
router.post('/specialCommands/resolve', validate(resolveCommandSchema), storyController.resolveSpecialCommands);
router.post('/oneDriver/:storyID', canEditByStoryAlt, validate(setOneDriverSchema), storyController.setOneDriver);
router.get('/issueKey/:issue_key', canReadByIssueKey, storyController.getStoryByIssueKey);

// --- AI Routes (Specific prefixes) ---
router.post('/:story_id/generate-scenarios', canEditByStory, storyController.generateAiScenarios);
router.get('/:story_id/generate-scenarios/status', canEditByStory, storyController.getAiGenerationStatus);

// --- Scenario Routes (More specific than base Story routes) ---
router.delete('/scenario/:story_id/:_id', canEditByStory, storyController.deleteScenario);
router.get('/:story_id/:_id', canEditByStory, storyController.getScenario);
router.put('/:story_id/:_id', canEditByStory, validate(scenarioSchema), storyController.updateScenario);
router.post('/:story_id', canEditByStory, validate(createScenarioSchema), storyController.createScenario);
router.patch('/:story_id', canEditByStory, validate(updateScenarioListSchema), storyController.updateScenarioList);

// --- Base Story Routes (Most general routes last) ---
/**
 * @route   GET /api/story/
 * @desc    Get all stories for a specific repository (from DB, GitHub, or Jira)
 * @access  Private (repo access checked in controller via query param)
 */
router.get('/', canReadRepoByQuery, storyController.getStories);
router.post('/', canEditRepoByBody, validate(createStorySchema), storyController.createStory);
router.put('/list/:repo_id', canEditRepo, validate(updateStoryOrderSchema), storyController.updateStoryOrder);
router.get('/:_id', canReadById, storyController.getStoryById);
router.put('/:_id', canEditById, validate(updateStorySchema), storyController.updateStory);
router.delete('/:repo_id/:_id', canEditRepo, storyController.deleteStory);

export default router;