process.env.DATABASE_URI='mongodb+srv://Seed-Admin:KkPuqMeGUfgpyTVp@seed-tsqv2.mongodb.net/test?authSource=admin&replicaSet=Seed-shard-0&w=majority&readPreference=primary&retryWrites=true&ssl=true'
//TODO Change to Test database once that is up
const mongo = require('../src/database/DbServices');

describe('Mongodatabase', () => {
  beforeAll(async()=>{
    await new Promise(resolve=>setTimeout(resolve, 1000))
    jest.useRealTimers();
  })
  describe('getOneStory', () => {
    it('return null', (done) => {
      mongo.getOneStory(-1, null).then((result) => {
        expect(result).toBe(null);
        done();
      });
    });

    it('return story', (done) => {
      const story = {  
        "_id": "62b337b27f37a55f60836b0a" , 
        "story_id": 0,  
        "assignee": "unassigned",  
        "title": "for get One Story",  
        "body": "Some Explanation for this Story",  
        "issue_number": 0,  
        "background": {    
         "name": "New Background",   
         "stepDefinitions": {"when": []}
        },
          "scenarios": [{
            "scenario_id": 1,
            "name": "First Scenario",
            "comment": null,
            "stepDefinitions": {
              "given": [],
              "when": [{
                "id": 1,
                "mid": "",
                "pre": "I go to the website:",
                "stepType": "when",
                "type": "Go To Website / URL",
                "values": ["http://adesso.de/"]
              }],
              "then": [],
              "example": []
            },      
            "lastTestPassed": null
            }, {
              "scenario_id": 2,
              "name": "multiple Scenarios",
              "comment": null,
              "stepDefinitions": {
                "given": [],
                "when": [{ 
                  "id": 1,
                  "mid": "",
                  "pre": "I go to the website:",            
                  "stepType": "when",
                  "type": "Go To Website / URL",            
                  "values": ["http://google.com"]
                }],
                "then": [],
                "example": []
              },      
              "lastTestPassed": null
            }],  
      "storySource": "db",  
      "repo_type": "db",  
      "state": "open",  
      "assignee_avatar_url": null,  
      "lastTestPassed": null,  
      "oneDriver": false
    }
      // "_id":"62b337b27f37a55f60836b0a",

      mongo.getOneStory("62b337b27f37a55f60836b0a", null).then( (result) => {
        result._id = null;
        expect(result).toEqual(story);
        done();
      });
    });
  });

  describe('updateBackground', () => {
    let backgroundBefore = { name: 'New Background', stepDefinitions: { when: [] } };
    beforeEach((done) => {
      mongo.getOneStory("62b337b27f37a55f60836b0a", null).then( (result) => {
        backgroundBefore = result.background;
        done();
      });
    });

    afterEach((done) => {
      mongo.updateBackground("62b337b27f37a55f60836b0a", backgroundBefore)
      .then( (result) => {
        done();
      });
    });
    it('returns updatedBackground', (done) => {
      const background = {
        name: 'Test',
        stepDefinitions: {
          when: [{
            id: 1, mid: 'from the selection', pre: 'I select ', stepType: 'when', type: 'Radio', values: ['Test', 'Hallo'],
          }],
        },
      };
      const backgroundString = (JSON.stringify(background));
      mongo.updateBackground(storyId, background)
      .then( (result) => {
        expect(JSON.stringify(result)).toContain(backgroundString);
        done();
      });
    });
  });

  describe('deleteBackground', () => {
    let backgroundBefore = { name: 'New Background', stepDefinitions: { when: [] } }
    beforeEach((done) => {
      mongo.getOneStory("62b337b27f37a55f60836b0a")
      .then( (result) => {
        backgroundBefore = result.background;
        done();
      });
    });

    afterEach((done) => {
      mongo.updateBackground("62b337b27f37a55f60836b0a", backgroundBefore)
      .then( (result) => {
        done();
      });
    });
    it('return empty background', (done) => {
      const background = { name: 'New Background', stepDefinitions: { when: [] } };
      mongo.deleteBackground("62b337b27f37a55f60836b0a")
      .then( (result) => {
        expect(result.background).toEqual(background);
        done();
      });
    });
  });
  describe('createScenario', () => {
    let scenarioId;
    afterEach((done) => {
      mongo.deleteScenario("62b337b27f37a55f60836b0a", scenarioId)
      .then( (result) => {
        done();
      });
    });
    it('creates a new scenario', (done) => {
      const scenario = {
        scenario_id: null,
        comment: null,
        name: 'New Scenario',
        stepDefinitions: {
          given: [], when: [], then: [], example: [],
        },
      };

      mongo.createScenario("62b337b27f37a55f60836b0a")
      .then( (result) => {
        scenarioId = result.scenario_id;
        result.scenario_id = null;
        expect(result).toEqual(scenario);
        done();
      });
    });
  });

  describe('deleteScenario', () => {
    let scenarioId;

    beforeEach((done) => {
      mongo.createScenario("62b337b27f37a55f60836b0a")
      .then( (result) => {
        scenarioId = result.scenario_id;
        done();
      });
    });
    it('deletes a new scenario', (done) => {
      const scenario = `{"scenario_id":${scenarioId}`;
      mongo.deleteScenario("62b337b27f37a55f60836b0a", scenarioId)
      .then( (result) => {
        expect(JSON.stringify(result)).not.toContain(scenario);
        done();
      });
    });
  });

  describe('updateScenario', () => {
    let oldScenario;
    let scenarioId;

    beforeEach((done) => {
      mongo.createScenario("62b337b27f37a55f60836b0a")
      .then( (result) => {
        oldScenario = result;
        scenarioId = result.scenario_id;
        done();
      });
    });

    afterEach((done) => {
      mongo.deleteScenario("62b337b27f37a55f60836b0a", scenarioId)
      .then( (result) => {
        done();
      });
    });

    it('updated story', (done) => {
      const updateScenario = oldScenario;
      const newName = 'test';
      updateScenario.name = newName;
      mongo.updateScenario("62b337b27f37a55f60836b0a", updateScenario)
      .then( (result) => {
        expect(result.scenarios[scenarioId - 1].name).toEqual(newName);
        done();
      });
    });
  });
});
