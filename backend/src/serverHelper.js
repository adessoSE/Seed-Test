const { exec } = require('child_process');
const fs = require('fs');
const { XMLHttpRequest } = require('xmlhttprequest');
const path = require('path');
const request = require('request');
const reporter = require('cucumber-html-reporter');
const mongo = require('./database/mongodatabase');
const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');
const lodash = require('lodash')
const rootPath = path.normalize('features');
const featuresPath = path.normalize('features/');
const crypto = require('crypto');
const passport = require('passport');

const cryptoAlgorithm = 'aes-192-cbc'
const key = crypto.scryptSync(process.env.JIRA_SECRET, 'salt', 24)
const iv = Buffer.alloc(16,0);


// this is needed for the html report
const options = {
	theme: 'bootstrap',
	jsonFile: 'features/reporting.json',
	output: 'features/reporting_html.html',
	reportSuiteAsScenarios: true,
	launchReport: false,
	metadata: {
		'App Version': '0.3.2',
		'Test Environment': 'STAGING',
		GoogleChromeShiv: process.env.GOOGLE_CHROME_SHIM,
		Parallel: 'Scenarios',
		Executed: 'Remote'
	}
};

// Time after which the report is deleted in minutes
const reportDeletionTime = process.env.REPORT_DELETION_TIME || 5;

// adds content of each values to output
function getValues(values) {
	// TODO: TESTING HERE: excluding the first value
	let data = '';
	for (let i = 1; i < values.length; i++) data += `"${values[i]}"`;
	return data;
}

// Content in Background for FeatureFile
function getBackgroundSteps(steps) {
	let data = '';
	for (let i = 0; i < steps.length; i++) {
		if (i === 0) data += 'When ';
		else data += 'And ';
		if (steps[i].values[0] != null) data += `${steps[i].pre} "${steps[i].values[0]}" ${steps[i].mid}${getValues(steps[i].values)} \n`;
		else data += `${steps[i].pre} ${steps[i].mid}${getValues(steps[i].values)} \n`;
	}
	data += '\n';
	return data;
}

// Building Background-Content
function getBackgroundContent(background) {
	let data = 'Background: \n\n';
	// get stepDefinitions
	data += getBackgroundSteps(background.stepDefinitions.when);
	return data;
}

// First letter in string to upper case
function jsUcfirst(string) {
	return string.charAt(0)
		.toUpperCase() + string.slice(1);
}

// Building feature file step-content
function getSteps(steps, stepType) {
	let data = '';
	for (const step of steps) {
		data += `${jsUcfirst(stepType)} `;
		// TODO: If Given contains Background (Background>0): Add Background (method)
		if ((step.values[0]) != null && (step.values[0]) !== 'User') data += `${step.pre} "${step.values[0]}" ${step.mid}${getValues(step.values)} \n`;
		else if ((step.values[0]) === 'User') data += `${step.pre} "${step.values[0]}"\n`;
		else data += `${step.pre} ${step.mid}${getValues(step.values)} \n`;
	}
	return data;
}

// adds content of each values to output
function getExamples(steps) {
	let data = 'Examples:';
	for (let i = 0; i < steps.length; i++) {
		data += '\n | ';
		for (let k = 0; k < steps[i].values.length; k++) data += `${steps[i].values[k]} | `;
	}
	return `${data}\n`;
}

// Building feature file scenario-name-content
function getScenarioContent(scenarios, storyID) {
	let data = '';
	for (const scenario of scenarios) {
		// console.log(`Scenario ID: ${scenario.scenario_id}`);
		data += `@${storyID}_${scenario.scenario_id}\n`;
		// if there are examples
		if ((scenario.stepDefinitions.example.length) > 0) data += `Scenario Outline: ${scenario.name}\n\n`;
		else data += `Scenario: ${scenario.name}\n\n`;
		// Get Stepdefinitions
		if (scenario.stepDefinitions.given !== undefined) data += `${getSteps(scenario.stepDefinitions.given, Object.keys(scenario.stepDefinitions)[0])}\n`;
		if (scenario.stepDefinitions.when !== undefined) data += `${getSteps(scenario.stepDefinitions.when, Object.keys(scenario.stepDefinitions)[1])}\n`;
		if (scenario.stepDefinitions.then !== undefined) data += `${getSteps(scenario.stepDefinitions.then, Object.keys(scenario.stepDefinitions)[2])}\n`;
		if ((scenario.stepDefinitions.example.length) > 0) data += `${getExamples(scenario.stepDefinitions.example)}\n\n`;
	}
	return data;
}

