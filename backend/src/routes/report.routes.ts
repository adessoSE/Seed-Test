import express from 'express';
import * as reportController from '../controllers/report.controller';
import { authorizeByStory } from '../middleware/authorize';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Authorization: report history is story-scoped; individual report routes
// are authorized in the controller (reportId → storyId lookup not available in URL)
const canReadStory = authorizeByStory('storyId');

// --- Report Management Routes ---

// Static/specific routes MUST come before dynamic :reportId
/**
 * @route   GET /api/report/regenerate/:reportName
 * @desc    Generate/Regenerate an older HTML report by name and send it back
 * @access  Private (report ownership checked in controller)
 */
router.get('/regenerate/:reportName', reportController.regenerateReport);

/**
 * @route   GET /api/report/history/:storyId
 * @desc    Get report history (metadata list) for a specific story
 * @access  Private (repo member)
 */
router.get('/history/:storyId', canReadStory, reportController.getReportHistory);

/**
 * @route   PUT /api/report/save/:reportId
 * @desc    Mark a report as saved
 * @access  Private (report ownership checked in controller)
 */
router.put('/save/:reportId', reportController.saveReport);

/**
 * @route   PUT /api/report/unsave/:reportId
 * @desc    Mark a report as not saved (unsaved)
 * @access  Private (report ownership checked in controller)
 */
router.put('/unsave/:reportId', reportController.unsaveReport);

/**
 * @route   GET /api/report/:reportId
 * @desc    Get specific report metadata by ID
 * @access  Private (report ownership checked in controller)
 */
router.get('/:reportId', reportController.getReportData);

/**
 * @route   DELETE /api/report/:reportId
 * @desc    Delete a report by its ID
 * @access  Private (report ownership checked in controller)
 */
router.delete('/:reportId', reportController.deleteReport);


export default router;