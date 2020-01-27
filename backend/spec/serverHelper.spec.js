const helper = require('../src/serverHelper')
const fs = require('fs');

describe("ServerHelper", function() {
    //describe("midNotEmpty", function() {
    //  it("should return empty string", function() {
    //    let values = null;
    //    let returnValue = helper.midNotEmpty(values);
    //    expect(returnValue).toBe('');
    //  });
//
    //  it("should return empty string", function() {
    //    let values = 'test';
    //    let returnValue = helper.midNotEmpty(values);
    //    expect(returnValue).toBe(`${values} `);
    //  });
    //});

    describe('getValues', function(){
        it('should return empty string', function(){
            let values = [];
            let returnValue = helper.getValues(values);
            expect(returnValue).toBe('');
        });
        it('should return also empty string', function(){
            let values = ['test1'];
            let returnValue = helper.getValues(values);
            expect(returnValue).toBe('');
        });

        it('should return only test2 string', function(){
            let values = ['test1', 'test2'];
            let returnValue = helper.getValues(values);
            expect(returnValue).toBe('"test2"');
        });

        it('should return only test2 and test3 string', function(){
            let values = ['test1', 'test2', 'test3'];
            let returnValue = helper.getValues(values);
            expect(returnValue).toBe('"test2""test3"');
        });
    });

    describe('getBackgroundSteps', function(){
        it('should return empty string', function(){
            let steps = [];
            let returnValue = helper.getBackgroundSteps(steps);
            expect(returnValue).toBe('\n');
        });

        it('should return only step string', function(){
            let steps = [{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://seed-test-frontend.herokuapp.com/login"]},{"id":4,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["adessoCucumber","githubName"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["bef00afd223c0bcdaa18a43808f9e71d13bded9b","token"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["loginButton"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["repository_0"]}];
            let stringifyedSteps= `When I go to the website: "https://seed-test-frontend.herokuapp.com/login"\nAnd I insert "adessoCucumber" into the field"githubName"\nAnd I insert "bef00afd223c0bcdaa18a43808f9e71d13bded9b" into the field"token"\nAnd I click the button: "loginButton"\nAnd I click the button: "repository_0"\n\n`
            let returnValue = helper.getBackgroundSteps(steps);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(stringifyedSteps.replace(/\s/g, "").replace(' ', ''));
        });
    });

    describe('getBackgroundContent', function(){
        it('should return empty Background string', function(){
            let background = {"stepDefinitions":{"when":[]}};
            let returnValue = helper.getBackgroundContent(background);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe('Background:\n\n'.replace(/\s/g, "").replace(' ', ''));
        });

        it('should return background convertet to string', function(){
            let background = {"name":"New Background","stepDefinitions":{"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["",""]},{"id":4,"mid":"from the selection","pre":"I select ","stepType":"when","type":"Radio","values":["",""]},{"id":5,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["gg"]}]}};
            let backgroundString= 'Background: \n\nWhen I go to the website: ""  \nAnd I click the button: ""  \nAnd I insert "" into the field"" \nAnd I select  "" from the selection"" \nAnd I go to the website: "gg"  \n\n';
            let returnValue = helper.getBackgroundContent(background);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(backgroundString.replace(/\s/g, "").replace(' ', ''));
        });
    });

    describe('jsUcfirst', function(){
        it('should return empty string', function(){
            let string = '';
            let returnValue = helper.jsUcfirst(string);
            expect(returnValue).toBe('');
        });

        it('should return Testing', function(){
            let string = 'testing';
            let returnValue = helper.jsUcfirst(string);
            let testResultString = string.charAt(0).toUpperCase() + string.slice(1);
            expect(returnValue).toBe(testResultString);
        });

        it('should return Done', function(){
            let string = 'Done';
            let returnValue = helper.jsUcfirst(string);
            expect(returnValue).toBe(string);
        });
    });

    describe('getSteps', function(){
        it('should return empty string', function(){
            let string = '';
            let stepType = ''
            let returnValue = helper.getSteps(string, stepType );
            expect(returnValue).toBe('');
        });

        it('should return given step string', function(){
            let given = [{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Prime Kunde"]},{"id":2,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["www.amazon.com/warenkorb"]}]
            let stepType = 'given';
            let testResultString = 'Given As a "Prime Kunde" Given I am on the website: "www.amazon.com/warenkorb"'
            let returnValue = helper.getSteps(given, stepType);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });

        it('should return when step string', function(){
            let when = [{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["run_story"]}]
            let stepType = 'when';
            let testResultString = 'When I click the button: "story0" When I click the button: "run_story"'
            let returnValue = helper.getSteps(when, stepType);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });

        it('should return then step string', function(){
            let then = [{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["https://forum.golem.de/register.php"]}]
            let stepType = 'then';
            let testResultString = 'Then So I will be navigated to the website: "https://forum.golem.de/register.php"'
            let returnValue = helper.getSteps(then, stepType);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });

        it('should return example step string', function(){
            let example = [];
            let stepType = 'example';
            let testResultString = '';
            let returnValue = helper.getSteps(example, stepType);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString);
        });
    });


    describe('getExamples', function(){
        it('should return example step string', function(){
            let example = [{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123"]}]
            let testResultString = 'Examples:| userName | password || AdorableHamster | cutehamsterlikesnuts2000 || NormalHamster | FatHamster123 || OldHamster | UglyHamster123 |'
            let returnValue = helper.getExamples(example);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });
    })

    describe('getScenarioContent', function(){
        it('should return scenario content string', function(){
            let scenarios = [{"scenario_id":2,"name":"New Scenario","stepDefinitions":{"given":[],"when":[],"then":[],"example":[]}}]
            let storyId = 382626033;
            let testResultString = '@382626033_2 Scenario: New Scenario'
            let returnValue = helper.getScenarioContent(scenarios, storyId);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });
    })

    describe('getFeatureContent', function(){
        it('should return feature content string', function(){
            let story = {"story_id":382626033,"title":"Scenario creation","body":"As a user\r\nIn order to create different testcases\r\nI want to add a scenario to story\r\nwhen there are stories available.","state":"open","issue_number":2,"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","scenarios":[{"scenario_id":2,"name":"New Scenario","stepDefinitions":{"given":[],"when":[],"then":[],"example":[]}}],"background":{"name":"New Background","stepDefinitions":{"when":[]}}}
            let testResultString = 'Feature: Scenario creation Background: @382626033_2 Scenario: New Scenario'
            let returnValue = helper.getFeatureContent(story);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });
    })

    //describe('writeFile', function(){
    //    it('should create feature file', function(){
    //        let selectedStory = {"story_id":386692544,"title":"Visual test response","body":"As a user,\r\nI want a visual response of my scenarios\r\nSo I can see if a test passed or failed","state":"open","issue_number":4,"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","scenarios":[{"scenario_id":2,"name":"New Scenario","stepDefinitions":{"given":[],"when":[],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["hhheg"]}],"example":[]},"comment":""}],"background":{"name":"New Background","stepDefinitions":{"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["",""]},{"id":4,"mid":"from the selection","pre":"I select ","stepType":"when","type":"Radio","values":["",""]},{"id":5,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["gg"]}]}}}
    //        let dirName = '';
    //        let testResultString = '@382626033_2 Scenario: New Scenario'
    //        let returnValue = helper.getScenarioContent(scenarios, storyId);
    //        expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
    //    });
    //})

    describe('getStoryByID', function(){
            let stories = [{"story_id":540215588,"title":"Finden eines Elements über den Hover-Text","body":"HTML-Elemente wie Buttons, Textfelder, etc. via ihrem Hover-Text finden.","state":"open","issue_number":67,"assignee":"dsorna","assignee_avatar_url":"https://avatars3.githubusercontent.com/u/44997601?v=4","scenarios":[{"scenario_id":1,"name":"Find Button By Hover-Text","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://seed-test-frontend.herokuapp.com/"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Runs all scenario tests for the story"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["logout"]}],"then":[],"example":[]}},{"scenario_id":2,"name":"Fail Finding Button due to wrong Hover-Text","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://seed-test-frontend.herokuapp.com/#"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["TESTRuns all scenario tests for the story"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["logout"]}],"then":[],"example":[]}}],"background":{"name":"Login","stepDefinitions":{"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://seed-test-frontend.herokuapp.com/login"]},{"id":4,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["adessoCucumber","githubName"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["bef00afd223c0bcdaa18a43808f9e71d13bded9b","token"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["loginButton"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["repository_0"]}]}}},{"story_id":502603476,"title":"Gratis Versand","body":"Als Premium Kunde erhalte ich freien Versand, wenn ich 5 B`cher bestelle","state":"open","issue_number":66,"assignee":"adessoCucumber","assignee_avatar_url":"https://avatars0.githubusercontent.com/u/50622173?v=4","scenarios":[{"scenario_id":1,"name":"Premium Kunde 5 Books","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Premium Customer"]},{"id":2,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["www.onlineshop.de"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Add 5 Books"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Delivery Options"]}],"then":[{"id":1,"mid":"in the textbox:","pre":"So I can see the text","stepType":"then","type":"Text","values":["Free Delivery","Delivery Costs"]}],"example":[]}}],"background":{"name":"New Background","stepDefinitions":{"when":[]}}},{"story_id":501324078,"title":"Seed-Test","body":"Test the our own website","state":"open","issue_number":55,"assignee":"adessoCucumber","assignee_avatar_url":"https://avatars0.githubusercontent.com/u/50622173?v=4","scenarios":[{"scenario_id":2,"name":"Not Text test","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://www.facebook.com/"]}],"when":[],"then":[{"id":1,"mid":"","pre":"So I can't see the text:","stepType":"then","type":"Not This Text","values":["spongebob"]}],"example":[]}}],"background":{"name":"New Background","stepDefinitions":{"when":[]}}},{"story_id":492227547,"title":"Test für den Summit2019 !!","body":"balbla","state":"open","issue_number":44,"assignee":"unassigned","assignee_avatar_url":"https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png","scenarios":[{"scenario_id":1,"name":"Prime Kunde 5 Büchern","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Prime Kunde"]},{"id":2,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["www.amazon.com/warenkorb"]}],"when":[{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["\"Add 5 Books\""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Delivery Options"]}],"then":[{"id":1,"mid":"in the textbox:","pre":"So I can see the text","stepType":"then","type":"Text","values":["Free Delivery"]}],"example":[]}}],"background":{"name":"New Background","stepDefinitions":{"when":[]}}}];

        it('should return story of id', function(){
            let issueID = 540215588;
            let selectedStory = {"story_id":540215588,"title":"Finden eines Elements über den Hover-Text","body":"HTML-Elemente wie Buttons, Textfelder, etc. via ihrem Hover-Text finden.","state":"open","issue_number":67,"assignee":"dsorna","assignee_avatar_url":"https://avatars3.githubusercontent.com/u/44997601?v=4","scenarios":[{"scenario_id":1,"name":"Find Button By Hover-Text","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://seed-test-frontend.herokuapp.com/"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Runs all scenario tests for the story"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["logout"]}],"then":[],"example":[]}},{"scenario_id":2,"name":"Fail Finding Button due to wrong Hover-Text","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://seed-test-frontend.herokuapp.com/#"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["TESTRuns all scenario tests for the story"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["logout"]}],"then":[],"example":[]}}],"background":{"name":"Login","stepDefinitions":{"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://seed-test-frontend.herokuapp.com/login"]},{"id":4,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["adessoCucumber","githubName"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["bef00afd223c0bcdaa18a43808f9e71d13bded9b","token"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["loginButton"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["repository_0"]}]}}};
            let returnValue = helper.getStoryByID(issueID, stories);
            expect(returnValue).toEqual(selectedStory);
        });

        it('should return null', function(){
            let issueID = 1;
            let selectedStory = null;
            let returnValue = helper.getStoryByID(issueID, stories);
            expect(returnValue).toBe(selectedStory);
        });
    })
    
    //describe('setOptions', function(){
    //    it('should set the options', function(){
    //        let reportTime = Date.now();
    //        helper.setOptions(reportTime);
    //        expect(helper.options.metadata.Platform).toBe(process.platform);
    //        expect(helper.options.name).toBe('Seed-Test Report');
    //        expect(helper.options.jsonFile).toBe(`features/reporting_${reportTime}.json`);
    //        expect(helper.options.output).toBe(`features/reporting_html_${reportTime}.html`);
    //    });
    //})

    //describe('fuseGitwitDb', function(){
    //    it('should fuse with db', function(){
    //        expect(returnValue).toBe(testResultString);
    //    });
    //})

  });
