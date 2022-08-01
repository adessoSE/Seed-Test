const path = require('path');
require('dotenv').config({path: path.resolve(__dirname, './support/.env')})
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
      // "_id":"62b337b27f37a55f60836b0a",

      mongo.getOneStory("62b337b27f37a55f60836b0a", null).then( (result) => {
        result._id = null;
        expect(result).toEqual(story);
        done();
      });
    });
  });

  describe('background', () => {
    const story_id = "62b337b27f37a55f60836b0a"
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

  describe('createScenario', () => {
    const story_id = "62b337b27f37a55f60836b0a"
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


  describe('scenario', () => {
    let oldScenario;
    let scenarioId;
    const story_id = "62b337b27f37a55f60836b0a"

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

    it('updates Scenario', (done) => {
      const updateScenario = oldScenario;
      const newName = 'test';
      updateScenario.name = newName;
      mongo.updateScenario(story_id, null, updateScenario)
      .then( (result) => {
        expect(result.name).toEqual(newName);
        done();
      });
    });

    it('deletes a scenario', async() => {
      const scenario = `{"scenario_id":${scenarioId}`;
      return mongo.deleteScenario(story_id, null, scenarioId)
      .then( (result) => {
        expect(JSON.stringify(result)).not.toContain(scenario);
      });
    });
  });


  describe('create repository', () => {
    let repoId;
    const ownerId = '313233343536373839303132' //fictional -> owner not in db
    const name = 'Test'
    it('creates a db repo',async() => {
      repoId = await mongo.createRepo(ownerId, name).catch((err)=>console.error(err))
      console.log(repoId);
      await mongo.getOneRepository(ownerId, name)
      .then((repo)=>{
        repo._id = null
        repo.owner = repo.owner.toString()
        expect(repo).toEqual({
          _id: null,
          owner: ownerId, repoName: name, stories: [], repoType: 'db', customBlocks: [], groups: []
        })
      })
    })
    afterEach((done)=>{
      mongo.deleteRepository(repoId, ownerId).then(()=>done())
    })
  })

  describe('delete repository', () => {
    let repoId;
    const ownerId = '123456789012'
    const name = 'Test'
    beforeEach(async ()=> {
      repoId = await mongo.createRepo(ownerId, name).catch((err)=>console.error(err))
      console.log(repoId);
    })
    it('deletes repo', (done)=>{
      mongo.deleteRepository(repoId, ownerId)
      .then((ret)=>{
        console.log(ret)
        expect(ret.deletedCount).toEqual(1)
        done()
      })
    })
    it('deletes orphan stories', async(done)=> {
      const stories = [];
      await Promise.all([
        mongo.createStory('Test','Hallo Test', repoId), 
        mongo.createStory('Test1','Hallo Test1', repoId)
      ]).then((storyIds)=> stories.push(storyIds))
      
      expect(await mongo.deleteRepository(repoId, ownerId).then((ret)=>ret.acknowledged)).toEqual(true)
    })
  })

});
