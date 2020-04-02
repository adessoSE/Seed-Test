const { exec } = require('child_process');
const fs = require('fs');
const { XMLHttpRequest } = require('xmlhttprequest');
const path = require('path');
const reporter = require('cucumber-html-reporter');
const mongo = require('./database/mongodatabase');
const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');
const rootPath = path.normalize('features');
const featuresPath = path.normalize('features/');

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
    Executed: 'Remote',
  },
};

// Time after which the report is deleted in minutes
const reportDeletionTime = process.env.REPORT_DELETION_TIME || 5;


// only displays mid text and additional space if length not null
// function midNotEmpty(values) {
//  console.log('midNotEmpty: ' + JSON.stringify(values))
//  if (values.length === 0) {
//    return '';
//  }
//  return `${values} `;
// }

// adds content of each values to output
function getValues(values) {
  // TODO: TESTING HERE: excluding the first value
  let data = '';
  for (let i = 1; i < values.length; i++) {
    data += `"${values[i]}"`;
  }
  return data;
}

// Content in Background for FeatureFile
function getBackgroundSteps(steps) {
  let data = '';
  for (let i = 0; i < steps.length; i++) {
    if (i === 0) {
      data += 'When ';
    } else {
      data += 'And ';
    }
    if (steps[i].values[0] != null) {
      data += `${steps[i].pre} "${steps[i].values[0]}" ${steps[i].mid}${getValues(steps[i].values)} \n`;
    } else {
      data += `${steps[i].pre} ${steps[i].mid}${getValues(steps[i].values)} \n`;
    }
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
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Building feature file step-content
function getSteps(steps, stepType) {
  let data = '';
  for (const step of steps) {
    data += `${jsUcfirst(stepType)} `;
    // TODO: If Given contains Background (Background>0): Add Background (method)
    if ((step.values[0]) != null && (step.values[0]) !== 'User') {
      data += `${step.pre} "${step.values[0]}" ${step.mid}${getValues(step.values)} \n`;
    } else if ((step.values[0]) === 'User') {
      data += `${step.pre} "${step.values[0]}"\n`;
    } else {
      data += `${step.pre} ${step.mid}${getValues(step.values)} \n`;
    }
  }
  return data;
}

// adds content of each values to output
function getExamples(steps) {
  let data = 'Examples:';
  for (let i = 0; i < steps.length; i++) {
    data += '\n | ';
    for (let k = 0; k < steps[i].values.length; k++) {
      data += `${steps[i].values[k]} | `;
    }
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
    if ((scenario.stepDefinitions.example.length) > 0) {
      data += `Scenario Outline: ${scenario.name}\n\n`;
    } else {
      data += `Scenario: ${scenario.name}\n\n`;
    }
    // Get Stepdefinitions
    if (scenario.stepDefinitions.given !== undefined) {
      data += `${getSteps(scenario.stepDefinitions.given, Object.keys(scenario.stepDefinitions)[0])}\n`;
    }
    if (scenario.stepDefinitions.when !== undefined) {
      data += `${getSteps(scenario.stepDefinitions.when, Object.keys(scenario.stepDefinitions)[1])}\n`;
    }
    if (scenario.stepDefinitions.then !== undefined) {
      data += `${getSteps(scenario.stepDefinitions.then, Object.keys(scenario.stepDefinitions)[2])}\n`;
    }

    if ((scenario.stepDefinitions.example.length) > 0) {
      data += `${getExamples(scenario.stepDefinitions.example)}\n\n`;
    }
  }
  return data;
}


// Building feature file story-name-content (feature file title)
function getFeatureContent(story) {
  let data = `Feature: ${story.title}\n\n`;

  // Get background
  if (story.background != null) {
    data += getBackgroundContent(story.background);
  }
  // Get scenarios
  data += getScenarioContent(story.scenarios, story.story_id);
  return data;
}

// Creates feature file
function writeFile(__dirname, selectedStory) {
  fs.writeFile(path.join(__dirname, 'features',
    `${selectedStory.title.replace(/ /g, '_')}.feature`), getFeatureContent(selectedStory), (err) => {
    if (err) throw err;
  });
}


// Updates feature file based on story_id
function updateFeatureFile(issueID) {
  mongo.getOneStory(issueID, (result) => {
    if (result != null) {
      writeFile('', result);
    }
  });
}

function execReport2(req, res, stories, mode, story, callback) {
  const reportTime = Date.now();
  const path1 = 'node_modules/.bin/cucumber-js';
  const path2 = `features/${story.title.replace(/ /g, '_')}.feature`;
  const path3 = `features/reporting_${reportTime}.json`;

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

      callback(reportTime, story, req.params.scenarioID);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    callback(reportTime, story, req.params.scenarioID);
  });
}

function execReport(req, res, stories, mode, callback) {
  mongo.getOneStory(parseInt(req.params.issueID, 10),
    result => execReport2(req, res, stories, mode, result, callback));
}


