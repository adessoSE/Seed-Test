import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging.js';

/**
 * Middleware to check if the user is authenticated via Passport.
 * Returns 401 Unauthorized if no valid session exists.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
	if (req.isAuthenticated())
		return next();

	logger.warn(`Authentication check failed for: ${req.method} ${req.originalUrl}`);
	res.status(401).json({ error: 'Unauthorized: Please log in.' });
};