// Building feature file story-name-content (feature file title)
function getFeatureContent(story) {
	let data = `Feature: ${story.title}\n\n`;

	// Get background
	if (story.background != null) data += getBackgroundContent(story.background);

	// Get scenarios
	data += getScenarioContent(story.scenarios, story.story_id);
	return data;
}

// Creates feature file
function writeFile(dir, selectedStory) {
	fs.writeFile(path.join(__dirname, '../features',
		`${cleanFileName(selectedStory.title)}.feature`), getFeatureContent(selectedStory), (err) => {
		if (err) throw err;
	});
}

async function updateJira(UserID, req) {
  password = encriptPassword(req.jiraPassword)
	const jira = {
		AccountName: req.jiraAccountName,
		Password: password,
		Host: req.jiraHost
	};
	const user = await mongo.getUserData(UserID);
	user.jira = jira;
	await mongo.updateUser(UserID, user);
	return 'Successful';
}

// Updates feature file based on story_id
async function updateFeatureFile(issueID) {
	const result = await mongo.getOneStory(issueID);
	if (result != null) writeFile('', result);
}

function execReport2(req, res, stories, mode, story, callback) {
  const reportTime = Date.now();
  const path1 = 'node_modules/.bin/cucumber-js';
  const path2 = `features/${cleanFileName(story.title)}.feature`;
  const reportName = req.user && req.user.github ? `${req.user.github.login}_${reportTime}`: `reporting_${reportTime}`;
  const path3 =`features/${reportName}.json`;

  let cmd;
  if (mode === 'feature') {
    cmd = `${path.normalize(path1)} ${path.normalize(path2)} --format json:${path.normalize(path3)}`;
  } else {
    cmd = `${path.normalize(path1)} ${path.normalize(path2)} --tags "@${req.params.issueID}_${req.params.scenarioID}" --format json:${path.normalize(path3)}`;
  }
  console.log(`Executing: ${cmd}`);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);

      callback(reportTime, story, req.params.scenarioID, reportName);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    callback(reportTime, story, req.params.scenarioID, reportName);
  });
}

async function execReport(req, res, stories, mode, callback) {
	try {
		const result = await mongo.getOneStory(parseInt(req.params.issueID, 10));
		execReport2(req, res, stories, mode, result, callback);
	} catch (error) {
		res.status(501)
			.send(error);
	}
}

function jiraProjects(user) {
	return new Promise((resolve) => {
		if (typeof user !== 'undefined' && typeof user.jira !== 'undefined' && user.jira !== null) {
      let { Host, AccountName, Password } = user.jira;
      Password = decryptPassword(Password)
			const auth = Buffer.from(`${AccountName}:${Password}`)
				.toString('base64');
			const cookieJar = request.jar();
			const reqoptions = {
				method: 'GET',
				url: `http://${Host}/rest/api/2/issue/createmeta`,
				jar: cookieJar,
				qs: {
					type: 'page',
					title: 'title'
				},
				headers: {
					'cache-control': 'no-cache',
					Authorization: `Basic ${auth}`
				}
			};
			request(reqoptions, () => {
				request(reqoptions, (error2, response2, body) => {
					let json = '';
					try {
						json = JSON.parse(body).projects;
					} catch (e) {
						console.warn('Jira Request did not work', e);
						json = {};
					}
					let names = [];
					if (Object.keys(json).length !== 0) {
						for (const repo of json) {
						    names.push(repo.name);
                        }
						names = names.map(value => ({
							value,
							source: 'jira'
						}));
						resolve(names);
					}
					resolve([]);
				});
			});
		} else resolve([]);
	});
}

function dbProjects(user) {
	return new Promise((resolve) => {
		if (typeof user !== 'undefined') {
			const { email } = user;
      const userId  = user._id;
			mongo.getRepository(userId).then((json) => {
				let names = [];
				if (Object.keys(json).length !== 0) {
					for (const repo of json) names.push(repo.name);
					names = names.map(value => ({
						value,
						source: 'db'
					}));
					resolve(names);
				}
				resolve([]);
			});
		} else resolve([]);
	});
}

