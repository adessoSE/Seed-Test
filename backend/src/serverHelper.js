const { exec, execFile } = require('child_process');
const fs = require('fs');
const { XMLHttpRequest } = require('xmlhttprequest');
const path = require('path');
const request = require('request');
const reporter = require('cucumber-html-reporter');
const lodash = require('lodash');
const crypto = require('crypto');
const passport = require('passport');
const mongo = require('./database/mongodatabase');
const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');

const rootPath = path.normalize('features');
const featuresPath = path.normalize('features/');

const cryptoAlgorithm = 'aes-192-cbc';
const key = crypto.scryptSync(process.env.JIRA_SECRET, 'salt', 24);
const iv = Buffer.alloc(16, 0);


// this is needed for the html report
const options = {
  theme: 'bootstrap',
  jsonFile: 'features/reporting.json',
  output: 'features/reporting_html.html',
  reportSuiteAsScenarios: true,
  launchReport: false,
  storeScreenshots: false,
  screenshotsDirectory: 'features/screenshots/',
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
	for (let i = 1; i < values.length; i++) data += `'${values[i]}'`;
	return data;
}

// Content in Background for FeatureFile
function getBackgroundSteps(steps) {
	let data = '';
	for (let i = 0; i < steps.length; i++) {
		if (steps[i].deactivated) continue;
		if (i === 0) data += 'When ';
		else data += 'And ';
		if (steps[i].values[0] != null) data += `${steps[i].pre} '${steps[i].values[0]}' ${steps[i].mid}${getValues(steps[i].values)} \n`;
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
		if (step.deactivated) continue;
		data += `${jsUcfirst(stepType)} `;
		// TODO: If Given contains Background (Background>0): Add Background (method)
		if ((step.values[0]) != null && (step.values[0]) !== 'User') data += `${step.pre} '${step.values[0]}' ${step.mid}${getValues(step.values)} \n`;
		else if ((step.values[0]) === 'User') data += `${step.pre} '${step.values[0]}'\n`;
		else data += `${step.pre} ${step.mid}${getValues(step.values)} \n`;
	}
	return data;
}

