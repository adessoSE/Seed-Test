const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const runReportRouter = require('./serverRouter/runReportRouter');
const githubRouter = require('./serverRouter/githubRouter');
const mongoRouter = require('./serverRouter/mongoRouter');

const app = express();

// Initialize the app.
const server = app.listen(process.env.PORT || 8080, () => {
  const { port } = server.address();
  console.log('App now running on port', port);
});

/**
 * API Description
 */
app
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use((_, __, next) => {
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
