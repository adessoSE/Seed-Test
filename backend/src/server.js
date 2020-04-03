const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const runReportRouter = require('./serverRouter/runReportRouter');
const githubRouter = require('./serverRouter/githubRouter');
const mongoRouter = require('./serverRouter/mongoRouter');

const mongo = require('./database/mongodatabase');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const app = express();

const initializePassport = require('./passport-config');
initializePassport(passport, getUserByEmail, getUserById)

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

function getUserByEmail(email, callback){
  mongo.getUserByEmail(email, callback)
}

function getUserById(id, callback){
  mongo.getUserById(id, callback)
}

/**
 * API Description
 */
app
  .use(cors())
  .use(flash())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use((_, __, next) => {
  .use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }))
  .use(passport.initialize())
  .use(passport.session())
  .use((req, res, next) => {
    console.log('Time:', Date.now());
    next();
  })
  .use('/api/run', runReportRouter)
  .use('/api/github', githubRouter)
  .use('/api/mongo', mongoRouter)
  .get('/api', (_, res) => {
    res.sendFile('htmlresponse/apistandartresponse.html', { root: __dirname });
  });

module.exports = { app };