function setOptions(reportTime) {
  const OSName = process.platform;
  options.metadata.Platform = OSName;
  options.name = 'Seed-Test Report';
  options.jsonFile = `features/reporting_${reportTime}.json`;
  options.output = `features/reporting_html_${reportTime}.html`;
}

function execRepositoryRequests(link, user, password) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    // get Issues from GitHub
    request.open('GET', link, true, user, password);
    request.send();
    request.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        const data = JSON.parse(request.responseText);
        const names = [];
        let index = 0;
        for (const repo of data) {
          const repoName = repo.full_name;
          names[index] = repoName;
          index++;
        }
        resolve(names);
      } else if (this.readyState === 4) {
        reject(this.status);
      }
    };
  });
}

function ownRepositories(token) {
  return execRepositoryRequests('https://api.github.com/user/repos', 'account_name', token);
}

function starredRepositories(user, token) {
  return execRepositoryRequests(`https://api.github.com/users/${user}/starred`, user, token);
}

function fuseGitWithDb(story, issueId) {
  return new Promise((resolve) => {
    mongo.getOneStory(issueId, (result) => {
      if (result !== null) {
        story.scenarios = result.scenarios;
        story.background = result.background;
        story.lastTestPassed = result.lastTestPassed;
      } else {
        story.scenarios = [emptyScenario()];
        story.background = emptyBackground();
      }
      mongo.upsertEntry('Stories', story.story_id, story);
      writeFile('', story); // Create & Update Feature Files
      resolve(story);
    });
  });
}

function deleteJsonReport(jsonReport) {
  const report = path.normalize(`${featuresPath}${jsonReport}`);
  fs.unlink(report, (err) => {
    if (err) console.log(err);
    else {
      console.log(`${report} json deleted.`);
    }
  });
}

function deleteHtmlReport(htmlReport) {
  const report = path.normalize(`${featuresPath}${htmlReport}`);
  fs.unlink(report, (err) => {
    if (err) console.log(err);
    else {
      console.log(`${report} html deleted.`);
    }
  });
}


function runReport(req, res, stories, mode) {
  execReport(req, res, stories, mode, (reportTime, story, scenarioID) => {
    setTimeout(deleteJsonReport, reportDeletionTime * 60000, `reporting_${reportTime}.json`);
    setTimeout(deleteHtmlReport, reportDeletionTime * 60000, `reporting_html_${reportTime}.html`);
    setOptions(reportTime);
    reporter.generate(options);
    res.sendFile(`/reporting_html_${reportTime}.html`, { root: rootPath });
    //const root = HTMLParser.parse(`/reporting_html_${reportTime}.html`)
    let testStatus = false;
    fs.readFile(`./features/reporting_${reportTime}.json`, "utf8", function(err, data) {
      let json = JSON.parse(data)
      let passed = 0;
      let failed  = 0;
      let skipped = 0;
      let scenario = story.scenarios.find((s) => s.scenario_id == scenarioID )

      json[0].elements.forEach((d) => {
        let scenarioPassed = 0;
        let scenarioFailed = 0;
        let scenarioSkipped = 0;
        d.steps.forEach((s, i) => {
          switch(s.result.status){
            case 'passed': passed++; scenarioPassed++; break;
            case 'failed': failed++; scenarioFailed++; break;
            case 'skipped': skipped++; scenarioSkipped++; break;
            default:  console.log('Status default: ' + s.result.status);
          }
        })
        story = updateScenarioTestStatus(testPassed(scenarioFailed, scenarioPassed), d.tags[0].name, story)
      })

      testStatus = testPassed(failed, passed);
      
      if(scenarioID && scenario){ 
        scenario.lastTestPassed = testStatus;
        mongo.updateScenario(story.story_id, scenario, (result) => {
        })
      }else if(!scenarioID) {
        story.lastTestPassed = testStatus;
        mongo.updateStory(story.story_id, story, (result) => {
        })
      }
    });
  });
}

function testPassed(failed, passed){
  return failed <= 0 && passed >= 1;
}


function updateScenarioTestStatus(testPassed, scenarioTagName, story){
  let scenarioId = parseInt(scenarioTagName.split('_')[1]);
  let scenario = story.scenarios.find(scenario => scenario.scenario_id === scenarioId);
  if(scenario){
    let index = story.scenarios.indexOf(scenario);
    scenario.lastTestPassed = testPassed;
    story.scenarios[index] = scenario;
  }
  return story;
}

module.exports = {
  options,
  deleteHtmlReport,
  deleteJsonReport,
  execRepositoryRequests,
  setOptions,
  execReport,
  getFeatureContent,
  getScenarioContent,
  getExamples,
  getSteps,
  jsUcfirst,
  getBackgroundContent,
  getBackgroundSteps,
  getValues,
  writeFile,
  updateFeatureFile,
  runReport,
  starredRepositories,
  ownRepositories,
  fuseGitWithDb,
};
