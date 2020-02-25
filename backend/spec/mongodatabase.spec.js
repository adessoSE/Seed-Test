const mongo = require('../src/database/mongodatabase');

describe("Mongodatabase", function() {
 describe("getOneStory", function() {
     it("return null", function(done) {
         mongo.getOneStory(-1, function(result){
             expect(result).toBe(null);
             done();
         })
     });

     it("return story", function(done) {
         let story = {"_id":null,"story_id":540215588,"assignee":"dsorna","assignee_avatar_url":"https://avatars3.githubusercontent.com/u/44997601?v=4","background":null,"body":"HTML-Elemente wie Buttons, Textfelder, etc. via ihrem Hover-Text finden.","issue_number":67,"scenarios":[{"scenario_id":1,"name":"Find Button By Hover-Text","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://seed-test-frontend.herokuapp.com/"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Runs all scenario tests for the story"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["logout"]}],"then":[],"example":[]}},{"scenario_id":2,"name":"Fail Finding Button due to wrong Hover-Text","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://seed-test-frontend.herokuapp.com/#"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["TESTRuns all scenario tests for the story"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["logout"]}],"then":[],"example":[]}}],"state":"open","title":"Finden eines Elements über den Hover-Text"}
         //"_id":"5dfb4e289c78e1aa7ec05042",

         mongo.getOneStory(540215588, function(result){
             result._id = null
             expect(result).toEqual(story);
             done();
         })
     });
 });

 describe("showSteptypes", function() {
     it("returns all steptypes", function(done) {
         let stepTypes = [{"_id":null,"id":"","stepType":"when","type":"HoverOverAndSelect","pre":"I hover over the element","mid":"and select the option","values":["",""]},{"_id":null,"id":"","stepType":"when","type":"Textfield","pre":"I insert","mid":"into the field","values":["",""]},{"_id":null,"id":"","stepType":"when","type":"Dropdown","pre":"I select the option","mid":"from the drop-down-menue","values":["",""]},{"_id":null,"id":"","stepType":"then","type":"Website","pre":"So I will be navigated to the website:","mid":"","values":[""]},{"_id":null,"id":"","stepType":"given","type":"Role","pre":"As a","mid":"","values":[""],"selection":["Guest","User"]},{"_id":null,"id":"","stepType":"given","type":"Website","pre":"I am on the website:","mid":"","values":[""]},{"_id":null,"id":"","stepType":"when","type":"Radio","pre":"I select ","mid":"from the selection","values":["",""]},{"_id":null,"id":"","stepType":"when","type":"Checkbox","pre":"I select from the","mid":"multiple selection, the values","values":["",""]},{"_id":null,"id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":[""]},{"_id":null,"id":"","stepType":"when","type":"Website","pre":"I go to the website:","mid":"","values":[""]},{"_id":null,"id":"","stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["",""]},{"_id":null,"id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]},{"_id":null,"id":"","stepType":"then","type":"Not This Text","pre":"So I can't see the text:","mid":"","values":[""]},{"_id":null,"id":"","stepType":"given","type":"Undefined Step","pre":"Recommended Title:","mid":"","values":[""]},{"_id":null,"id":"","stepType":"when","type":"Undefined Step","pre":"Recommended Title:","mid":"","values":[""]},{"_id":null,"id":"","stepType":"then","type":"Undefined Step","pre":"Recommended Title:","mid":"","values":[""]}]
         stepTypes = JSON.stringify(stepTypes);
         mongo.showSteptypes(function(result){
             result.map((s) => s._id = null);
             result = JSON.stringify(result);
             expect(result).toContain(stepTypes[0]);
             expect(result).toContain(stepTypes[1]);
             expect(result).toContain(stepTypes[2]);
             expect(result).toContain(stepTypes[3]);
             expect(result).toContain(stepTypes[4]);
             expect(result).toContain(stepTypes[5]);
             expect(result).toContain(stepTypes[6]);
             expect(result).toContain(stepTypes[7]);
             expect(result).toContain(stepTypes[8]);
             expect(result).toContain(stepTypes[9]);
             expect(result).toContain(stepTypes[10]);
             expect(result).toContain(stepTypes[11]);
             expect(result).toContain(stepTypes[12]);
             expect(result).toContain(stepTypes[13]);
             expect(result).toContain(stepTypes[14]);
             expect(result).toContain(stepTypes[15]);
             done();
         })
     });
 });

 //describe("createBackground", function() {
 //    let storyId = 386692544;
//
 //    afterEach(function(done) {
 //        mongo.deleteBackground(storyId, function(result){
 //          done();
 //        })
 //      });
 //    it("creates Background", function(done) {
 //        let background = '"background":{"name":"New Background","stepDefinitions":{"when":[]}}'
 //        mongo.createBackground(storyId, function(result){
 //            result._id = null;
 //            expect(JSON.stringify(result)).toContain(background);
 //            done();
 //        })
 //    });
 //});

 //describe("updateBackground", function() {
 //    let storyId = 386696070;
 //    let backgroundBefore = '';
 //    beforeEach(function (done) {
 //        mongo.getOneStory(storyId, function(result) {
 //            backgroundBefore = result.background;
 //            done();
 //        })
 //    })
//
 //    afterEach(function(done) {
 //        mongo.updateBackground(storyId, backgroundBefore, function(result){
 //           done();
 //        })
 //      });
 //    it("returns updatedBackground", function(done) {
 //        let background = {"name":"Test","stepDefinitions":{"when":[{"id":1,"mid":"from the selection","pre":"I select ","stepType":"when","type":"Radio","values":["Test","Hallo"]}]}}
 //        let backgroundString = (JSON.stringify(background));
 //        mongo.updateBackground(storyId, background, function(result){
 //            expect(JSON.stringify(result)).toContain(backgroundString);
 //            done();
 //        })
 //    });
 //});
//
 //describe("deleteBackground", function() {
 //    let storyId = 386697647;
 //    let backgroundBefore = '';
 //    beforeEach(function (done) {
 //        mongo.getOneStory(storyId, function(result) {
 //            backgroundBefore = result.background;
 //            done();
 //        })
 //    })
//
 //    afterEach(function(done) {
 //        mongo.updateBackground(storyId, backgroundBefore, function(result){
 //           done();
 //        })
 //      });
 //    it("return empty background", function(done) {
 //        let background = { "name": "New Background", "stepDefinitions":{ "when": [  ] }};
 //        mongo.deleteBackground(storyId, function(result){
 //            expect(result.background).toEqual(background);
 //            done();
 //        })
 //    });
 //});
//
 //describe("createScenario", function() {
 //    let storyId = 386696256;
 //    let scenarioId;
 //    afterEach(function(done) {
 //        mongo.deleteScenario(storyId, scenarioId, function(result){
 //           done();
 //        })
 //      });
 //    it("creates a new scenario", function(done) {
 //        let scenario = {"scenario_id":null, "comment"=null, name":"New Scenario","stepDefinitions":{"given":[],"when":[],"then":[],"example":[]}};
 //        
 //        mongo.createScenario(storyId, function(result){
 //            scenarioId = result.scenario_id;
 //            result.scenario_id = null
 //            expect(result).toEqual(scenario);
 //            done();
 //        })
 //    });
 //});
//
 //describe("deleteScenario", function() {
 //    let storyId = 386693823;
 //    let scenarioId;
//
 //    beforeEach(function(done) {
 //        mongo.createScenario(storyId, function(result){
 //            scenarioId = result.scenario_id;
 //            done();
 //        })
 //      });
 //    it("creates a new scenario", function(done) {
 //        let scenario = `{"scenario_id":${scenarioId}`
 //        mongo.deleteScenario(storyId, scenarioId, function(result){
 //            expect(JSON.stringify(result)).not.toContain(scenario);
 //            done();
 //        })
 //    });
 //});
//
 //describe("updateScenario", function() {
 //    let storyId = 386692174;
 //    let oldScenario;
 //    let scenarioId;
//
 //    beforeEach(function(done) {
 //        mongo.createScenario(storyId, function(result){
 //            oldScenario = result;
 //            scenarioId = result.scenario_id;
 //            done();
 //        })
 //      });
//
 //    afterEach(function(done) {
 //       mongo.deleteScenario(storyId, scenarioId, function(result){
 //           done();
 //       })
 //      });
//
 //    it("updated story", function(done) {
 //        let updateScenario = oldScenario;
 //        let newName = 'test';
 //        updateScenario.name = newName;
 //        mongo.updateScenario(storyId, updateScenario, function(result){
 //            expect(result.scenarios[scenarioId-1].name).toEqual(newName)
 //            done();
 //        })
 //    });
 //});
});