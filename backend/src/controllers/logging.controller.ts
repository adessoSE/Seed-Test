import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Handles logging messages from the frontend to a file.
 */
export async function logFrontendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const logMessage = req.body.message || 'No message provided';
        const additionalInfo = req.body.additional ? JSON.stringify(req.body.additional) : '';
        
        // Ensure logs directory exists
        const logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const stream = fs.createWriteStream(path.join(logDir, 'front.log'), { flags: 'a' });
        stream.write(`${new Date().toISOString()} - ${logMessage} ${additionalInfo}\n`);
        stream.end();
        
        res.status(200).json({ message: 'logged' });
    } catch (error) {
        next(error);
    }
}