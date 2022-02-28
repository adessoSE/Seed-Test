const winston = require('winston')

function getLogger(){
	//Winston config
	const myformat = winston.format.combine(
		winston.format.colorize(),
		winston.format.timestamp(),
		winston.format.align(),
		winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
	);
	const logConfiguration = {
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
const logger = getLogger();

function httpLog(req, res, next) {
    if (req.url.endsWith('log')) 
		{next()}
		else{
			console.log('Time:', Date.now());
			let current_datetime = new Date();
			let formatted_date =
				current_datetime.getFullYear() +
				"-" +
				(current_datetime.getMonth() + 1) +
				"-" +
				current_datetime.getDate() +
				" " +
				current_datetime.getHours() +
				":" +
				current_datetime.getMinutes() +
				":" +
				current_datetime.getSeconds();
			let method = req.method;
			let url = req.url;
			let status = res.statusCode;
			let log = `[${formatted_date}] ${method}:${url} ${status}`;
			logger.debug(log)
			next();
		}
    
}


module.exports = {
	httpLog,
    getLogger
};
