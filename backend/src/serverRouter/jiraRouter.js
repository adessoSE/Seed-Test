const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const request = require('request');
const process = require('process');
const helper = require('../serverHelper');

const router = express.Router();
const unassignedAvatarLink = process.env.Unassigned_AVATAR_URL;
// router for all jira requests
router
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
    res.header('Access-Control-Allow-Credentials','true' );
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect");
    next();
  })
  .use((_, __, next) => {
    console.log('Time of jira request:', Date.now());
    next();
  });


router.post('/user/create/', (req, res) => {
  if (typeof req.user !== 'undefined' && typeof req.user._id !== 'undefined') {
    const { jiraAccountName } = req.body;
    const { jiraPassword } = req.body;
    const { jiraHost } = req.body;
    const auth = Buffer.from(`${jiraAccountName}:${jiraPassword}`).toString('base64');
    const cookieJar = request.jar();
    const options = {
      method: 'GET',
      url: `http://${jiraHost}/rest/api/2/issue/createmeta`,
      jar: cookieJar,
      qs: {
        type: 'page',
        title: 'title',
      },
      headers: {
        'cache-control': 'no-cache',
        Authorization: `Basic ${auth}`,
      },
    };
    request(options, (error) => {
      if (error) {
        res.status(500);
        throw new Error(error);
      }
      request(options, (error2) => {
        if (error2) {
          res.status(500);
          console.log(error);
          throw new Error(error);
        }
        helper.updateJira(req.user._id, req.body).then((result) => {
          res.status(200).json(result);
        });
      });
    });
  } else {
    res.status(401).json('User doesnt exist.');
  }
});
module.exports = router;