// adds content of each values to output
function getExamples(steps) {
	let data = 'Examples:';
	for (let i = 0; i < steps.length; i++) {
		if (steps[i].deactivated) continue;
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

function getScenarioContentForComplete(scenarios, storyID) {
	let data = '';
	data += `@${storyID}_${scenarios[0].scenario_id}\n`;
	data += `Scenario: ${scenarios[0].name}\n\n`;
	for (const scenario of scenarios) {
	  // if there are examples
	  // if ((scenario.stepDefinitions.example.length) > 0) data += `Scenario Outline: ${scenario.name}\n\n`;
	  
	  // Get Stepdefinitions
	  if (scenario.stepDefinitions.given !== undefined) data += `${getSteps(scenario.stepDefinitions.given, Object.keys(scenario.stepDefinitions)[0])}\n`;
	  if (scenario.stepDefinitions.when !== undefined) data += `${getSteps(scenario.stepDefinitions.when, Object.keys(scenario.stepDefinitions)[1])}\n`;
	  if (scenario.stepDefinitions.then !== undefined) data += `${getSteps(scenario.stepDefinitions.then, Object.keys(scenario.stepDefinitions)[2])}\n`;
	  if ((scenario.stepDefinitions.example.length) > 0) data += `${getExamples(scenario.stepDefinitions.example)}\n\n`;
	}
	return data;
  }

// Building feature file story-name-content (feature file title)
function getFeatureContent(story, status) {
	let data = `Feature: ${story.title}\n\n`;

	// Get background
	if (story.background != null) data += getBackgroundContent(story.background);

	// Get scenarios
	if (status === "single") data += getScenarioContent(story.scenarios, story._id);
	if (status === "complete") data += getScenarioContentForComplete(story.scenarios, story._id);
	return data;
}

// Creates feature file
function writeFile(dir, selectedStory) {
	fs.writeFile(path.join(__dirname, '../features',
		`${cleanFileName(selectedStory.title)}.feature`), getFeatureContent(selectedStory, "single"), (err) => {
		if (err) throw err;
	});
	fs.writeFile(path.join(__dirname, '../features',
		`${cleanFileName(selectedStory.title)}_complete.feature`), getFeatureContent(selectedStory,"complete"), (err) => {
		if (err) throw err;
	});
}

function encriptPassword(text) {
	const cipher = crypto.createCipheriv(cryptoAlgorithm, key, iv);
	let encrypted = cipher.update(text, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return encrypted;
}
function decryptPassword(encrypted) {
	const decipher = crypto.createDecipheriv(cryptoAlgorithm, key, iv);
	let decrypted = decipher.update(encrypted, 'hex', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
}
function cleanFileName(filename) {
	return filename.replace(/[^a-z0-9]/gi, '_');
}

async function updateJira(UserID, req) {
	const password = encriptPassword(req.jiraPassword);
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

// Updates feature file based on _id
async function updateFeatureFile(issueID, storySource) {
	const result = await mongo.getOneStory(issueID, storySource);
	if (result != null) writeFile('', result);
}

function execReport2(req, res, stories, mode, story, params, callback) {
	let parameters = {}
	if (mode == 'scenario'){
		let scenario = story.scenarios.find(elem => elem.scenario_id == req.params.scenarioID)
		if (!scenario.stepWaitTime) scenario.stepWaitTime = 0
		if (!scenario.browser) scenario.browser = 'chrome'
		if (!scenario.daisyAutoLogout) scenario.daisyAutoLogout = false
		if (scenario.stepDefinitions.example.length <= 0){
			parameters = {scenarios: [{browser: scenario.browser, waitTime: scenario.stepWaitTime, daisyAutoLogout: scenario.daisyAutoLogout}]}
		}else{
			parameters = {scenarios: []}
			scenario.stepDefinitions.example.forEach((examples, index) => {
				if (index > 0){
					parameters.scenarios.push({browser: scenario.browser, waitTime: scenario.stepWaitTime, daisyAutoLogout: scenario.daisyAutoLogout})
				}
			})
		}
	}else{
		parameters = {scenarios: []}
		if (!story.oneDriver) story.oneDriver = false
		story.scenarios.forEach(scenario => {
			if (!scenario.stepWaitTime) scenario.stepWaitTime = 0
			if (!scenario.browser) scenario.browser = 'chrome'
			if (!scenario.daisyAutoLogout) scenario.daisyAutoLogout = false
			if (scenario.stepDefinitions.example.length <= 0){
				parameters.scenarios.push({browser: scenario.browser, waitTime: scenario.stepWaitTime, daisyAutoLogout: scenario.daisyAutoLogout, oneDriver: story.oneDriver})
			}else{
				scenario.stepDefinitions.example.forEach((examples, index) => {
					if (index > 0){
						parameters.scenarios.push({browser: scenario.browser, waitTime: scenario.stepWaitTime, daisyAutoLogout: scenario.daisyAutoLogout, oneDriver: story.oneDriver})
					}
				})
			}
		})
	}
	
	const reportTime = Date.now();
	const path1 = 'node_modules/.bin/cucumber-js';
	const path2 = `features/${cleanFileName(story.title)}.feature`;
	const reportName = req.user && req.user.github ? `${req.user.github.login}_${reportTime}` : `reporting_${reportTime}`;
	const path3 = `features/${reportName}.json`;
	let jsParam = JSON.stringify(parameters)
	let worldParam = ''
	for (let i = 0; i < jsParam.length; i++){
		if (jsParam[i] == '"'){
			worldParam += '\\\"'

		} else {
			worldParam += jsParam[i]
		}
	}
	console.log('worldParam', worldParam)

	let cmd;
	if (mode === 'feature') cmd = `${path.normalize(path1)} ${path.normalize(path2)} --format json:${path.normalize(path3)} --world-parameters ${worldParam}`;

	else cmd = `${path.normalize(path1)} ${path.normalize(path2)} --tags "@${req.params.issueID}_${req.params.scenarioID}" --format json:${path.normalize(path3)} --world-parameters ${worldParam}`;


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

async function execReport(req, res, stories, mode, parameters, callback) {
	try {
		const story = await mongo.getOneStory(req.params.issueID, req.params.storySource);
		// console.log('DAISYAUTOLOGOUT');
		// console.log(typeof (story.daisyAutoLogout));
		// // does not Fail if "daisyAutoLogout" is undefined
		// if (story.daisyAutoLogout) process.env.DAISY_AUTO_LOGOUT = story.daisyAutoLogout;
		//  else process.env.DAISY_AUTO_LOGOUT = false;
		execReport2(req, res, stories, mode, story, parameters, callback);
	} catch (error) {
		res.status(404)
			.send(error);
	}
}

async function jiraProjects(user) {
  return new Promise((resolve) => {
	try{
		if (typeof user !== 'undefined' && typeof user.jira !== 'undefined' && user.jira !== null) {
			  let { Host, AccountName, Password } = user.jira;
			  Password = decryptPassword(Password)
			  const auth = Buffer.from(`${AccountName}:${Password}`)
				.toString('base64');
			  const source = 'jira';
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
			  request(reqoptions, async () => {
				request(reqoptions, async (error2, response2, body) => {
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
					  let result = await mongo.createJiraRepoIfNonenExists(repo.name, source)
					  names.push({name: repo.name, _id: result});
					}
					names = names.map(value => ({
					  _id: value._id,
					  value: value.name,
					  source
					}));
					resolve(names);
				  }
				  resolve([]);
				});
			  });
		} else {
			resolve([]);
		}	
	}catch(e){
		resolve([]);
	}
  });
}

function dbProjects(user) {
	return new Promise((resolve) => {
	  if (typeof user !== 'undefined') {
		const userId = user._id;
		mongo.getRepository(userId).then((json) => {
		  let projects = [];
		  if (Object.keys(json).length !== 0) {
			for (const repo of json) {
			  if (repo.repoType === "db"){
				let proj = {
				  _id: repo._id,
				  value: repo.repoName,
				  source: repo.repoType,
				  canEdit: repo.canEdit
				}
				projects.push(proj)
			  } 
			}
			resolve(projects);
		  }
		  resolve([]);
		});
	  } else{
		resolve([]);
	  } 
	});
  }

function uniqueRepositories(repositories) {
  return repositories.filter((repo, index, self) => index === self.findIndex(t => (
    t._id === repo._id
  )));
}


function setOptions(reportName) {
	const myOptions = lodash.cloneDeep(options);
	myOptions.metadata.Platform = process.platform;
	myOptions.name = 'Seed-Test Report';
	myOptions.jsonFile = `features/${reportName}.json`;
	myOptions.output = `features/${reportName}.html`;
	return myOptions;
}

async function execRepositoryRequests(link, user, password, ownerId, githubId) {
	return new Promise((resolve, reject) => {
	  const xmlrequest = new XMLHttpRequest();
	  // get Issues from GitHub
	  xmlrequest.open('GET', link, true, user, password);
	  xmlrequest.send();
	  xmlrequest.onreadystatechange = async function () {
		if (this.readyState === 4 && this.status === 200) {
		  const data = JSON.parse(xmlrequest.responseText);
		  let projects = [];
		  for (const repo of data) {
			let mongoRepoId = await mongo.createGitOwnerRepoIfNonenExists(ownerId, githubId, repo.owner.id, repo.full_name, "github")
			const repoName = repo.full_name;
			let proj = {
			  _id: mongoRepoId,
			  value: repoName,
			  source: 'github'
			}
			projects.push(proj)
		  }
		  resolve(projects);
		} else
		  if (this.readyState === 4) reject(this.status);
	  };
	});
}

function ownRepositories(ownerId, githubId, githubName, token) {
	if (!githubName && !token) return Promise.resolve([]);
	return execRepositoryRequests('https://api.github.com/user/repos?per_page=100', githubName, token, ownerId, githubId);
}

function starredRepositories(ownerId, githubId, githubName, token) {
	if (!githubName && !token) return Promise.resolve([]);
	return execRepositoryRequests(`https://api.github.com/users/${githubName}/starred`, githubName, token, ownerId, githubId);
}

async function fuseStoriesWithDb(story, issueId) {
	const result = await mongo.getOneStoryByStoryId(parseInt(issueId), story.storySource);
	if (result !== null) {
		story.scenarios = result.scenarios;
		story.background = result.background;
		story.lastTestPassed = result.lastTestPassed;
	} else {
		story.scenarios = [emptyScenario()];
		story.background = emptyBackground();
	}
	story.story_id = parseInt(story.story_id);
	if (story.storySource !== 'jira') story.issue_number = parseInt(story.issue_number);

	const finalStory = await mongo.upsertEntry(story.story_id, story, story.storySource);
	story._id = finalStory._id;
	// Create & Update Feature Files
	writeFile('', story);
	return story;
}


function deleteReport(jsonReport) {
	const report = path.normalize(`${featuresPath}${jsonReport}`);
	fs.unlink(report, (err) => {
		if (err) console.log(err);
		else console.log(`${report} json deleted.`);
	});
}


async function getReportHistory(storyId){
	return await mongo.getTestReports(storyId);
}

async function uploadReport(report, storyId, scenarioID) {
	let uploadedReport = await mongo.uploadReport(report);
	await deleteOldReports(storyId, scenarioID);
	return uploadedReport;
}

function testPassed(failed, passed) {
	return failed <= 0 && passed >= 1;
}

async function createReport(res, reportName) {
	const report = await mongo.getReport(reportName);
	const reportName2 = `features/${reportName}.json`;
	const resolvedPath = path.resolve(reportName2);

	fs.writeFileSync(resolvedPath, JSON.stringify(report.jsonReport),
		(err) => { console.log('Error:', err); });
	//console.log('report options', report)
	reporter.generate(report.reportOptions);
	setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.json`);
	setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.html`);
	res.sendFile(`/${reportName}.html`, { root: rootPath });
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

function renderComment(req, stepsPassed, stepsFailed, stepsSkipped, testStatus, scenariosTested, reportTime, story, scenario, mode, reportName) {
	let comment = '';
	const testPassedIcon = testStatus ? ':white_check_mark:' : ':x:';
	const frontendUrl = process.env.FRONTEND_URL;
	const reportUrl = `${frontendUrl}/report/${reportName}`;
	if (mode == 'scenario') comment = `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Scenario: "${scenario.name}"\n### Test passed: ${testStatus}${testPassedIcon}\nSteps passed: ${stepsPassed} :white_check_mark:\nSteps failed: ${stepsFailed} :x:\nSteps skipped: ${stepsSkipped} :warning:\nLink to the official report: [Report](${reportUrl})`;
	 else comment = `# Test Result ${new Date(reportTime).toLocaleString()}\n## Tested Story: "${story.title}"\n### Test passed: ${testStatus}${testPassedIcon}\nScenarios passed: ${scenariosTested.passed} :white_check_mark:\nScenarios failed: ${scenariosTested.failed} :x:\nLink to the official report: [Report](${reportUrl})`;

	return comment;
}


function postComment(issueNumber, comment, githubName, githubRepo, password) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/comments`;
	const body = { body: comment };
	const request = new XMLHttpRequest();
	request.open('POST', link, true, githubName, password);
	request.send(JSON.stringify(body));
	request.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			const data = JSON.parse(request.responseText);
		}
	};
}


function addLabelToIssue(githubName, githubRepo, password, issueNumber, label) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels`;
	const body = { labels: [label] };
	const request = new XMLHttpRequest();
	request.open('POST', link, true, githubName, password);
	request.send(JSON.stringify(body));
	request.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			const data = JSON.parse(request.responseText);
		}
	};
}

function removeLabelOfIssue(githubName, githubRepo, password, issueNumber, label) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels/${label}`;
	const request = new XMLHttpRequest();
	request.open('DELETE', link, true, githubName, password);
	request.send();
	request.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			const data = JSON.parse(request.responseText);
		}
	};
}

function updateLabel(testStatus, githubName, githubRepo, githubToken, issueNumber) {
	let removeLabel;
	let addedLabel;
	if (testStatus) {
		removeLabel = 'Seed-Test Test Fail :x:';
		addedLabel = 'Seed-Test Test Success :white_check_mark:';
	} else {
		removeLabel = 'Seed-Test Test Success :white_check_mark:';
		addedLabel = 'Seed-Test Test Fail :x:';
	}
	removeLabelOfIssue(githubName, githubRepo, githubToken, issueNumber, removeLabel);
	addLabelToIssue(githubName, githubRepo, githubToken, issueNumber, addedLabel);
}

const getGithubData = (res, req, accessToken) => {
  request(
    {
      uri: `https://api.github.com/user?access_token=${accessToken}`,
      method: "GET",
      headers: {
        "User-Agent": "SampleOAuth",
        "Authorization": `Token ${accessToken}`
      }
    },
    async function(err, response, body){
      req.body = await JSON.parse(body)
      req.body.githubToken = accessToken;
      try{
        await mongo.findOrRegister(req.body)
        passport.authenticate('github-local', function (error, user, info) {
                  console.log("Der User in authenticate", JSON.stringify(user))
                  if(error){
                    res.json({error: 'Authentication Error'})
                  } else if(!user){
                    res.json({error: 'Authentication Error'})
                  }
                  req.logIn(user, async function(err){
                      if(err){
                          res.json({error: 'Login Error'})
                      }else {
                        res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL );
		                    res.header('Access-Control-Allow-Credentials', 'true');
		                    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
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

function encriptPassword(text) {
  const cipher = crypto.createCipheriv(cryptoAlgorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted
};


function runReport(req, res, stories, mode, parameters) {
	execReport(req, res, stories, mode, parameters, (reportTime, story,
		scenarioID, reportName) => {
		setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.json`);
		setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.html`);
		const reportOptions = setOptions(reportName);
		reporter.generate(reportOptions);

		//res.sendFile(`/${reportName}.html`, { root: rootPath });
		// const root = HTMLParser.parse(`/reporting_html_${reportTime}.html`)
		let testStatus = false;
		try {
			fs.readFile(`./features/${reportName}.json`, 'utf8', async (err, data) => {
				const json = JSON.parse(data);
				const scenario = story.scenarios.find(s => s.scenario_id == scenarioID);

				let passed = 0;
				let failed = 0;
				let skipped = 0;
				const scenariosTested = { passed: 0, failed: 0 };
				try {
					json[0].elements.forEach((d) => {
						let scenarioPassed = 0;
						let scenarioFailed = 0;
						d.steps.forEach((s) => {
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
									break;
								default:
									console.log(`Status default: ${s.result.status}`);
							}
						});
						if (testPassed(scenarioFailed, scenarioPassed)) scenariosTested.passed += 1;
						else scenariosTested.failed += 1;
						story = updateScenarioTestStatus(testPassed(scenarioFailed, scenarioPassed),
							d.tags[0].name, story);
					});
				} catch (error) {
					console.log('json element in fs runReport', error);
				}


				testStatus = testPassed(failed, passed);
				console.log('storyId', story._id)
				const report = {
					reportTime, reportName, reportOptions, jsonReport: json, storyId: story._id, mode, scenarioId: scenarioID, testStatus
				};

				let uploadedReport = await uploadReport(report, story._id, scenarioID);
				fs.readFile(`./features/${reportName}.html`, 'utf8',(err, data) => {
					res.json({htmlFile: data, reportId: uploadedReport.ops[0]._id})
				})
				if (req.params.storySource === 'github' && req.user && req.user.github) {
					const comment = renderComment(req, passed, failed, skipped, testStatus, scenariosTested,
						reportTime, story, scenario, mode, reportName);
					const githubValue = parameters.repository.split('/');
					const githubName = githubValue[0];
					const githubRepo = githubValue[1];
					postComment(story.issue_number, comment, githubName, githubRepo,
						req.user.github.githubToken);
					if (mode === 'feature') updateLabel(testStatus, githubName, githubRepo, req.user.github.githubToken, story.issue_number);
				}
				if (scenarioID && scenario) {
					scenario.lastTestPassed = testStatus;
					mongo.updateScenario(story._id, story.storySource, scenario, () => {
						// console.log()
					});
				} else if (!scenarioID) {
					story.lastTestPassed = testStatus;
					mongo.updateStory(story);
				}
			});
		} catch (error) {
			console.log(`fs readfile error for file ./features/${reportName}.json`);
		}
	});
}

async function deleteOldReports(storyId, scenarioID){
	let keepReportAmount = process.env.MAX_SAVED_REPORTS;
	let historyStory = await getReportHistory(storyId);
	let historyScenario = JSON.parse(JSON.stringify(historyStory))
	historyStory = historyStory.filter(element =>  element.mode =='feature')
	historyScenario = historyScenario.filter(element => element.mode =='scenario')

	historyStory.sort((a, b) => a.reportTime < b.reportTime)
	historyStory = historyStory.filter((elem) => !elem.isSaved)
	historyStory.splice(0, keepReportAmount)
	historyStory.forEach(element => {
		mongo.deleteReport(element._id)
	})

	historyScenario.sort((a, b) => a.reportTime < b.reportTime)
	historyScenario = historyScenario.filter((elem) => !elem.isSaved && parseInt(elem.scenarioId) == scenarioID)
	historyScenario.splice(0, keepReportAmount)
	historyScenario.forEach(element => {
		mongo.deleteReport(element._id)
	})
}

module.exports = {
	deleteOldReports,
	getReportHistory,
	uniqueRepositories,
	jiraProjects,
	getGithubData,
	createReport,
	decryptPassword,
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