import winston, { Logger, LoggerOptions } from 'winston';
import { Request, Response, NextFunction } from 'express';

function getLogger(): Logger {
	// Winston config
	const myformat = winston.format.combine(
		winston.format.colorize(),
		winston.format.timestamp(),
		winston.format.align(),
		winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
	);

	const logConfiguration: LoggerOptions = {
		transports: [
			new winston.transports.Console({
				level: 'debug',
				format: myformat
			}),
			new winston.transports.File({
				level: 'warn',
				filename: './logs/backend_warn.log',
				format: myformat
			}),
			new winston.transports.File({
				level: 'debug',
				filename: './logs/backend_debug.log',
				format: myformat
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