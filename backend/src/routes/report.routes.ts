import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as reportController from '../controllers/report.controller';

const router = express.Router();

// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
// Authentication is assumed to be handled globally before this router.
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json({ limit: '100kb' })) // Adjust limits if needed
    .use(bodyParser.urlencoded({
        limit: '100kb',
        extended: true
    }))
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log('Time of report management request:', Date.now());
        next();
    });

// --- Report Management Routes ---

/**
 * @route   GET /api/report/:reportId
 * @desc    Get specific report metadata by ID
 * @access  Private (Assumed)
 */
router.get('/:reportId', reportController.getReportData); // Renamed controller function

/**
 * @route   GET /api/report/regenerate/:reportName
 * @desc    Generate/Regenerate an older HTML report by name and send it back
 * @access  Private (Assumed)
 */
router.get('/regenerate/:reportName', reportController.regenerateReport);

/**
 * @route   GET /api/report/history/:storyId
 * @desc    Get report history (metadata list) for a specific story
 * @access  Private (Assumed)
 */
router.get('/history/:storyId', reportController.getReportHistory);

/**
 * @route   DELETE /api/report/:reportId
 * @desc    Delete a report by its ID
 * @access  Private (Assumed)
 */
router.delete('/:reportId', reportController.deleteReport);

/**
 * @route   PUT /api/report/save/:reportId
 * @desc    Mark a report as saved (using PUT for state change is slightly more RESTful)
 * @access  Private (Assumed)
 */
router.put('/save/:reportId', (req, res, next) => {
    (req as any).saveStatus = true;
    reportController.setReportSavedStatus(req, res, next);
});

/**
 * @route   PUT /api/report/unsave/:reportId
 * @desc    Mark a report as not saved (unsaved)
 * @access  Private (Assumed)
 */
router.put('/unsave/:reportId', (req, res, next) => {
    (req as any).saveStatus = false;
    reportController.setReportSavedStatus(req, res, next);
});


export default router;