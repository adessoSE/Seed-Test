const Loki = require('lokijs');
const { testData } = require('./testdata/storiesTestdata');
const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');

const db = new Loki('db.json');
const stories = db.addCollection('Stories');
const stepDefinitions = db.addCollection('Step Definitions');

stories.insert(testData); // move to testData
stepDefinitions.insert([
  {
    // ToDO: Frontend Implementation of selections! Use of labels & values?
    id: '',
    stepType: 'given',
    label: null,
    type: 'Role',
    pre: 'As a',
    mid: '',
    values: [],
    selection: ['Guest', 'User'],
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
    stepType: 'example',
    label: null,
    type: 'Add Variable',
    pre: '',
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
    values: [],
  },
  {
    id: '',
    stepType: 'when',
    label: null,
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
    values: [],
  },
  {
    id: '',
    stepType: 'when',
    label: '',
    type: 'Radio',
    pre: 'I want to select from the',
    mid: 'selection, the value',
    values: [],
  },
  {
    id: '',
    stepType: 'when',
    label: '',
    type: 'Dropdown',
    pre: 'I want to select from the dropdownmenue',
    mid: 'the option',
    values: [],
  },
  {
    id: '',
    stepType: 'when',
    label: '',
    type: 'HoverOverAndSelect',
    pre: 'I want to hover over the Element',
    mid: 'and Select the Option',
    values: [],
  },
  {
    id: '',
    stepType: 'when',
    label: '',
    type: 'Checkbox',
    pre: 'I want to select from the',
    mid: 'multiple selection, the values',
    values: [],
  },
  {
    id: '',
    stepType: 'then',
    label: null,
    type: 'Website',
    pre: 'So I will be navigated to the site:',
    mid: '',
    values: [],
  },
  {
    id: '',
    stepType: 'then',
    label: '',
    type: 'Text',
    pre: 'So I can see in the',
    mid: 'textbox, the text',
    values: [],
  },
]);

// GET all StepDefinitions
function showStepdefinitions() {
  return stepDefinitions.find();
}

// Create Background
function createBackground(issueID) {
  let tmpBackground;
  try {
    const story = stories.findOne({ story_id: issueID });
    tmpBackground = emptyBackground();
    if (story != null) {
      story.background.push(tmpBackground);
      stories.update(story);
    }
  } catch (error) {
    return `Could not create Background.${error}`;
  }
  return tmpBackground;
}

// Update Background
function updateBackground(issueID, updatedBackground) {
  try {
    stories
      .chain()
      .find({ story_id: issueID })
      .update((obj) => { obj.background = updatedBackground; });
  } catch (error) {
    console.log(`Error:${error}`);
    return error;
  }
  return updatedBackground;
}

// Delete Background
function deleteBackground(issueID) {
  try {
    stories
      .chain()
      .find({ story_id: issueID })
      .update((obj) => { obj.background = { stepDefinitions: { when: [] } }; });
  } catch (error) {
    console.log(`Error:${error}`);
    return error;
  }
  return true;
}


// Create SCENARIO //TODO Prio 1: divide into two seperate functions
function createScenario(issueID) {
  let tmpScenario
  try {
    const story = stories.findOne({ story_id: issueID });
    const lastScenarioIndex = story.scenarios.length;
    tmpScenario = emptyScenario();
    if (story != null) {
      if (story.scenarios.length === 0) {
        story.scenarios.push(tmpScenario);
      } else {
        tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
        story.scenarios.push(tmpScenario);
      }
      stories.update(story);
    }
  } catch (error) {
    return `Could not create Scenario.${error}`;
  }
  return tmpScenario;
}

// POST SCENARIO
function updateScenario(issueID, updatedScenario) {
  try {
    stories
      .chain()
      .find({ story_id: issueID })
      .where((obj) => {
        for (const scenario of obj.scenarios) {
          if (obj.scenarios.indexOf(scenario) === obj.scenarios.length) {
            obj.scenarios.push(scenario);
            break;
          }
          if (scenario.scenario_id === updatedScenario.scenario_id) {
            obj.scenarios.splice(obj.scenarios.indexOf(scenario), 1, updatedScenario);
            break;
          }
        }
        return 'Something went wrong!';
      });
  } catch (error) {
    console.log(`Error:${error}`);
    return error;
  }
  return updatedScenario;
}

// DELETE Scenario
function deleteScenario(issueID, storyID) {
  try {
    stories
      .chain()
      .find({ story_id: issueID })
      .where((story) => {
        for (let i = 0; i < story.scenarios.length; i++) {
          if (story.scenarios[i].scenario_id === storyID) {
            console.log(story.scenarios[i]);
            story.scenarios.splice(i, 1);
            return true;
          }
        }
      });
    return true;
  } catch (error) {
    return `Could not delete scenario ${error}`;
  }
}


module.exports = {
  stories,
  showStepdefinitions,
  createBackground,
  deleteBackground,
  updateBackground,
  createScenario,
  deleteScenario,
  updateScenario,
};
