require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { execSync } = require('child_process');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { chromium, firefox, webkit } = require('@playwright/test');
const scriptRouter = require('./serverRouter/scriptRouter');
const runReportRouter = require('./serverRouter/runReportRouter');
const githubRouter = require('./serverRouter/githubRouter');
const mongo = require('./database/DbServices');
const jiraRouter = require('./serverRouter/jiraRouter');
const userRouter = require('./serverRouter/userRouter');
const groupRouter = require('./serverRouter/groupRouter');
const workgroupsRouter = require('./serverRouter/workgroups');
const storyRouter = require('./serverRouter/storyRouter');
const blockRouter = require('./serverRouter/blockRouter');
const reportRouter = require('./serverRouter/reportRouter');
const backgroundRouter = require('./serverRouter/backgroundRouter');
const sanityTest = require('./serverRouter/sanityTest');
const logging = require('./logging');
require('./database/DbServices');

const app = express();
app.disable('x-powered-by');

async function checkAndInstallEdge() {
	// Extra Check für Edge wegen häufigen Unternehmensrichtlinien
	try {
		const edgeBrowser = await chromium.launch({ channel: 'msedge' });
		await edgeBrowser.close();
		console.log('✓ Microsoft Edge is available');
	} catch (error) {
		try {
			console.log(error, '\nMicrosoft Edge is not launchable, trying to install...');
			execSync('npx playwright install msedge --with-deps', { stdio: 'inherit' });
		} catch (edge_error) {
			console.log('Microsoft Edge not launchable nor installable, this probably is caused by corporate installation policies');
		}
	}
}
async function checkAndInstallGeneralBrowsers() {
	const browsers = [
		{ engine: firefox, name: 'Firefox' },
		{ engine: chromium, name: 'Chromium/Chrome' },
		{ engine: webkit, name: 'WebKit' }
	];

	try {
		// Prüfe Standard-Browser
		for (const browser of browsers) {
			const instance = await browser.engine.launch();
			await instance.close();
			console.log(`✓ ${browser.name} is available`);
		}
	} catch (error) {
		if (error.message.includes('Executable doesn')
		|| error.message.includes('Browser version')) {
			console.log('Browser version incompatible with Playwright version, reinstalling browsers...');
			execSync('npx playwright install chromium firefox webkit --with-deps', { stdio: 'inherit' });
		} else if (error.message.includes('browserType.launch')) {
			console.log('Installing missing Playwright browsers...');
			execSync('npx playwright install chromium firefox webkit --with-deps', { stdio: 'inherit' });
		} else throw error;
	}
}


checkAndInstallGeneralBrowsers();
checkAndInstallEdge();

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
