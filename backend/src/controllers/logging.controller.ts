import { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Handles logging messages from the frontend to a file.
 */
export function logFrontendMessage(req: Request, res: Response, next: NextFunction): void {
	try {
		const { message: logMessage, additional } = req.body as Record<string, unknown>;
		const additionalInfo = additional ? JSON.stringify(additional) : '';
		const msg = typeof logMessage === 'string' ? logMessage : 'No message provided';
        
		// Ensure logs directory exists
		const logDir = path.join(process.cwd(), 'logs');
		if (!fs.existsSync(logDir)) 
			fs.mkdirSync(logDir, { recursive: true });
        

		const stream = fs.createWriteStream(path.join(logDir, 'front.log'), { flags: 'a' });
		stream.write(`${new Date().toISOString()} - ${msg} ${additionalInfo}\n`);
		stream.end();
        
		res.status(200).json({ message: 'logged' });
	} catch (error) {
		next(error);
	}
}