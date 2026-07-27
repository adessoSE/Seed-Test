import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as reportService from '../services/report.service.js';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logging.js';
import { AppError } from '../helpers/AppError.js';

/**
 * Handles fetching specific report data by its ID.
 */
export async function getReportData(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const reportId = req.params.reportId;
		if (!ObjectId.isValid(reportId))
			throw AppError.badRequest('Invalid report ID format');

		// Use the dedicated service function
		const result = await reportService.getReportDataById(reportId);
		if (!result)
			throw AppError.notFound('Report not found');
		res.status(200).json(result);
	} catch (error) {
		next(error); // Pass errors to the central handler
	}
}

/**
 * Handles regenerating and sending an older HTML report by its name.
 */
export async function regenerateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const reportName = req.params.reportName;
		// Regenerate based on name - logic moved from reporting.ts/createReport
		const fullReport = await reportService.getReportByName(reportName);
		if (!fullReport || !fullReport.jsonReport)
			throw AppError.notFound('Report JSON data not found');
        
		// Temporarily write JSON to disk for html-reporter
		const tempJsonPath = path.join(process.cwd(), `features/${reportName}.json`);
		await fs.promises.writeFile(tempJsonPath, fullReport.jsonReport);
        
		// Generate HTML
		await reportService.generateHtmlReport(reportName, tempJsonPath);
        
		// Read HTML and send
		const htmlPath = path.join(process.cwd(), `features/${reportName}.html`);
		const htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
		res.json({ htmlFile: htmlContent, reportId: fullReport._id }); // Send HTML content

		// Clean up temporary files
		await fs.promises.unlink(tempJsonPath).catch(err => logger.error(`Failed to delete temp JSON: ${err}`));
		await fs.promises.unlink(htmlPath).catch(err => logger.error(`Failed to delete temp HTML: ${err}`)); // Optional: keep HTML?

	} catch (error) {
		next(error);
	}
}

/**
 * Handles fetching the report history for a specific story.
 */
export async function getReportHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const storyId = req.params.storyId;
		if (!ObjectId.isValid(storyId))
			throw AppError.badRequest('Invalid story ID format');
		const reportContainer = await reportService.getReportHistory(storyId);
		res.status(200).json(reportContainer);
	} catch (error) {
		next(error);
	}
}

/**
 * Handles deleting a report by its ID.
 */
export async function deleteReport(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const reportId = req.params.reportId;
		if (!ObjectId.isValid(reportId))
			throw AppError.badRequest('Invalid report ID format');

		await reportService.deleteReport(reportId);
		res.status(200).json({ message: 'Report deleted successfully' });
	} catch (error) {
		next(error);
	}
}

/** Marks a report as saved. */
export async function saveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { reportId } = req.params;
		if (!ObjectId.isValid(reportId))
			throw AppError.badRequest('Invalid report ID format');

		await reportService.setIsSavedTestReport(reportId, true);
		res.status(200).json({ message: 'Report marked as saved.' });
	} catch (error) {
		next(error);
	}
}

/** Marks a report as unsaved. */
export async function unsaveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { reportId } = req.params;
		if (!ObjectId.isValid(reportId))
			throw AppError.badRequest('Invalid report ID format');

		await reportService.setIsSavedTestReport(reportId, false);
		res.status(200).json({ message: 'Report marked as unsaved.' });
	} catch (error) {
		next(error);
	}
}