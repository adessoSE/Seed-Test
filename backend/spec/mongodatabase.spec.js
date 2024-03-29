const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './support/.env') });
const mongo = require('../src/database/DbServices');

describe('DbServices', () => {
	beforeAll(async () => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		jest.useRealTimers();
	});
	describe('getOneStory', () => {
		it('return null', (done) => {
			mongo.getOneStory(-1).then((result) => {
				expect(result).toBe(null);
				done();
			});
		});

		it('return story', (done) => {
			const story = {
				_id: null,
				story_id: 0,
				assignee: 'unassigned',
				title: 'for get One Story',
				body: 'Some Explanation for this Story',
				issue_number: 0,
				background: {
					name: 'New Background',
					stepDefinitions: {
						when: []
					}
				},
				scenarios: [{
					scenario_id: 1,
					name: 'First Scenario',
					comment: null,
					stepDefinitions: {
						given: [],
						when: [{
							id: 1,
							mid: '',
							pre: 'I go to the website:',
							stepType: 'when',
							type: 'Go To Website / URL',
							values: [
								'http://adesso.de/'
							]
						}],
						then: [],
						example: []
					},
					lastTestPassed: null
				}],
				storySource: 'db',
				repo_type: 'db',
				state: 'open',
				assignee_avatar_url: null,
				lastTestPassed: null,
				oneDriver: false
			};
			// "_id":"62b337b27f37a55f60836b0a",

			mongo.getOneStory('62b337b27f37a55f60836b0a').then((result) => {
				result._id = null;
				expect(result).toEqual(story);
				done();
			});
		});
	});

	describe('background', () => {
		const story_id = '62b337b27f37a55f60836b0a';
		let backgroundBefore = { name: 'New Background', stepDefinitions: { when: [] } };
		beforeEach((done) => {
			mongo.getOneStory(story_id)
				.then((result) => {
					backgroundBefore = result.background;
					done();
				});
		});

		afterEach((done) => {
			mongo.updateBackground(story_id, backgroundBefore)
				.then((result) => {
					done();
				});
		});
		it('return empty background', (done) => {
			const background = { name: 'New Background', stepDefinitions: { when: [] } };
			mongo.deleteBackground(story_id)
				.then((result) => {
					expect(result.background).toEqual(background);
					done();
				});
		});

		it('returns updatedBackground', (done) => {
			const background = {
				name: 'Test',
				stepDefinitions: {
					when: [{
						id: 1, mid: 'from the selection', pre: 'I select ', stepType: 'when', type: 'Radio', values: ['Test', 'Hallo']
					}]
				}
			};
			const backgroundString = (JSON.stringify(background));
			mongo.updateBackground(story_id, background)
				.then((result) => {
					expect(JSON.stringify(result)).toContain(backgroundString);
					done();
				});
		});
	});

	describe('createScenario', () => {
		const story_id = '62b337b27f37a55f60836b0a';
		let scenarioId;
		afterEach((done) => {
			mongo.deleteScenario(story_id, scenarioId)
				.then((result) => {
					done();
				});
		});
		it('creates a new scenario', (done) => {
			const scenario = {
				scenario_id: null,
				comment: null,
				name: 'New Scenario',
				stepDefinitions: {
					given: [], when: [], then: [], example: []
				}
			};

			mongo.createScenario(story_id, 'New Scenario')
				.then((result) => {
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
		const story_id = '62b337b27f37a55f60836b0a';

		beforeEach((done) => {
			mongo.createScenario(story_id, 'New Scenario')
				.then((result) => {
					oldScenario = result;
					scenarioId = result.scenario_id;
					done();
				});
		});

		afterEach((done) => {
			mongo.deleteScenario(story_id, scenarioId)
				.then((result) => {
					done();
				});
		});

		it('updates Scenario', (done) => {
			const updateScenario = oldScenario;
			const newName = 'test';
			updateScenario.name = newName;
			mongo.updateScenario(story_id, updateScenario)
				.then((result) => {
					expect(result.name).toEqual(newName);
					done();
				});
		});

		it('deletes a scenario', async () => {
			const scenario = `{"scenario_id":${scenarioId}`;
			return mongo.deleteScenario(story_id, scenarioId)
				.then((result) => {
					expect(JSON.stringify(result)).not.toContain(scenario);
				});
		});
	});

	describe('update Story', () => {
		let orgStory;
		const story_id = '62b337b27f37a55f60836b0a';
		beforeEach(async () => {
			orgStory = { ...await mongo.getOneStory(story_id) };// deep copy
		});
		afterEach(async () => mongo.updateStory(orgStory));
		it('updates Story', async () => {
			const upStory = { ...orgStory };
			upStory.title = 'Updated Story';
			// upStory.story_id = '5'
			const newStory = await mongo.updateStory(upStory).then((res) => res.value);
			console.log('updated ', newStory);
			expect(newStory.title).toEqual(upStory.title);
		});
	});

	describe('create repository', () => {
		let repoId;
		const ownerId = '313233343536373839303132'; // fictional -> owner not in db
		const name = 'Test';
		it('creates a db repo', async () => {
			repoId = await mongo.createRepo(ownerId, name).catch((err) => console.error(err));
			await mongo.getOneRepository(ownerId, name)
				.then((repo) => {
					repo._id = null;
					repo.owner = repo.owner.toString();
					expect(repo).toEqual({
						_id: null,
						owner: ownerId,
						repoName: name,
						stories: [],
						repoType: 'db',
						customBlocks: [],
						groups: []
					});
				});
		});
		/* it('creates a db repo empty fails',async() => {
      expect( await mongo.createRepo(ownerId, '')).rejects.toEqual('Sie besitzen bereits ein Repository mit diesem Namen!')
    }) */
		afterEach((done) => {
			mongo.deleteRepository(repoId, ownerId).then(() => done());
		});
	});

	describe('delete repository', () => {
		let repoId;
		const ownerId = '123456789012';
		const name = 'Test';
		beforeEach(async () => {
			repoId = await mongo.createRepo(ownerId, name).catch((err) => console.error('delRepo before', err));
			console.log(repoId);
		});
		it('deletes repo', (done) => {
			mongo.deleteRepository(repoId, ownerId)
				.then((ret) => {
					expect(ret.deletedCount).toEqual(1);
					done();
				});
		});
		test.skip('deletes orphan stories', async () => {
			const stories = await Promise.all([
				mongo.createStory('Test', 'Hallo Test', repoId).then(async (stId) => { await mongo.insertStoryIdIntoRepo(stId, repoId); return stId; }),
				mongo.createStory('Test1', 'Hallo Test1', repoId).then(async (stId) => { await mongo.insertStoryIdIntoRepo(stId, repoId); return stId; })
			]);

			console.log('stories', stories);

			await mongo.deleteRepository(repoId, ownerId)
				.then((ret) => {
					expect(ret.deletedCount).toEqual(1);
				});
		});
		test.skip('deletes orphan workgroup', () => { });
		test.skip('deletes orphan Reports', () => { });
	});

	describe('user', () => {
		const user = { email: 'test@test.org', password: 'abcdefg' };
		let userId;
		afterAll(async () => mongo.deleteUser(userId).then((res) => {
			const { resultUser, resultRepo } = res;
			expect(resultUser.deletedCount).toEqual(1);
		}));

		it('creates user', async () => {
			userId = await mongo.registerUser(user)
				.then((res) => {
					expect(res.insertedCount).toEqual(1);
					return res.insertedId;
				});
		});
		it('fails double user', async () => {
			await expect(await mongo.registerUser(user).catch((err) => err)).toEqual(Error('User already exists'));
		});

		test.skip('deletes userRepos', () => { });
	});

	describe('github', () => {
		let userId;
		const userGithub = { login: 'test', id: 123456, githubToken: '12ab34cd56ef78gh' };
		let githubUserId;
		beforeAll(async () => {
			userId = await mongo.registerUser({ email: 'test@test.org', password: 'abcdefg' }).then((res) => res.insertedId);
		});

		test('register a github user', async () => {
			githubUserId = await mongo.findOrRegisterGithub(userGithub).then((res) => res.insertedId);
		});

		test('merge user&github standart', async () => {
			await mongo.mergeGithub(userId, userGithub.login, userGithub.id);
			expect(await mongo.getUserById(githubUserId)).toBeFalsy();
			await mongo.deleteUser(userId);
		});
	});

	describe('Workgroup', () => {
		let repoId;
		let ownerId;
		const repoOwner = { email: 'test@test.org', password: 'abcdefg', canEdit: false };
		const user = { email: 'test2@test.org', canEdit: false };
		beforeEach(async () => {
			ownerId = await mongo.registerUser(repoOwner).then((res) => res.insertedId);
			repoId = await mongo.createRepo(ownerId, 'Test');
			console.log('wg own & repo Id\'s', ownerId, repoId);
		});

		it('creates a Workgroup', async () => {
			const wg = await mongo.addMember(repoId, user)
				.then((res) => {
					console.log('workgroup', res);
					expect(res.member.find((it) => it.email === user.email)).toBeTruthy();
					return res;
				});
			await mongo.getMembers(repoId)
				.then((res) => {
					expect(res).toEqual(wg);
				});
			user.canEdit = true;
			await mongo.updateMemberStatus(repoId, user)
				.then((res) => {
					expect(res.member.find((it) => it.email === user.email).canEdit).toBe(true);
				});
		});

		it('removes a member from Workgroup', async () => {
			await mongo.addMember(repoId, user);
			await mongo.removeFromWorkgroup(repoId, user)
				.then((res) => {
					expect(!!res.member.find((it) => it.email === user.email)).toBe(false);
				});
		});

		afterEach(async () => {
			mongo.deleteRepository(repoId, ownerId);
			await mongo.deleteUser(ownerId.toString());
			// currently no way to cleanup/delete workgroups
		});
	});

	describe('Blocks', () => {
		const block = {
			name: 'aaa', stepDefinitions: {}, repository: '', source: '', repositoryId: '123456789112', owner: '123456789012'
		};
		let blockId;

		it('creates a Block', async () => {
			blockId = await mongo.saveBlock(block).then((res) => res.insertedId);
		});
		test.skip('updates a Block', async () => {
			const upBlock = block;
			upBlock.name = 'aba';
			await mongo.updateBlock(block.name, upBlock);
			return mongo.getBlocks(block.repositoryId).then((res) => console.log(res));
		});
		it('gets all Blocks of repo', async () => {
			await mongo.getBlocks(block.repositoryId).then((res) => {
				expect(new Set(res.map((it) => it.repositoryId.toString())).size).toEqual(1);
			});
		});
		it('deletes a Block', async () => {
			await mongo.deleteBlock(blockId, block.owner).then((res) => console.log(res));
		});
	});

	afterAll(() => {
		// close db connection
	});
});