function uniqueRepositories(repositories) {
	return repositories.filter((repo, index, self) => index === self.findIndex(t => (
		t.source === repo.source && t.value === repo.value
	)));
}


function setOptions(reportName) {
  let myOptions = lodash.cloneDeep(options)
  const OSName = process.platform;
  myOptions.metadata.Platform = OSName;
  myOptions.name = 'Seed-Test Report';
  myOptions.jsonFile =`features/${reportName}.json`;
  myOptions.output = `features/${reportName}.html`;
  return myOptions
}

function execRepositoryRequests(link, user, password) {
	return new Promise((resolve, reject) => {
		const xmlrequest = new XMLHttpRequest();
		// get Issues from GitHub
		xmlrequest.open('GET', link, true, user, password);
		xmlrequest.send();
		xmlrequest.onreadystatechange = function () {
			if (this.readyState === 4 && this.status === 200) {
				const data = JSON.parse(xmlrequest.responseText);
				let names = [];
				let index = 0;
				for (const repo of data) {
					const repoName = repo.full_name;
					names[index] = repoName;
					index++;
				}
				names = names.map(value => ({
					value,
					source: 'github'
				}));
				resolve(names);
			} else
			if (this.readyState === 4) reject(this.status);
		};
	});
}

function ownRepositories(githubName, token) {
  if(!githubName && !token) return new Promise((resolve, reject) => resolve([]))
  return execRepositoryRequests('https://api.github.com/user/repos?per_page=100', githubName, token);
}

function starredRepositories(githubName, token) {
  if(!githubName && !token) return new Promise((resolve, reject) => resolve([]))
  return execRepositoryRequests(`https://api.github.com/users/${githubName}/starred`, githubName, token);
}

async function fuseStoriesWithDb(story, issueId) {
	const result = await mongo.getOneStory(parseInt(issueId));
	if (result !== null) {
		story.scenarios = result.scenarios;
		story.background = result.background;
		story.lastTestPassed = result.lastTestPassed;
	} else {
		story.scenarios = [emptyScenario()];
		story.background = emptyBackground();
  }
  story.story_id = parseInt(story.story_id);
    if (story.repo_type !== "jira") {
        story.issue_number = parseInt(story.issue_number);
    }
	mongo.upsertEntry(story.story_id, story);
	// Create & Update Feature Files
	writeFile('', story);
	return story;
}


function deleteReport(jsonReport) {
  const report = path.normalize(`${featuresPath}${jsonReport}`);
  fs.unlink(report, (err) => {
    if (err) console.log(err);
    else {
      console.log(`${report} json deleted.`);
    }
  });
}


function runReport(req, res, stories, mode) {
  execReport(req, res, stories, mode, (reportTime, story, scenarioID, reportName) => {
    setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.json`);
    setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.html`);
    let reportOptions = setOptions(reportName);
    reporter.generate(reportOptions);
    res.sendFile(`/${reportName}.html`, {root: rootPath});
    //const root = HTMLParser.parse(`/reporting_html_${reportTime}.html`)
    let testStatus = false;
    fs.readFile(`./features/${reportName}.json`, "utf8", function (err, data) {
      let json = JSON.parse(data)
      uploadReport(reportName, reportTime, json, reportOptions);
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let scenario = story.scenarios.find((s) => s.scenario_id == scenarioID)
      let scenariosTested = {passed: 0, failed: 0}
      json[0].elements.forEach((d) => {
        let scenarioPassed = 0;
        let scenarioFailed = 0;
        let scenarioSkipped = 0;
        d.steps.forEach((s, i) => {
          switch (s.result.status) {
            case 'passed':
              passed++;
              scenarioPassed++;
              break;
            case 'failed':
              failed++;
              scenarioFailed++;
              break;
            case 'skipped':
              skipped++;
              scenarioSkipped++;
              break;
            default:
              console.log('Status default: ' + s.result.status);
          }
        })
        if(testPassed(scenarioFailed, scenarioPassed)){
          scenariosTested.passed += 1;
        } else {
          scenariosTested.failed += 1;
        }
        story = updateScenarioTestStatus(testPassed(scenarioFailed, scenarioPassed), d.tags[0].name, story)
      })

      testStatus = testPassed(failed, passed);
      if(req.query.source == 'github' && req.user && req.user.github){
        let comment = renderComment(req, passed, failed, skipped, testStatus, scenariosTested, reportTime, story, scenario, mode, reportName);
        let githubValue = req.query.value.split('/')
        let githubName = githubValue[0];
        let githubRepo = githubValue[1];
        postComment(story.issue_number, comment, githubName, githubRepo, req.user.github.githubToken);

        if(mode == 'feature'){
          updateLabel(testStatus, githubName, githubRepo, req.user.github.githubToken, story.issue_number)
        }
      }

      if (scenarioID && scenario) {
        scenario.lastTestPassed = testStatus;
        mongo.updateScenario(story.story_id, scenario, (result) => {
        })
      } else if (!scenarioID) {
        story.lastTestPassed = testStatus;
        mongo.updateStory(story.story_id, story)
      }
    });
  });
}

