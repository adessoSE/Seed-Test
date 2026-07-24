/**
 * Custom error class for operational errors with HTTP status codes.
 * Operational errors (validation failures, not-found, auth failures) are expected
 * and should return meaningful status codes. Programming errors remain generic 500s.
 */
export class AppError extends Error {
	readonly statusCode: number;
	readonly isOperational: boolean;
	readonly code?: string;

	constructor(message: string, statusCode: number, code?: string) {
		super(message);
		this.statusCode = statusCode;
		this.isOperational = true;
		this.code = code;
		Object.setPrototypeOf(this, AppError.prototype);
	}

	static badRequest(message: string, code?: string): AppError {
		return new AppError(message, 400, code);
	}

	static unauthorized(message: string): AppError {
		return new AppError(message, 401, 'UNAUTHORIZED');
	}

	static forbidden(message: string): AppError {
		return new AppError(message, 403, 'FORBIDDEN');
	}

	static notFound(message: string): AppError {
		return new AppError(message, 404, 'NOT_FOUND');
	}

	static conflict(message: string): AppError {
		return new AppError(message, 409, 'CONFLICT');
	}
}
