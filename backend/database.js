var loki = require('lokijs');

var db = new loki('db.json');

var story = db.addCollection('Stories');


story.insert([
    {git_issue_id: '9' , scenarios: [
        {scenario_id: '1', 
        name: 'successfull Login' , 
        stepDefinitions: [
            {given: [
                {id: '1' , name: 'Guest' , type: 'Rolle' , pre: 'As a' , mid: '' , post: '' , values: []}
            ] ,
            when: [
                {id: '1' , name: 'www.addeso.de' , type: 'Website' , pre: 'I want to visite this site:' , mid: '' , post: '' , values: ['']} ,
                {id: '2' , name: 'Login' , type: 'Button' , pre: 'I want to click the Button:' , mid: '' , post: '' , values: ['']} ,
                {id: '3' , name: 'Pets' , type: 'Checkbox' , pre: 'I want to select multiple Values for:' , mid: '' , post: '' , values: ['Cat', 'Dog', 'Spider']} ,
                
        ],
            then: [
                {id: '1' , name: 'www.adesso.de/myProfile' , type: 'Website' , pre: 'So I will be navigated to:' , mid: '' , post: '' , values: ['']} ,
                {id: '2' , name: 'Valdidation' , type: 'Text' , pre: 'So i can see the Text:' , mid: '' , post: '' , values: ['Succsessfully logged in']}   
            ]

        }] },
        {scenario_id: '2', 
        name: 'failed Login' , 
        stepDefinitions: [ 
            {given: [
                {id: '1' , name: 'User' , type: 'Rolle' , pre: 'As a' , mid: '' , post: '' , values: ['Mustermann' , 'Geheim666']}
            ] ,
            when: [
                {id: '1' , name: 'www.gamestar.de' , type: 'Website' , pre: 'I want to visite this site:' , mid: '' , post: '' , values: ['']} ,
                {id: '2' , name: 'Login' , type: 'Button' , pre: 'I want to click the Button:' , mid: '' , post: '' , values: ['']} ,
                {id: '3' , name: 'Games' , type: 'individual_selection' , pre: 'I want to select:' , mid: '' , post: '' , values: ['Rpg']}       
        ],
            then: [
                {id: '1' , name: 'www.gamestar.de/login' , type: 'Website' , pre: 'So I will be navigated to:' , mid: '' , post: '' , values: ['']} ,
                {id: '2' , name: 'Valdidation' , type: 'Text' , pre: 'So i can see the Text:' , mid: '' , post: '' , values: ['Password or User incorrect']}   
            ]

        }] } 
        
])

var stepdefinitions = db.addCollection('StepDefinitions');

stepdefinitions.insert([
    {stepType: 'given' , name: '' , type: 'Rolle' , pre: 'As a' , mid: '', post: '', values:[] , selection: ['Guest' , 'User']} ,
    {stepType: 'when' , name: '' , type: 'Website' , pre: 'I want to visite this site:' , mid: '', post: '', values:[] } ,
    {stepType: 'when' , name: '' , type: 'Button' , pre: 'I want to click the Button:' , mid: '', post: '', values:[] } ,
    {stepType: 'when' , name: '' , type: 'Field' , pre: 'I want to insert:' , mid: '', post: '', values:[] } ,
    {stepType: 'when' , name: '' , type: 'Individual_selection' , pre: 'I want to select:' , mid: '', post: '', values:[] } ,
    {stepType: 'when' , name: '' , type: 'Checkbox' , pre: 'I want to select multiple Values for:' , mid: '', post: '', values:[] } ,
    {stepType: 'then' , name: '' , type: 'Website' , pre: 'So I will be navigated to:' , mid: '', post: '', values:[] } ,
    {stepType: 'then' , name: '' , type: 'Text' , pre: 'So i can see the Text:' , mid: '', post: '', values:[] } 
    
])

console.log(story.find({})[0].Scenarios[0].stepDefinitions[0].when);