function updateLabel(testStatus, githubName, githubRepo, githubToken, issueNumber){
  let removeLabel;
  let addedLabel;
  if(testStatus){
    removeLabel = 'Seed-Test Test Fail :x:'
    addedLabel = 'Seed-Test Test Success :white_check_mark:'
  }else {
    removeLabel = 'Seed-Test Test Success :white_check_mark:'
    addedLabel = 'Seed-Test Test Fail :x:'
  }
  removeLabelOfIssue(githubName, githubRepo, githubToken, issueNumber, removeLabel)
  addLabelToIssue(githubName, githubRepo, githubToken, issueNumber, addedLabel)
}

function testPassed(failed, passed) {
	return failed <= 0 && passed >= 1;
}


async function uploadReport(reportName, reportTime, jsonReport, options){
  let report = {reportTime, reportName, options, jsonReport: jsonReport}
  let result = await mongo.uploadReport(report);
}

async function createReport(res, reportName){
  let report = await mongo.getReport(reportName);
  fs.writeFileSync(`./features/${reportName}.json`, JSON.stringify(report.jsonReport), (err) => { console.log('Error:', err)});
  reporter.generate(report.options);
  setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.json`);
  setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.html`);
  res.sendFile(`/${reportName}.html`, {root: rootPath});
}

function updateScenarioTestStatus(testPassed, scenarioTagName, story) {
	const scenarioId = parseInt(scenarioTagName.split('_')[1], 10);
	const scenario = story.scenarios.find(scenario => scenario.scenario_id === scenarioId);
	if (scenario) {
		const index = story.scenarios.indexOf(scenario);
		scenario.lastTestPassed = testPassed;
		story.scenarios[index] = scenario;
	}
	return story;
}

function getJiraIssues(user, projectKey){
  if (typeof user !== 'undefined' && typeof user.jira !== 'undefined' && projectKey !== 'null') {
    const {Host} = user.jira;
    const {AccountName} = user.jira;
    const {Password} = user.jira;
    const auth = Buffer.from(`${AccountName}:${Password}`).toString('base64');
    const cookieJar = request.jar();
    const tmpStories = [];
    const options = {
      method: 'GET',
      url: `http://${Host}/rest/api/2/search?jql=project=${projectKey}`,
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
        return error;
      }
      request(options, (error2, response2, body) => {
        if (error2) {
          return error;
        }
        const json = JSON.parse(body).issues;
        for (const issue of json) {
            if (issue.fields.labels.includes("Seed-Test")){
                const story = {
                    story_id: issue.id,
                    title: issue.fields.summary,
                    body: issue.fields.description,
                    state: issue.fields.status.name,
                    issue_number: issue.key,
                };
                if (issue.fields.assignee !== null) { // skip in case of "unassigned"
                    story.assignee = issue.fields.assignee.name;
                    story.assignee_avatar_url = issue.fields.assignee.avatarUrls['48x48'];
                } else {
                    story.assignee = 'unassigned';
                    story.assignee_avatar_url = null;
                }
                console.log(story)
                tmpStories.push(fuseStoriesWithDb(story, issue.id));
            }
        }
        return tmpStories;
      });
    });
  }
}

