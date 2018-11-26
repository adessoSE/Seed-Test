var loki = require('lokijs');

var db = new loki('db.json');

var Story = db.addCollection('Story');

Story.insert([
    {ScenarioName: 'erfolgreicher Login' , StepName: 'Rolle' , Typ: 'given' , Pre: 'bla' , Mid: 'bli' , Post: 'blub' , Value: 'vom Frontend'},
    {ScenarioName: 'erfolgreicher Login' , StepName: '1' , Typ: 'given' , Pre: 'bla' , Mid: 'bli' , Post: 'blub' , Value: 'vom Frontend'},
    {ScenarioName: 'erfolgreicher Login' , StepName: '2' , Typ: 'given' , Pre: 'bla' , Mid: 'bli' , Post: 'blub' , Value: 'vom Frontend'},
    {ScenarioName: 'erfolgreicher Login' , StepName: '3' , Typ: 'given' , Pre: 'bla' , Mid: 'bli' , Post: 'blub' , Value: 'vom Frontend'},
]);

console.log(Story.get(1));