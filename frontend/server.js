// Install express server
const request = require('request')

if(!process.env.NODE_ENV){
  const dotenv = require('dotenv').config();
}

const express = require('express');
const path = require('path');
const app = express();
const environment = '../frontend/src/environments/environment';

// Serve only the static files form the dist directory
app.use(express.static(`${__dirname}/dist/cucumber-frontend`));

app.get('/backendInfo', (req, res) => {
  res.json({ url: process.env.API_SERVER, clientId: process.env.GITHUB_CLIENT_ID});
});

app.get('/callback', (req, res) => {
  let code = req.query.code;
  const TOKEN_URL = 'https://github.com/login/oauth/access_token'
    request(
        {
            uri: TOKEN_URL,
            method: "POST",
            form: {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri:'http://localhost:4200/callback'
            },
        }, function(err, response, body){
            const accessToken = body.split("&")[0].split("=")[1];
            getData(res, req, accessToken);
        }
    )
});

const getData = (res, req, accessToken) => {
  request(
      {
          uri: `https://api.github.com/user?access_token=${accessToken}`,
          method:"GET",
          headers: {
              "User-Agent": "SampleOAuth",
          }
      }, 
      async function(err, response, body){
          body = await JSON.parse(body)
          body.githubToken = accessToken;
          findOrRegisterUser(res, body)
        }
  )
}


const findOrRegisterUser = (res, user) => {
  var apiServer = process.env.API_SERVER;
  request(
    {
        uri: apiServer + '/user/githubRegister',
        method:"POST",
        body: user,
        json: true
    }, 
    function(err, response, body){
        res.redirect('/login?login=' + user.login + '&id=' + user.id);
      }
)
}

app.get('/*', (req, res) => {
  res.sendFile(path.join(`${__dirname}/dist/cucumber-frontend/index.html`));
});

// Start the app by listening on the default Heroku port
app.listen(process.env.PORT || environment.PORT || 4200, function () {
  const port = this.address().port;
  console.log('App now running on port', port);
});
