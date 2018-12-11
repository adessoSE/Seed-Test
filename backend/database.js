var loki = require('lokijs');

var db = new loki('db.json');

var Story = db.addCollection('Story');

Story.insert([
    {ScenarioName: 'erfolgreicher Login' , StepName: 'Rolle' , Typ: 'given' , Pre: 'bla' , Mid: 'bli' , Post: 'blub' , Value: 'vom Frontend'},
    {ScenarioName: 'erfolgreicher Login' , StepName: '1' , Typ: 'given' , Pre: 'bla' , Mid: 'bli' , Post: 'blub' , Value: 'vom Frontend'},
    {ScenarioName: 'erfolgreicher Login' , StepName: '2' , Typ: 'given' , Pre: 'bla' , Mid: 'bli' , Post: 'blub' , Value: 'vom Frontend'},
    {ScenarioName: 'erfolgreicher Login' , StepName: '3' , Typ: 'given' , Pre: 'bla' , Mid: 'bli' , Post: 'blub' , Value: 'vom Frontend'},
]);

var stories = db.addCollection('stories');

var test_story =
  {story_id:386697647, title:"Run test functionality", body:"As a user,\r\nIn want a button to run my scenarios\r\nso I can see if my test passes", assignee: "", avatar: "",
    scenarios:[
      {scenario_id: 1, ScenarioName: 'successfull log-in' ,
        steps: [
        { step_id: 1,
          step_definition: {step_def_id: 1, step_name: 'role' , type: 'given' , pre: 'As a ' , mid: ' i can' , post: '...'},
          values: [{value_id : 1, value: 'visitor (TESTDATA'}]
        }
      ]}
    ]
  };

var test_value_1 =
  {
    value_id : 1, value: 'visitor (TESTDATA)',
    step: {
      step_id: 1,
      step_definition: {step_def_id: 1, step_name: 'role', type: 'given', pre: 'As a ', mid: ' i can', post: '...'},
      scenario: {scenario_id: 1, ScenarioName: 'succesfull log-in',
        story: {story_id:386697647, title:"Run test functionality", body:"As a user,\r\nIn want a button to run my scenarios\r\nso I can see if my test passes"}
      }
    }
  };

var test_value_2 = {
    value_id : 1, value: 'visitor (TESTDATA)',
    step_id: 1,
  };
var test_step1 = {
  step_id: 1,
  step_definition: 1,
  scenario_id: 1
};
var test_stepdef1 = {
  step_def_id: 1, step_name: 'role', type: 'given', pre: 'As a ', mid: ' i can', post: '...'
};

var test_scenario = {
  scenario_id: 1, ScenarioName: 'succesfull log-in',
  story_id: 386697647
};
var story= {
  story_id:386697647, title:"Run test functionality", body:"As a user,\r\nIn want a button to run my scenarios\r\nso I can see if my test passes"
};

module.exports = db;
module.exports.stories = stories;
