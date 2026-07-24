import express from 'express';
import * as reportController from '../controllers/report.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

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