function renderComment(req, stepsPassed, stepsFailed, stepsSkipped, testStatus, scenariosTested, reportTime, story, scenario, mode, reportName){
  let comment = '';
  let testPassedIcon = testStatus ? ':white_check_mark:' : ':x:';
  let frontendUrl = process.env.FRONTEND_URL;
  let reportUrl = `${frontendUrl}/report/${reportName}`;
  if(mode == 'scenario'){
    comment =  `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Scenario: "${scenario.name}"\n### Test passed: ${testStatus}${testPassedIcon}\nSteps passed: ${stepsPassed} :white_check_mark:\nSteps failed: ${stepsFailed} :x:\nSteps skipped: ${stepsSkipped} :warning:\nLink to the official report: [Report](${reportUrl})`;
  } else{
    comment =  `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Story: "${story.title}"\n### Test passed: ${testStatus}${testPassedIcon}\nScenarios passed: ${scenariosTested.passed} :white_check_mark:\nScenarios failed: ${scenariosTested.failed} :x:\nLink to the official report: [Report](${reportUrl})`;
  }
  return comment;
}

function postComment(issueNumber, comment, githubName, githubRepo, password){
  let link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/comments`

  let body = { body: comment};

  const request = new XMLHttpRequest();
  request.open('POST', link, true, githubName, password);
  request.send(JSON.stringify(body));
  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      const data = JSON.parse(request.responseText);
    }
  };
}

function addLabelToIssue(githubName, githubRepo, password, issueNumber, label){

  let link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels`

  let body = { labels: [label]};

  const request = new XMLHttpRequest();
  request.open('POST', link, true, githubName, password);
  request.send(JSON.stringify(body));
  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      const data = JSON.parse(request.responseText);
    }
  };
}

function removeLabelOfIssue(githubName, githubRepo, password, issueNumber, label){

  let link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels/${label}`


  const request = new XMLHttpRequest();
  request.open('DELETE', link, true, githubName, password);
  request.send();
  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      const data = JSON.parse(request.responseText);
    }
  };
}

const getGithubData = (res, req, accessToken) => {
  console.log('accessToken', accessToken)
  request(
    {
        uri: `https://api.github.com/user`,
        method:"GET",
        headers: {
            "User-Agent": "SampleOAuth",
            "Authorization": `Token ${accessToken}`
        }
    },
    async function(err, response, body){
        req.body = await JSON.parse(body)
        req.body.githubToken = accessToken;
        console.log('body', body)
        try{
          await mongo.findOrRegister(req.body)
          console.log('after find or register')
          passport.authenticate('github-local', function (error, user, info) {
                    if(error){
                      res.json({error: 'Authentication Error'})
                    } else if(!user){
                      res.json({error: 'Authentication Error'})
                    }
                    req.logIn(user, async function(err){
                        if(err){
                            console.log('login')
                            res.json({error: 'Login Error'})
                        }else {
                          console.log('redirect', process.env.FRONTEND_URL + '/login?github=success')
                          res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL );
		                      res.header('Access-Control-Allow-Credentials', 'true');
		                      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
                          res.redirect(process.env.FRONTEND_URL + '/login?github=success')
                          res.json({login: user.github.login, id: user.github.id})
                        }
			
                    });
                })(req,res);
      }catch(error){
          console.log('getGithubData error:', error)
          res.sendStatus(400)
      }
    }
  )
}

function encriptPassword(text){
	const cipher = crypto.createCipheriv(cryptoAlgorithm, key, iv);
	let encrypted = cipher.update(text, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return encrypted
};


function decryptPassword(encrypted){
	const decipher = crypto.createDecipheriv(cryptoAlgorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted
};


function cleanFileName(filename){
  return filename.replace(/[^a-z0-9]/gi, '_')
}


module.exports = {
  uniqueRepositories,
  jiraProjects,
  getJiraIssues,
  getGithubData,
  createReport,
  decryptPassword,
  encriptPassword,
  cleanFileName,
  options,
  deleteReport,
  execRepositoryRequests,
  setOptions,
  execReport,
  getFeatureContent,
  getScenarioContent,
  writeFile,
  ownRepositories,
  fuseStoriesWithDb,
  updateJira,
	getExamples,
	getSteps,
	jsUcfirst,
	getBackgroundContent,
	getBackgroundSteps,
	getValues,
	updateFeatureFile,
	runReport,
	starredRepositories,
	dbProjects
};
