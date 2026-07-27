import winston, { Logger, LoggerOptions } from 'winston';
import { Request, Response, NextFunction } from 'express';

function getLogger(): Logger {
	// Shared format: timestamp + level + message (no align — it adds unwanted tabs)
	const baseFormat = winston.format.combine(
		winston.format.timestamp(),
		winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
	);

	// Console gets ANSI colors; file transports get plain text (no colorize)
	const consoleFormat = winston.format.combine(
		winston.format.colorize(),
		baseFormat
	);

	const logConfiguration: LoggerOptions = {
		transports: [
			new winston.transports.Console({
				level: 'debug',
				format: consoleFormat
			}),
			new winston.transports.File({
				level: 'warn',
				filename: './logs/backend_warn.log',
				format: baseFormat,
				maxsize: 10 * 1024 * 1024, // 10 MB per file
				maxFiles: 5
			}),
			new winston.transports.File({
				level: 'debug',
				filename: './logs/backend_debug.log',
				format: baseFormat,
				maxsize: 10 * 1024 * 1024, // 10 MB per file
				maxFiles: 5
			})
		]
	};
	return winston.createLogger(logConfiguration);
}

const logger: Logger = getLogger();

export function httpLog(req: Request, res: Response, next: NextFunction): void {
	if (req.url.endsWith('log')) 
		next();
	else {
		const requestStart = Date.now();
		let errorMessage: string | null = null;

		req.on('error', (error: Error) => {
			errorMessage = error.message;
		});

		res.on('finish', () => {
			const { method, socket, url } = req;
			const { remoteAddress } = socket;

			const processingTime = Date.now() - requestStart;
			const status = res.statusCode;
			let log = `[${requestStart}, duration: ${processingTime}] ${method}:${url}, reqOrigin: ${remoteAddress}, resCode: ${status}`;
			log += errorMessage ? `\n error: ${errorMessage}` : '';
			logger.debug(log);
		});
		next();
	}
}

export { logger, getLogger };