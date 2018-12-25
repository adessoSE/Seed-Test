const loki = require('lokijs');
const db = new loki('db.json');
const stories = db.addCollection('Stories');
const stepDefinitions = db.addCollection('StepDefinitions');

// Test Data
stories.insert([
  {
    story_id: 386695799, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Login',
        stepDefinitions: [
          {
            given: [
              {id: 1, name: 'Guest', type: 'Role', pre: 'As a', mid: '', post: '', values: []}
            ],
            when: [
              {
                id: 1,
                name: 'www.addeso.de',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 2,
                name: 'Login',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 3,
                name: 'Pets',
                type: 'Checkbox',
                pre: 'I want to select multiple Values for:',
                mid: '',
                post: '',
                values: ['Cat', 'Dog', 'Spider']
              }
            ],
            then: [
              {
                id: 1,
                name: 'www.adesso.de/myProfile',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 2,
                name: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                post: '',
                values: ['Successfully logged in']
              }
            ]
          }]
      },
      {
        scenario_id: 2,
        name: 'failed Login',
        stepDefinitions: [
          {
            given: [
              {id: 1, name: 'User', type: 'Role', pre: 'As a', mid: '', post: '', values: ['Mustermann', 'Geheim666']}
            ],
            when: [
              {
                id: 1,
                name: 'www.gamestar.de',
                type: 'Website',
                pre: 'I want to visite this site:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 2,
                name: 'Login',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 3,
                name: 'Games',
                type: 'individual_selection',
                pre: 'I want to select:',
                mid: '',
                post: '',
                values: ['Rpg']
              }
            ],
            then: [
              {
                id: 1,
                name: 'www.gamestar.de/login',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 2,
                name: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                post: '',
                values: ['Password or User incorrect']
              }
            ]

          }]
      }]
  },
  {
    story_id: 386697647, scenarios: [
      {
        scenario_id: 1,
        name: 'sign up',
        stepDefinitions: [
          {
            given: [
              {id: 1, name: 'Guest', type: 'Role', pre: 'As a', mid: '', post: '', values: []}
            ],
            when: [
              {
                id: 1,
                name: 'www.abc.de',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 2,
                name: 'Username',
                type: 'Website',
                pre: 'I want to insert:',
                mid: '',
                post: '',
                values: ['Mustermann']
              },
              {
                id: 3,
                name: 'Password',
                type: 'Website',
                pre: 'I want to insert:',
                mid: '',
                post: '',
                values: ['Geheim123']
              },
              {
                id: 4,
                name: 'SignUp',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                post: '',
                values: ['']
              }
            ],
            then: [
              {
                id: 1,
                name: 'www.abc.de/myProfile',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 2,
                name: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                post: '',
                values: ['Successfully signed up']
              }
            ]

          }]
      },
      {
        scenario_id: 2,
        name: 'user already exist',
        stepDefinitions: [
          {
            given: [
              {id: 1, name: 'Guest', type: 'Role', pre: 'As a', mid: '', post: '', values: ['']}
            ],
            when: [
              {
                id: 1,
                name: 'www.abc.de',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 2,
                name: 'Username',
                type: 'Website',
                pre: 'I want to insert:',
                mid: '',
                post: '',
                values: ['Mustermann']
              },
              {
                id: 3,
                name: 'Password',
                type: 'Website',
                pre: 'I want to insert:',
                mid: '',
                post: '',
                values: ['Geheim123']
              },
              {
                id: 4,
                name: 'SignUp',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                post: '',
                values: ['']
              },

            ],
            then: [
              {
                id: 1,
                name: 'www.abc.de',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                post: '',
                values: ['']
              },
              {
                id: 2,
                name: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                post: '',
                values: ['User already exists']
              }
            ]

          }]
      }]
  },

])

// Step Definitions
stepDefinitions.insert([
  {stepType: 'given', name: '', type: 'Role', pre: 'As a', mid: '', post: '', values: [], selection: ['Guest', 'User']},
  {stepType: 'when', name: '', type: 'Website', pre: 'I want to visit this site:', mid: '', post: '', values: []},
  {stepType: 'when', name: '', type: 'Button', pre: 'I want to click the Button:', mid: '', post: '', values: []},
  {stepType: 'when', name: '', type: 'Field', pre: 'I want to insert:', mid: '', post: '', values: []},
  {
    stepType: 'when',
    name: '',
    type: 'Radio (Individual Selection)',
    pre: 'I want to select:',
    mid: '',
    post: '',
    values: []
  },
  {
    stepType: 'when',
    name: '',
    type: 'Checkbox',
    pre: 'I want to select multiple Values for:',
    mid: '',
    post: '',
    values: []
  },
  {stepType: 'then', name: '', type: 'Website', pre: 'So I will be navigated to:', mid: '', post: '', values: []},
  {stepType: 'then', name: '', type: 'Text', pre: 'So i can see the Text:', mid: '', post: '', values: []}

])

// Mockups for empty Story and Scenarios
const emptyStory = {
  story_id: '', scenarios: [
    {
      scenario_id: 1,
      name: '',
      stepDefinitions: [
        {
          given: [],
          when: [],
          then: []
        }]
    }]
}

const emptyScenario = {
  name: 'New Scenario',
  stepDefinitions: [
    {
      given: [],
      when: [],
      then: []
    }
  ]
}

// // GET all stories TODO: unused right now
// function showStories() {
//     stories.find()
// }
// GET all StepDefinitions
function showStepdefinitions() {
  return stepDefinitions.find()
}

// Create SCENARIO
function createScenario(git_id) {
  let story = stories.findOne({story_id: git_id});
  let lastScenarioIndex = story.scenarios.length
  let tmpScenario = emptyScenario;

  if (story != null) {
    tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1
    console.log("scenario id", tmpScenario.scenario_id);
    tmpScenario.name = 'New Scenario'
    // todo here is something wrong -> if u add multiple stories the latest id will be applied to all new stories
    stories.chain().find({story_id: git_id}).update(function (obj) {
      obj.scenarios.push(tmpScenario)
    })
  } else {
    let tmpStory = emptyStory
    tmpStory.story_id = git_id
    stories.insert(tmpStory)
  }
  return true;
}

// POST SCENARIO //TODO: create new scenario, if there is none with the ID?
function updateScenario(git_id, scenario) {
  let success = false;
  let story = stories.findOne({story_id: git_id});
  if (story != null) {
    stories
      .chain()
      .find({"story_id": git_id})
      .where(function (obj) {
        for (let i in obj.scenarios) {
          if (obj.scenarios[i].scenario_id === scenario.scenario_id) {
            obj.scenarios.splice(i, 1, scenario);
            success = true;
            break;
          }
        }
      })
  }
  return success;
}

// DELETE Scenario
function deleteScenario(git_id, s_id) {
  let sucess = false;
  stories
    .chain()
    .find({"story_id": git_id})
    .where(function (obj) {
      for (let i = 0; i < obj.scenarios.length; i++) {
        if (obj.scenarios[i].scenario_id == s_id) {
          obj.scenarios.splice(i, 1)
          console.log("scenario deleted!");
          sucess = true;
          break
        }
      }
    });
  return sucess;
}

module.exports = {
  stories: stories, showStepdefinitions: showStepdefinitions,
  createScenario: createScenario, deleteScenario: deleteScenario, updateScenario: updateScenario
};
