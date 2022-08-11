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

  describe('update Story', () => {
    let orgStory;
    const story_id = "62b337b27f37a55f60836b0a"
    beforeEach(async() => {
      orgStory = {...await mongo.getOneStory(story_id, null)}//deep copy
    })
    afterEach(async() => {
      return mongo.updateStory(orgStory)
    })
    it('updates Story', async() => {
      const upStory = {...orgStory};
      upStory.title = 'Updated Story'
      //upStory.story_id = '5'
      const newStory = await mongo.updateStory(upStory).then((res)=>res.value)
      console.log("updated ", newStory);
      expect(newStory.title).toEqual(upStory.title)
    })
  })


  describe('create repository', () => {
    let repoId;
    const ownerId = '313233343536373839303132' //fictional -> owner not in db
    const name = 'Test'
    it('creates a db repo',async() => {
      repoId = await mongo.createRepo(ownerId, name).catch((err)=>console.error(err))
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
    /* it('creates a db repo empty fails',async() => {
      expect( await mongo.createRepo(ownerId, '')).rejects.toEqual('Sie besitzen bereits ein Repository mit diesem Namen!')
    }) */
    afterEach((done)=>{
      mongo.deleteRepository(repoId, ownerId).then(()=>done())
    })
  })

  describe('delete repository', () => {
    let repoId;
    const ownerId = '123456789012'
    const name = 'Test'
    beforeEach(async ()=> {
      repoId = await mongo.createRepo(ownerId, name).catch((err)=>console.error("delRepo before",err))
      console.log(repoId);
    })
    it('deletes repo', (done)=>{
      mongo.deleteRepository(repoId, ownerId)
      .then((ret)=>{
        expect(ret.deletedCount).toEqual(1)
        done()
      })
    })
    test.skip('deletes orphan stories', async() => {
      const stories = await Promise.all([
        mongo.createStory('Test','Hallo Test', repoId).then(async(stId)=>{await mongo.insertStoryIdIntoRepo(stId, repoId);return stId}),
        mongo.createStory('Test1','Hallo Test1', repoId).then(async(stId)=>{await mongo.insertStoryIdIntoRepo(stId, repoId);return stId}) 
      ])
      
      console.log("stories", stories);
      
      await mongo.deleteRepository(repoId, ownerId)
      .then((ret)=>{
        expect(ret.deletedCount).toEqual(1)
      })
    })
    test.skip('deletes orphan workgroup',()=>{})
    test.skip('deletes orphan Reports',()=>{})

  })

  describe('user', () => {
    it('creates user', async() => {
      const uid = await mongo.registerUser({email:'test@test.org', password: 'abcdefg'})
      .then((res)=>{
        expect(res.insertedCount).toEqual(1)
        return res.insertedId;
      })

      await mongo.deleteUser(uid).then((res)=>{
        const {resultUser, resultRepo} = res
        expect(resultUser.deletedCount).toEqual(1)
      })
    })

    test.skip('deletes userRepos',()=>{})
  })

  describe('Workgroup', () => {
    let repoId;
    let ownerId;
    const repoOwner = {email: "test@test.org", password: 'abcdefg', canEdit: false}
    const user = {email: "test2@test.org", canEdit: false}
    beforeEach(async()=>{
      ownerId = await mongo.registerUser(repoOwner).then((res)=>res.insertedId)
      repoId = await mongo.createRepo(ownerId, 'Test')
      console.log("wg own & repo Id's", ownerId, repoId)
    })

    it('creates a Workgroup', async() => {
      await mongo.addMember(repoId, user)
      .then((res)=>{
        console.log("workgroup", res)
        expect(res.member.find((it)=>it.email === user.email)).toBeTruthy()
      });
    })

    it('removes a member from Workgroup', async() => {
      await mongo.addMember(repoId, user)
      await mongo.removeFromWorkgroup(repoId, user)
      .then((res)=>{
        expect(!!res.member.find((it)=>it.email === user.email)).toBe(false)
      })
    })

    afterEach(async()=>{
      mongo.deleteRepository(repoId, ownerId)
      await mongo.deleteUser(ownerId.toString())
      // currently no way to cleanup(delete) workgroups
    })
  })

  afterAll(() => {
    //close db connection
  })

});
