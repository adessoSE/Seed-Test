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
  .use((_, __, next) => {
    console.log('Time of jira request:', Date.now());
    next();
  });
// Gets all possible issues from project
router.get('/issues/:hostServer/:projectKey', (req, res) => {
  console.log(req);
  const { hostServer } = req.params;
  const { projectKey } = req.params;
  const username = 'admin';
  const password = 'admin';
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const cookieJar = request.jar();
  const tmpStories = [];
  const options = {
    method: 'GET',
    url: `http://${hostServer}/rest/api/2/search?jql=project=${projectKey}`,
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
      res.status(500).json(error);
      throw new Error(error);
    }
    request(options, (error2, response2, body) => {
      if (error2) {
        res.status(500).json(error);
        throw new Error(error);
      }
      const json = JSON.parse(body).issues;
      for (const issue of json) {
        const story = {
          story_id: issue.id,
          title: issue.fields.summary,
          body: issue.fields.description,
          state: issue.fields.status.name,
          issue_number: issue.id,
        };
        if (issue.fields.assignee !== null) { // skip in case of "unassigned"
          story.assignee = issue.fields.assignee.name;
          story.assignee_avatar_url = issue.fields.assignee.avatarUrls['48x48'];
        } else {
          story.assignee = 'unassigned';
          story.assignee_avatar_url = unassignedAvatarLink;
        }
        tmpStories.push(helper.fuseGitWithDb(story, issue.id));
      }
      Promise.all(tmpStories).then((results) => {
        res.status(200).json(results);
        // let stories = results; // need this to clear promises from the Story List
      }).catch((e) => {
        console.log(e);
      });
    });
  });
});
// gets all project from user
router.get('/projects/:hostServer', (req, res) => {
  const { hostServer } = req.body;
  const { username } = req.body;
  const { password } = req.body;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const cookieJar = request.jar();
  const options = {
    method: 'GET',
    url: `http://${hostServer}/rest/api/2/issue/createmeta`,
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
      res.status(500).json(error);
      throw new Error(error);
    }
    request(options, (error2, response2, body) => {
      if (error2) {
        res.status(500).json(error);
        throw new Error(error);
      }
      console.log(body);
      res.status(200).json(body);
    });
  });
});

router.post('/user/create/', (req, res) => {
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
      helper.updateJira(req.body).then((result) => {
        res.status(200).json(result);
      });
    });
  });
});
module.exports = router;
