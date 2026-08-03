import express from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authorizeByStory, authorizeByReport } from '../middleware/authorize.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Authorization: report history is story-scoped; individual reports resolve to stories via the report document
const canReadStory = authorizeByStory('storyId');
const canReadReport = authorizeByReport('reportId');
const canEditReport = authorizeByReport('reportId', { requireEdit: true });
const canReadReportByName = authorizeByReport('reportName', { lookupBy: 'name' });

// --- Report Management Routes ---

// Static/specific routes MUST come before dynamic :reportId
/**
 * @route   GET /api/report/regenerate/:reportName
 * @desc    Generate/Regenerate an older HTML report by name and send it back
 * @access  Private (report ownership checked in controller)
 */
router.get('/regenerate/:reportName', canReadReportByName, reportController.regenerateReport);

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
router.put('/save/:reportId', canEditReport, reportController.saveReport);

/**
 * @route   PUT /api/report/unsave/:reportId
 * @desc    Mark a report as not saved (unsaved)
 * @access  Private (report ownership checked in controller)
 */
router.put('/unsave/:reportId', canEditReport, reportController.unsaveReport);

/**
 * @route   GET /api/report/:reportId
 * @desc    Get specific report metadata by ID
 * @access  Private (report ownership checked in controller)
 */
router.get('/:reportId', canReadReport, reportController.getReportData);

/**
 * @route   DELETE /api/report/:reportId
 * @desc    Delete a report by its ID
 * @access  Private (report ownership checked in controller)
 */
router.delete('/:reportId', canEditReport, reportController.deleteReport);


export default router;