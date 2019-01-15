const loki = require('lokijs');
const db = new loki('db.json');
const stepDefinitions = db.addCollection('Step Definitions');
const testdata = require('./Testdata/storiesTestdata').testdata;
const emptyScenario = require('./models/emptyScenario');
const stories = db.addCollection('Stories');

stories.insert(testdata); // move to Testdata

stepDefinitions.insert([
  {
    stepType: 'given',
    label: '',
    type: 'Role',
    pre: 'As a',
    mid: '',
    values: [],
    selection: ['Guest', 'User']
  },
  {
    stepType: 'when',
    label: 'Website',
    type: 'Website',
    pre: 'I want to visit this site:',
    mid: '',
    values: []
  },
  {
    stepType: 'when',
    label: '',
    type: 'Button',
    pre: 'I want to click the Button:',
    mid: '',
    values: []
  },
  {
    stepType: 'when',
    label: '',
    type: 'Field',
    pre: 'I want to insert into the',
    mid: 'field, the value/text',
    values: []
  },
  {
    stepType: 'when',
    label: '',
    type: 'Radio',
    pre: 'I want to select from the',
    mid: 'selection, the value',
    values: []
  },
  {
    stepType: 'when',
    label: '',
    type: 'Checkbox',
    pre: 'I want to select from the',
    mid: 'multiple selection, the values',
    values: []
  },
  {
    stepType: 'then',
    label: 'Website',
    type: 'Website',
    pre: 'So I will be navigated to the site:',
    mid: '',
    values: []
  },
  {
    stepType: 'then',
    label: '',
    type: 'Text',
    pre: 'So i can see in  the',
    mid: 'textbox, the text',
    values: []
  }

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
    let story = stories.findOne({story_id: git_id});
    let lastScenarioIndex = story.scenarios.length;
    let tmpScenario = {
      scenario_id: 0,
      name: 'New Scenario',
      stepDefinitions: [
        {
          given: [],
          when: [],
          then: []
        }
      ]
    };
    if (story != null) {
      tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
      stories.chain().find({"story_id": git_id}).where(function (obj) {
        obj.scenarios.push(tmpScenario)
      });
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
        .find({"story_id": git_id})
        .where(function (obj) {
          for (let scenario of obj.scenarios) {
            if (obj.scenarios.indexOf(scenario) === obj.scenarios.length){
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
    return error;
  }
  return updated_scenario;
}

// DELETE Scenario
function deleteScenario(git_id, s_id) {
  try {
    stories
      .chain()
      .find({"story_id": git_id})
      .where(function (story) {
        console.log(story);
        for (let i = 0; i < obj.scenarios.length; i++) {
          if (story.scenarios[i].scenario_id === s_id) {
            console.log(story.scenarios[i]);
            story.scenarios.splice(i, 1);
            return true;
          }
        }
      });
    return "Scenario not found in database";
  } catch (error) {
    return error;
  }
}

module.exports = {
  stories: stories, showStepdefinitions: showStepdefinitions,
  createScenario: createScenario, deleteScenario: deleteScenario, updateScenario: updateScenario
};
