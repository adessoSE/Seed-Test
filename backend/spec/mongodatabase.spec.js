process.env.DATABASE_URI='mongodb+srv://Seed-Tester:Z3ddLKExHIVxU0KT@seed.a9qkg.mongodb.net/?retryWrites=true&w=majority'
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
        "_id": null,
        "story_id": 0,
        "assignee": "unassigned",
        "title": "for get One Story",
        "body": "Some Explanation for this Story",
        "issue_number": 0,
        "background": {
          "name": "New Background",
          "stepDefinitions": {
            "when": []
          }
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
                  "values": [
                    "http://adesso.de/"
                  ]
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
      // "_id":"62df9c47dbf47cea2e9c38dc",

      mongo.getOneStory("62df9c47dbf47cea2e9c38dc", null).then( (result) => {
        result._id = null;
        expect(result).toEqual(story);
        done();
      });
    });
  });

  describe('updateBackground', () => {
    const story_id = "62df9c47dbf47cea2e9c38dc"
    let backgroundBefore = { name: 'New Background', stepDefinitions: { when: [] } };
    beforeEach((done) => {
      mongo.getOneStory(story_id, null)
      .then( (result) => {
        backgroundBefore = result.background;
        done();
      });
    });

    afterEach((done) => {
      mongo.updateBackground(story_id, null, backgroundBefore)
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
      mongo.updateBackground(story_id, null, background)
      .then( (result) => {
        expect(JSON.stringify(result)).toContain(backgroundString);
        done();
      });
    });
  });

  describe('deleteBackground', () => {
    const story_id = "62df9c47dbf47cea2e9c38dc"
    let backgroundBefore = { name: 'New Background', stepDefinitions: { when: [] } }
    beforeEach((done) => {
      mongo.getOneStory(story_id, null)
      .then( (result) => {
        backgroundBefore = result.background;
        done();
      });
    });

    afterEach((done) => {
      mongo.updateBackground(story_id, null, backgroundBefore)
      .then( (result) => {
        done();
      });
    });
    it('return empty background', (done) => {
      const background = { name: 'New Background', stepDefinitions: { when: [] } };
      mongo.deleteBackground(story_id, null)
      .then( (result) => {
        expect(result.background).toEqual(background);
        done();
      });
    });
  });

  describe('createScenario', () => {
    const story_id = "62df9c47dbf47cea2e9c38dc"
    let scenarioId;
    afterEach((done) => {
      mongo.deleteScenario(story_id, null, scenarioId)
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

      mongo.createScenario(story_id, null, 'New Scenario')
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
    const story_id = "62df9c47dbf47cea2e9c38dc"

    beforeEach((done) => {
      mongo.createScenario(story_id, null, 'New Scenario')
      .then( (result) => {
        scenarioId = result.scenario_id;
        done();
      });
    });
    it('deletes a new scenario', async() => {
      const scenario = `{"scenario_id":${scenarioId}`;
      return mongo.deleteScenario(story_id, null, scenarioId)
      .then( (result) => {
        expect(JSON.stringify(result)).not.toContain(scenario);
      });
    });
  });

  describe('updateScenario', () => {
    let oldScenario;
    let scenarioId;
    const story_id = "62df9c47dbf47cea2e9c38dc"

    beforeEach((done) => {
      mongo.createScenario(story_id, null, 'New Scenario')
      .then( (result) => {
        oldScenario = result;
        scenarioId = result.scenario_id;
        done();
      });
    });

    afterEach((done) => {
      mongo.deleteScenario(story_id, null, scenarioId)
      .then( (result) => {
        done();
      });
    });

    it('updated story', (done) => {
      const updateScenario = oldScenario;
      const newName = 'test';
      updateScenario.name = newName;
      mongo.updateScenario(story_id, null, updateScenario)
      .then( (result) => {
        expect(result.name).toEqual(newName);
        done();
      });
    });
  });
});
