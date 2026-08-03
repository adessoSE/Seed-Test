/** Options for preserving the original cause when wrapping errors. */
interface AppErrorOptions {
	cause?: unknown;
	data?: Record<string, unknown>;
}

/**
 * Custom error class for operational errors with HTTP status codes.
 * Operational errors (validation failures, not-found, auth failures) are expected
 * and should return meaningful status codes. Programming errors remain generic 500s.
 */
export class AppError extends Error {
	readonly statusCode: number;
	readonly isOperational: boolean;
	readonly code?: string;
	readonly data?: Record<string, unknown>;

	constructor(message: string, statusCode: number, code?: string, options?: AppErrorOptions) {
		super(message, { cause: options?.cause });
		this.statusCode = statusCode;
		this.isOperational = true;
		this.code = code;
		this.data = options?.data;
		Object.setPrototypeOf(this, AppError.prototype);
	}

	static badRequest(message: string, code?: string, options?: AppErrorOptions): AppError {
		return new AppError(message, 400, code, options);
	}

	static unauthorized(message: string, options?: AppErrorOptions): AppError {
		return new AppError(message, 401, 'UNAUTHORIZED', options);
	}

	static forbidden(message: string, options?: AppErrorOptions): AppError {
		return new AppError(message, 403, 'FORBIDDEN', options);
	}

	static notFound(message: string, options?: AppErrorOptions): AppError {
		return new AppError(message, 404, 'NOT_FOUND', options);
	}

	static conflict(message: string, options?: AppErrorOptions): AppError {
		return new AppError(message, 409, 'CONFLICT', options);
	}

	static badGateway(message: string, options?: AppErrorOptions): AppError {
		return new AppError(message, 502, 'BAD_GATEWAY', options);
	}

	static notImplemented(message: string, options?: AppErrorOptions): AppError {
		return new AppError(message, 501, 'NOT_IMPLEMENTED', options);
	}
}
