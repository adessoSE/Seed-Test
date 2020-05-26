const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const runReportRouter = require('./serverRouter/runReportRouter');
const githubRouter = require('./serverRouter/githubRouter');
const mongoRouter = require('./serverRouter/mongoRouter');
const jiraRouter = require('./serverRouter/jiraRouter');
const userRouter = require('./serverRouter/userRouter')

const mongo = require('./database/mongodatabase');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const app = express();
let stories = [];

// Initialize the app.
const server = app.listen(process.env.PORT || 8080, () => {
  const { port } = server.address();
  console.log('App now running on port', port);
});

// Handling response errors
function handleError(res, reason, statusMessage, code) {
  console.log(`ERROR: ${reason}`);
  res.status(code || 500).json({ error: statusMessage });
}

/**
 * API Description
 */
app
  .use(cors({origin: [
    process.env.FRONTEND_URL
  ], credentials: true}))
  .use(flash())
  .use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {httpOnly: false, 
      maxAge: 864000000,
      //secure: true,
      //sameSite: true
    },
  }))
  .use(passport.initialize())
  .use(passport.session())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use((_, __, next) => {
    console.log('Time:', Date.now());
    next();
  })
  .use('/api/run', runReportRouter)
  .use('/api/github', githubRouter)
  .use('/api/mongo', mongoRouter)
  .use('/api/jira', jiraRouter)
  .use('/api/user', userRouter)
  .get('/api', (_, res) => {
    res.sendFile('htmlresponse/apistandartresponse.html', { root: __dirname });
  });

module.exports = { app };
