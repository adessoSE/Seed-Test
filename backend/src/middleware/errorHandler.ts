import { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../helpers/AppError.js';
import { logger } from '../logging.js';

/**
 * Resolves the HTTP status for an error passed to next().
 * AppError carries an explicit status code. Errors from Express middleware such as body-parser
 * (malformed JSON 400, payload too large 413) carry a 4xx `status`, which is kept so the client
 * sees its own mistake instead of a 500. Multer upload errors map to 413/400. Everything else is an unexpected 500.
 */
function resolveStatus(err: Error): number {
	if (err instanceof AppError)
		return err.statusCode;
	// MulterError carries no status, only a code; the upload size limit is a 413, the rest are client mistakes
	if (err instanceof multer.MulterError)
		return err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
	const status = (err as { status?: unknown }).status;
	if (typeof status === 'number' && status >= 400 && status < 500)
		return status;
	return 500;
}

/**
 * Central Express error handler. Must be registered after all routes.
 * Logs unexpected errors with their stack and hides their message from the client;
 * operational errors are logged as warnings and returned with their message.
 * @param err - Error forwarded via next(err) or thrown in a route.
 * @param _req - Unused request.
 * @param res - Response; left untouched when headers were already sent.
 * @param _next - Required in the signature so Express treats this as an error handler.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
	// Guard: don't attempt to send if response already started (e.g. post-response errors)
	if (res.headersSent) {
		logger.error(`Error after response sent (suppressed): ${err.message}`);
		return;
	}

	const statusCode = resolveStatus(err);

	// Only log stack traces for unexpected errors, not operational ones
	if (statusCode === 500)
		logger.error(`Unexpected error: ${err.stack}`);
	else
		logger.warn(`Operational error [${statusCode}]: ${err.message}`);

	const responseBody: Record<string, unknown> = {
		error: statusCode === 500 ? 'Internal Server Error' : err.message
	};
	// Attach structured error data when available (e.g. field-level details from AppError)
	if (err instanceof AppError && err.data)
		Object.assign(responseBody, { data: err.data });
	res.status(statusCode).json(responseBody);
}
