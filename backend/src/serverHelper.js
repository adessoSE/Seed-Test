const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const reporter = require('cucumber-html-reporter');
let respReport;

//this is needed for the html report
let options = {
  theme: 'bootstrap',
  jsonFile: 'features/reporting.json',
  output: 'features/reporting_html.html',
  reportSuiteAsScenarios: true,
  launchReport: true,
  metadata: {
    "App Version": "0.3.2",
    "Test Environment": "STAGING",
    "Browser": "Chrome  54.0.2840.98",
    "Platform": "Windows 10",
    "Parallel": "Scenarios",
    "Executed": "Remote"
  }
};

// Building feature file story-name-content (feature file title)
function getFeatureContent(story) {
  this.respReport = null;
  var data = "Feature: " + story.title + "\n\n";
  //console.log(story.story_id+ " Background: " + story.background.stepDefinitions.when[0]);

  //Get background
  if (story.background != null) {
    data += getBackgroundContent(story.background);
  }
  // Get scenarios
  data += getScenarioContent(story.scenarios, story.story_id);
  return data;
}

//Building Background-Content
function getBackgroundContent(background) {
  var data = "Background: \n\n";
  // get stepDefinitions
  data += getBackgroundSteps(background.stepDefinitions.when);
  return data;
}

//Content in Background for FeatureFile
function getBackgroundSteps(steps) {
  var data = "";
  for (var i = 0; i < steps.length; i++) {
    if (i === 0) {
      data += "When "
    } else {
      data += "And "
    }
    if ((steps[i].label) != null) {
      data += steps[i].pre + " " + getLabel(steps[i].label) + " " + midNotEmpty(steps[i].mid) + getValues(steps[i].values) + " " + "\n";
    } else {
      data += steps[i].pre + " " + midNotEmpty(steps[i].mid) + getValues(steps[i].values) + " " + "\n";
    }

  }
  data += "\n";
  return data;
}

// Building feature file scenario-name-content
function getScenarioContent(scenarios, story_id) {
  var data = "";
  for (var i = 0; i < scenarios.length; i++) {
    data += "@" + story_id + "_" + scenarios[i].scenario_id + "\n";
    if ((scenarios[i].stepDefinitions.example.length) > 0) {
      data += "Scenario Outline: " + scenarios[i].name + "\n\n";
    } else {
      data += "Scenario: " + scenarios[i].name + "\n\n";
    }
    // Get Stepdefinitions
    data += getSteps(scenarios[i].stepDefinitions.given, Object.keys(scenarios[i].stepDefinitions)[0]) + "\n";

    data += getSteps(scenarios[i].stepDefinitions.when, Object.keys(scenarios[i].stepDefinitions)[1]) + "\n";

    data += getSteps(scenarios[i].stepDefinitions.then, Object.keys(scenarios[i].stepDefinitions)[2]) + "\n";

    if ((scenarios[i].stepDefinitions.example.length) > 0) {
      data += getExamples(scenarios[i].stepDefinitions.example) + "\n\n";
    }
  }
  return data;
}

// Building feature file step-content
function getSteps(steps, stepType) {
  var data = "";
  for (var i = 0; i < steps.length; i++) {
    data += jsUcfirst(stepType) + " ";
    // ToDo: If Given contains Background (Background>0): Add Background (method)
    if ((steps[i].label) != null && (steps[i].label) != 'User') {
      data += steps[i].pre + " " + getLabel(steps[i].label) + " " + midNotEmpty(steps[i].mid) + getValues(steps[i].values) + " " + "\n";
    } else if ((steps[i].label) == 'User') {
      data += steps[i].pre + " " + getLabel(steps[i].label) + "\n";
    } else {
      data += steps[i].pre + " " + midNotEmpty(steps[i].mid) + getValues(steps[i].values) + " " + "\n";
    }
  }
  return data;
}

// adds content of each values to output
function getExamples(steps) {
  var data = ""

  data += "Examples:"
  for (var i = 0; i < steps.length; i++) {
    data += "\n | "
    for (var k = 0; k < steps[i].values.length; k++) {
      data += steps[i].values[k] + " | "
    }
  }

  return data + "\n";
}

// only displays mid text and additional space if length not null
function midNotEmpty(values) {
  if (values.length === 0) {
    return "";
  }
  return values + " ";
}

// adds content of each values to output
function getValues(values) {
  let data = "";
  for (var i = 0; i < values.length; i++) {
    data += '"' + values[i] + '"';
  }
  return data;
}

// adds label content to output
function getLabel(label) {
  let data = "";
  data += '"' + label + '"';
  return data;
}

// First letter in string to upper case
function jsUcfirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Updates feature file based on story_id
function updateFeatureFiles(reqparams, stories) {
  let selectedStory;
  for (var i = 0; i < stories.length; i++) {
    if (stories[i].story_id == reqparams.issueID) {
      selectedStory = stories[i];
      break;
    }
  }
  writeFile("", selectedStory);
}

// Creates feature file
function writeFile(__dirname, selectedStory) {
  fs.writeFile(path.join(__dirname, 'features', selectedStory.title.replace(/ /g, '_') + '.feature'), getFeatureContent(selectedStory), function (err) {
    if (err) throw err;
  });
}

function getStoryByID(reqparams, stories) {
  let selectedStory;
  for (var i = 0; i < stories.length; i++) {
    if (stories[i].story_id == reqparams.issueID) {
      selectedStory = stories[i];
      break;
    }
  }
  return selectedStory;
}

function execScenario(req, res, stories, callback) {
  let story = getStoryByID(req.params, stories)
  var cmd = 'node_modules/.bin/cucumber-js features/' + story.title.replace(/ /g, '_') + '.feature --tags "@' + req.params.issueID + '_' + req.params.scenarioID + '"' + ' --format json:features/reporting.json';
  console.log(cmd);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      callback();
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    callback();
  });
}

function execFeature(req, res, stories, callback) {
  //npm test features/LoginTest.feature
  let story = getStoryByID(req.params, stories)
  var cmd = 'node_modules/.bin/cucumber-js features/' + story.title.replace(/ /g, '_') + '.feature --format json:features/reporting.json';
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      callback();
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    callback();
  });
}

//outputs a report in Json and then transforms it in a pretty html page
function scenarioReport(req, res, stories) {
  execScenario(req, res, stories, function () {
    console.log("testing scenario report");
    reporter.generate(options);
    sendTestResult();
    res.sendFile('/reporting_html.html', {root: "features"});
  })
}

function featureReport(req, res, stories) {
  execFeature(req, res, stories, function () {
    console.log("testing feature report");
    reporter.generate(options);
    sendTestResult();
    res.sendFile('/reporting_html.html', {root: "features"});
  })
}

function sendTestResult() {
  respReport.sendFile('/reporting_html.html', {root: "features"});
}

function sendDownloadResult(resp) {
  resp.sendFile('/reporting_html.html', {root: "features"});
}


//necessary for sendTestResult function
function setRespReport(resp) {
  respReport = resp;
}

module.exports = {
  updateFeatureFiles: updateFeatureFiles,
  scenarioReport: scenarioReport,
  featureReport: featureReport,
  writeFile: writeFile,
  setRespReport: setRespReport,
  sendDownloadResult: sendDownloadResult
}
