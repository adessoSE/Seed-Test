// Install express server
const request = require('request')

if(!process.env.NODE_ENV){
  const dotenv = require('dotenv').config();
}

const express = require('express');
const path = require('path');
const app = express();
app.disable('x-powered-by');
const ngPath = path.join(__dirname, 'dist/cucumber-frontend');
const environment = '../frontend/src/environments/environment';

// Serve only the static files form the dist directory
app.use(express.static(ngPath));

app.get('/backendInfo', (req, res) => {
  res.json({ url: process.env.API_SERVER, clientId: process.env.GITHUB_CLIENT_ID, version: process.env.VERSION});
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(ngPath, 'index.html'));
});

// Start the app by listening on the default Heroku port
app.listen(process.env.PORT || environment.PORT || 4200, function () {
  const port = this.address().port;
  console.log('App now running on port', port);
});
