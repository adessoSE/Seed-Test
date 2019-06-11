const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const reporter = require('cucumber-html-reporter');

// this is needed for the html report
const options = {
  theme: 'bootstrap',
  jsonFile: 'features/reporting.json',
  output: 'features/reporting_html.html',
  reportSuiteAsScenarios: true,
  launchReport: true,
  metadata: {
    'App Version': '0.3.2',
    'Test Environment': 'STAGING',
    Browser: 'Chrome  54.0.2840.98',
    Platform: 'Windows 10',
    Parallel: 'Scenarios',
    Executed: 'Remote',
  },
};

const rootPath = path.normalize('features');

// only displays mid text and additional space if length not null
function midNotEmpty(values) {
  if (values.length === 0) {
    return '';
  }
  return `${values} `;
}

// adds content of each values to output
function getValues(values) {
  let data = '';
  for (let i = 0; i < values.length; i++) {
    data += `"${values[i]}"`;
  }
  return data;
}

// adds label content to output
function getLabel(label) {
  return `"${label}"`;
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
    if ((steps[i].label) != null) {
      data += `${steps[i].pre} ${getLabel(steps[i].label)} ${midNotEmpty(steps[i].mid)}${getValues(steps[i].values)} \n`;
    } else {
      data += `${steps[i].pre} ${midNotEmpty(steps[i].mid)}${getValues(steps[i].values)} \n`;
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
  for (let i = 0; i < steps.length; i++) {
    data += `${jsUcfirst(stepType)} `;
    // TODO: If Given contains Background (Background>0): Add Background (method)
    if ((steps[i].label) != null && (steps[i].label) !== 'User') {
      data += `${steps[i].pre} ${getLabel(steps[i].label)} ${midNotEmpty(steps[i].mid)}${getValues(steps[i].values)} \n`;
    } else if ((steps[i].label) === 'User') {
      data += `${steps[i].pre} ${getLabel(steps[i].label)}\n`;
    } else {
      data += `${steps[i].pre} ${midNotEmpty(steps[i].mid)}${getValues(steps[i].values)} \n`;
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
  for (let i = 0; i < scenarios.length; i++) {
    data += `@${storyID}_${scenarios[i].scenario_id}\n`;
    if ((scenarios[i].stepDefinitions.example.length) > 0) {
      data += `Scenario Outline: ${scenarios[i].name}\n\n`;
    } else {
      data += `Scenario: ${scenarios[i].name}\n\n`;
    }
    // Get Stepdefinitions
    data += `${getSteps(scenarios[i].stepDefinitions.given, Object.keys(scenarios[i].stepDefinitions)[0])}\n`;

    data += `${getSteps(scenarios[i].stepDefinitions.when, Object.keys(scenarios[i].stepDefinitions)[1])}\n`;

    data += `${getSteps(scenarios[i].stepDefinitions.then, Object.keys(scenarios[i].stepDefinitions)[2])}\n`;

    if ((scenarios[i].stepDefinitions.example.length) > 0) {
      data += `${getExamples(scenarios[i].stepDefinitions.example)}\n\n`;
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
function updateFeatureFiles(reqParams, stories) {
  let selectedStory;
  for (let i = 0; i < stories.length; i++) {
    if (stories[i].story_id === reqParams.issueID) {
      selectedStory = stories[i];
      break;
    }
  }
  writeFile('', selectedStory);
}

function getStoryByID(params, stories) {
  let selectedStory;
  for (let story of stories) {
    if (story.story_id == parseInt(params.issueID, 100)) {
      selectedStory = story;
      console.log(story.story_id);
      break;
    }
  }
  return selectedStory;
}

function execReport(req, res, stories, mode, callback) {
  const story = getStoryByID(req.params, stories);
  const path1 = 'node_modules/.bin/cucumber-js';
  const path2 = `features/${story.title.replace(/ /g, '_')}.feature`;
  const path3 = 'features/reporting.json';
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

      callback();
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    callback();
  });
}

function runReport(req, res, stories, mode) {
  execReport(req, res, stories, mode, () => {
    console.log(`testing ${mode} report`);
    reporter.generate(options);
    res.sendFile('/reporting_html.html', { root: rootPath });
  });
}

function sendDownloadResult(resp) {
  resp.sendFile('/reporting_html.html', { root: rootPath });
}

module.exports = {
  updateFeatureFiles,
  writeFile,
  runReport,
  sendDownloadResult,
};
