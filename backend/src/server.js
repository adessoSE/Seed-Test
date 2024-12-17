require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const scriptRouter = require('./serverRouter/scriptRouter');
const runReportRouter = require('./serverRouter/runReportRouter');
const githubRouter = require('./serverRouter/githubRouter');
const mongo = require('./database/DbServices');
const jiraRouter = require('./serverRouter/jiraRouter');
const userRouter = require('./serverRouter/userRouter');
const projectRouter = require('./serverRouter/projectRouter');
const groupRouter = require('./serverRouter/groupRouter');
const workgroupsRouter = require('./serverRouter/workgroups');
const storyRouter = require('./serverRouter/storyRouter');
const blockRouter = require('./serverRouter/blockRouter');
const reportRouter = require('./serverRouter/reportRouter');
const backgroundRouter = require('./serverRouter/backgroundRouter');
const sanityTest = require('./serverRouter/sanityTest');
const logging = require('./logging');

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
		store: MongoStore.create({
			mongoUrl: process.env.DATABASE_URI || 'mongodb://SeedAdmin:SeedTest@seedmongodb:27017',
			dbName: 'Seed',
			collectionName: 'Sessions'
		}),
		secret: process.env.SESSION_SECRET || 'unsaveSecret',
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
		secret: process.env.SESSION_SECRET || 'unsaveSecret',
		resave: false,
		saveUninitialized: false,
		proxy: true
	}));

app
	.use(cors({
		origin: [
			process.env.FRONTEND_URL || 'http://localhost:4200'
		],
		credentials: true
	}));

app
	.use(passport.initialize())
	.use(passport.session())
	.use((_, __, next) => {
		logging.httpLog(_, __, next);
	})
	.use('/api/script', scriptRouter)
	.use('/api/run', runReportRouter)
	.use('/api/github', githubRouter)
	.use('/api/jira', jiraRouter)
	.use('/api/user', userRouter)
	.use('/api/user/repositories', projectRouter)
	.use('/api/group', groupRouter)
	.use('/api/workgroups', workgroupsRouter)
	.use('/api/story', storyRouter)
	.use('/api/block', blockRouter)
	.use('/api/report', reportRouter)
	.use('/api/background', backgroundRouter)
	.use('/api/sanity', sanityTest)
	.get('/api/stepTypes', async (_, res) => {
		try {
			const result = await mongo.showSteptypes();
			res.status(200)
				.json(result);
		} catch (error) {
			console.error(`ERROR: ${error}`);
			res.status(500)
				.json({ error });
		}
	})
	.get('/api', (_, res) => {
		res.sendFile('htmlresponse/apistandartresponse.html', { root: __dirname });
	});

module.exports = { app };
