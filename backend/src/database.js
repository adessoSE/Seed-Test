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
    let story = stories.findOne({ story_id: git_id });
    let lastScenarioIndex = story.scenarios.length;
    let tmpScenario = emptyScenario;
    if (story != null) {
      tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
      stories.chain().find({ "story_id": git_id }).where(function (obj) {
        obj.scenarios.push(tmpScenario)
      });
      // }// else {
      //     let tmpStory = emptyStory
      //     tmpStory.story_id = git_id
      //     stories.insert(tmpStory)
      // }
      return true;
    }
  } catch (error) {

  }
}

// POST SCENARIO
function updateScenario(git_id, scenario) {
  try {
    let success = false;
    let scenarioCheck = stories.findOne({ story_id: git_id }.scenarios);
    if (scenarioCheck != null) { // replace scenario
      stories
        .chain()
        .find({ "story_id": git_id })
        .where(function (obj) {
          for (let i in obj.scenarios) {
            if (obj.scenarios[i].scenario_id === scenario.scenario_id) {
              obj.scenarios.splice(i, 1, scenario);
              success = true;
              break;
            }
            if (i === obj.scenarios.length - 1) { // insert scenario
              stories.chain().find({ "story_id": git_id }).where(function (obj) {
                obj.scenarios.push(scenario)

              })
            }
          }
        })
    }
    return success;
  } catch (error) {

  }
}

// DELETE Scenario
function deleteScenario(git_id, s_id) {
  try {
    let success = false;
    stories
      .chain()
      .find({ "story_id": git_id })
      .where(function (obj) {
        for (let i = 0; i < obj.scenarios.length; i++) {
          if (obj.scenarios[i].scenario_id === s_id) {
            obj.scenarios.splice(i, 1);
            console.log("scenario deleted!");
            success = true;
            break
          }
        }
      });
    return success;

  } catch (error) {

  }
}

module.exports = {
  stories: stories, showStepdefinitions: showStepdefinitions,
  createScenario: createScenario, deleteScenario: deleteScenario, updateScenario: updateScenario
};
