const loki = require('lokijs');
const db = new loki('db.json');
const testdata = require('./Testdata/storiesTestdata').testdata;
const emptyScenario = require('./models/emptyScenario');
const stories = db.addCollection('Stories');
const stepDefinitions = db.addCollection('Step Definitions');

stories.insert(testdata); // move to Testdata
stepDefinitions.insert([
  {
    // ToDO: Frontend Implementation of selections! Use of labels & values?
    id: '',
    stepType: 'given',
    label: '',
    type: 'Role',
    pre: 'As a',
    mid: '',
    values: [],
    selection: ['Guest', 'User']
  },
  {
    id: '',
    stepType: 'given',
    label: null,
    type: 'Website',
    pre: 'I am at the Website:',
    mid: '',
    values: [],
  },
  {
    id: '',
    stepType: 'when',
    label: null,
    type: 'Website',
    pre: 'I want to visit this site:',
    mid: '',
    values: []
  },
  {
    id: '',
    stepType: 'when',
    label: '',
    type: 'Button',
    pre: 'I want to click the Button:',
    mid: '',
    values: [],
  },
  {
    id: '',
    stepType: 'when',
    label: '',
    type: 'Field',
    pre: 'I want to insert into the',
    mid: 'field, the value',
    values: []
  },
  {
    id: '',
    stepType: 'when',
    label: '',
    type: 'Radio',
    pre: 'I want to select from the',
    mid: 'selection, the value',
    values: []
  },
  {
    id: '',
    stepType: 'when',
    label: '',
    type: 'Checkbox',
    pre: 'I want to select from the',
    mid: 'multiple selection, the values',
    values: []
  },
  {
    id: '',
    stepType: 'then',
    label: null,
    type: 'Website',
    pre: 'So I will be navigated to the site:',
    mid: '',
    values: []
  },
  {
    id: '',
    stepType: 'then',
    label: '',
    type: 'Text',
    pre: 'So I can see in the',
    mid: 'textbox, the text',
    values: []
  },
  {
    id: '',
    stepType: 'example',
    label: [],
    type: 'Example',
    pre: '',
    mid: '',
    values: [],
  },
]);

// GET all stories TODO: unused right now  //TODO Prio 1: check if needed
// function showStories() {
//   stories.find()
// }


// GET all StepDefinitions
function showStepdefinitions() {
  return stepDefinitions.find()
}

// Create SCENARIO //TODO Prio 1: divide into two seperate functions
function createScenario(git_id) {
  try {
    let story = stories.findOne({ story_id: git_id });
    let lastScenarioIndex = story.scenarios.length;
    let tmpScenario = emptyScenario();
    if (story != null) {
      if (story.scenarios.length === 0) {
        story.scenarios.push(tmpScenario)
      } else {
        tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
        story.scenarios.push(tmpScenario)
      }
      stories.update(story);
      return tmpScenario;
    }
  } catch (error) {
    return "Could not create Scenario." + error;
  }
}

// POST SCENARIO
function updateScenario(git_id, updated_scenario) {
  try {
    stories
      .chain()
      .find({ "story_id": git_id })
      .where(function (obj) {
        for (let scenario of obj.scenarios) {
          if (obj.scenarios.indexOf(scenario) === obj.scenarios.length) {
            obj.scenarios.push(scenario);
            break;
          }
          if (scenario.scenario_id === updated_scenario.scenario_id) {
            obj.scenarios.splice(obj.scenarios.indexOf(scenario), 1, updated_scenario);
            break;
          }
        }
        return "Something went wrong!";
      })
  } catch (error) {
    console.log("Error:" + error)
    return error;
  }
  return updated_scenario;
}

// DELETE Scenario
function deleteScenario(git_id, s_id) {
  try {
    stories
      .chain()
      .find({ "story_id": git_id })
      .where(function (story) {
        for (let i = 0; i < story.scenarios.length; i++) {
          if (story.scenarios[i].scenario_id === s_id) {
            console.log(story.scenarios[i]);
            story.scenarios.splice(i, 1);
            return true;
          }
        }
      });
    return true;
  } catch (error) {
    return "Could not delete scenario " + error;
  }
}

module.exports = {
  stories: stories, showStepdefinitions: showStepdefinitions,
  createScenario: createScenario, deleteScenario: deleteScenario, updateScenario: updateScenario
};
