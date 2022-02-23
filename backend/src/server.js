require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const scriptRouter = require('./serverRouter/scriptRouter');
const runReportRouter = require('./serverRouter/runReportRouter');
const githubRouter = require('./serverRouter/githubRouter');
const mongoRouter = require('./serverRouter/mongoRouter');
const jiraRouter = require('./serverRouter/jiraRouter');
const userRouter = require('./serverRouter/userRouter');
const groupRouter = require('./serverRouter/groupRouter');
const workgroupsRouter = require('./serverRouter/workgroups');
const storyRouter = require('./serverRouter/storyRouter');
require('./database/DbServices');

const app = express();
app.disable('x-powered-by');

// Initialize the app.
const server = app.listen(process.env.PORT || 8080, () => {
	const { port } = server.address();
	console.log(`App now running on port: ${port}`);
});
server.setTimeout(600000);

/**
 * API Description
 */

if (process.env.NODE_ENV) app
	.use(flash())
	.use(session({
		store: new MongoStore({
			url: process.env.DATABASE_URI,
			dbName: 'Seed',
			collection: 'Sessions'
		}),
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		proxy: true,
		cookie: {
			secure: true,
			sameSite: 'none'
		}
	}));
else app
	.use(flash())
	.use(session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		proxy: true
	}));

app
	.use(cors({
		origin: [
			process.env.FRONTEND_URL
		],
		credentials: true
	}));


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
app
	.use(passport.initialize())
	.use(passport.session())
	.use(bodyParser.json({ limit: '100kb' }))
	.use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
	.use((_, __, next) => {
		if (_.url.includes('log') && !_.url.includes('login')) next();
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
			let method = _.method;
			let url = _.url;
			let status = __.statusCode;
			let log = `[${formatted_date}] ${method}:${url} ${status}`;
			logger.debug(log)
			next();
		}
	})
	.use('/api/script', scriptRouter)
	.use('/api/run', runReportRouter)
	.use('/api/github', githubRouter)
	.use('/api/mongo', mongoRouter)
	.use('/api/jira', jiraRouter)
	.use('/api/user', userRouter)
	.use('/api/group', groupRouter)
	.use('/api/workgroups', workgroupsRouter)
	.use('/api/story', storyRouter)
	.get('/api', (_, res) => {
		res.sendFile('htmlresponse/apistandartresponse.html', { root: __dirname });
	});
	

module.exports = { app };
