import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging.js';

/**
 * Creates Express middleware that validates req.body against a Zod schema.
 * Returns 400 with field-level errors on failure; replaces req.body with parsed data on success.
 */
export function validate<T extends z.ZodType>(schema: T) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			const issues = result.error.issues.map((i) => ({
				path: i.path.join('.'),
				message: i.message
			}));
			logger.warn(`Validation failed for ${req.method} ${req.originalUrl}: ${JSON.stringify(issues)}`);
			res.status(400).json({ error: 'Validation failed', details: issues });
			return;
		}
		// Replace body with parsed output (strips unknown keys, applies defaults/transforms)
		req.body = result.data;
		next();
	};
}
