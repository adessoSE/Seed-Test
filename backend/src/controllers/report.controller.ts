import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as reportService from '../services/report.service';
import * as featureFileService from '../services/feature-file.service';
import fs from 'fs';
import path from 'path';

/**
 * Handles fetching specific report data by its ID.
 */
export async function getReportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const reportId = req.params.reportId;
        if (!ObjectId.isValid(reportId)) {
            res.status(400).json({ error: 'Invalid report ID format' });
            return;
        }
        // Use the dedicated service function
        const result = await reportService.getReportDataById(reportId);
        if (!result) {
            res.status(404).json({ error: 'Report not found' });
            return;
        }
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
        if (!fullReport || !fullReport.jsonReport) {
             res.status(404).json({ error: 'Report JSON data not found' }); return;
        }
        
        // Temporarily write JSON to disk for html-reporter
        const tempJsonPath = path.join(__dirname, `../../features/${reportName}.json`);
        await fs.promises.writeFile(tempJsonPath, fullReport.jsonReport);
        
        // Generate HTML
        const reportOptions = await reportService.generateHtmlReport(reportName, tempJsonPath);
        
        // Read HTML and send
        const htmlPath = path.join(__dirname, `../../features/${reportName}.html`);
        const htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
        res.json({ htmlFile: htmlContent, reportId: fullReport._id }); // Send HTML content

        // Clean up temporary files
        await fs.promises.unlink(tempJsonPath).catch(err => console.error(`Failed to delete temp JSON: ${err}`));
        await fs.promises.unlink(htmlPath).catch(err => console.error(`Failed to delete temp HTML: ${err}`)); // Optional: keep HTML?

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
         if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid story ID format' }); return;
        }
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
         if (!ObjectId.isValid(reportId)) {
             res.status(400).json({ error: 'Invalid report ID format' }); return;
        }
        await reportService.deleteReport(reportId);
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        next(error);
    }
}

/**
 * Handles setting the 'isSaved' status of a report.
 */
export async function setReportSavedStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const reportId = req.params.reportId;
        // Determine save status from the route path (e.g., /saveReport or /unsaveReport)
        const isSaved = req.path.includes('/saveReport');
         if (!ObjectId.isValid(reportId)) {
             res.status(400).json({ error: 'Invalid report ID format' }); return;
        }
        await reportService.setIsSavedTestReport(reportId, isSaved);
        res.status(200).json({ message: `Report marked as ${isSaved ? 'saved' : 'unsaved'}.` });
    } catch (error) {
        next(error);
    }
}