/* eslint-disable consistent-return */
/* eslint-disable line-comment-position */
/* eslint-disable no-param-reassign */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-await-in-loop */
/* eslint-disable curly */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
const { ObjectId } = require('mongodb');
const str = require('string-to-stream');
const toString = require('stream-to-string');
const assert = require('assert');
const mongodb = require('mongodb');
const fs = require('fs');
const Collection = require('mongodb/lib/collection');
const AdmZip = require('adm-zip');
const os = require('os');
const dbConnection = require('./DbConnector');
const emptyStory = require('../models/emptyStory');
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const userCollection = 'User';
const storiesCollection = 'Stories';
const repositoriesCollection = 'Repositories';
const stepTypesCollection = 'stepTypes';
const PwResetReqCollection = 'PwResetRequests';
const CustomBlocksCollection = 'CustomBlocks';
const WorkgroupsCollection = 'Workgroups';
const ReportDataCollection = 'ReportData';
const ReportsCollection = 'Reports';

// TODO: die eigene Methode replace kann oft durch die MongoMethode findOneAndReplace ersetzt werden!

// Opening a pooling Database Connection via DbConnector
dbConnection
	.establishConnection()
	.then(() => console.log(
		'\x1b[32m%s\x1b[0m \x1b[33m%s\x1b[0m',
		'Connected to database @',
		dbConnection.getConnection().client.s.options.srvHost
	));

/**
 * Writes a PasswordResetRequest in the DB
 * @param {*} request
 * @returns inserted request
 */
async function createResetRequest(request) {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(PwResetReqCollection).insertOne(request);
	} catch (e) {
		console.error(`ERROR im ResetRequest: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} id
 * @returns PasswordResetRequest
 */
async function getResetRequest(id) {
	try {
		const db = dbConnection.getConnection();
		const query = { uuid: id.toString() };
		return await db.collection(PwResetReqCollection).findOne(query);
	} catch (e) {
		console.error(`ERROR in getResetRequest: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} mail
 * @returns PasswordResetRequest
 */
async function getResetRequestByEmail(mail) {
	try {
		const db = dbConnection.getConnection();
		const query = { email: mail.toString() };
		return await db.collection(PwResetReqCollection).findOne(query);
	} catch (e) {
		console.error(`ERROR in getResetRequestByEmail: ${e}`);
		throw e;
	}
}

/**
 * deletes Password reset request
 * @param {*} mail
 * @returns deletion Report
 */
async function deleteRequest(mail) {
	try {
		const db = dbConnection.getConnection();
		const query = { email: mail.toString() };
		return await db.collection(PwResetReqCollection).deleteOne(query);
	} catch (e) {
		console.error(`ERROR in deleteRequest: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} userId
 * @returns User
 */
async function getUserById(userId) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(userCollection)
			.findOne({ _id: new ObjectId(userId) });
	} catch (e) {
		console.error(`ERROR in getUserById: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} login
 * @param {*} id githubUserId
 * @returns User
 */
async function getUserByGithub(login, id) {
	try {
		const db = dbConnection.getConnection();
		if (typeof id === 'number') {
			const query = {
				$and: [{ 'github.id': id }, { 'github.login': login.toString() }]
			};
			return db.collection(userCollection).findOne(query);
		}
	} catch (e) {
		console.error(`ERROR in getUserByGithub: ${e}`);
		throw e;
	}
}

async function getUserByEmail(email) {
	try {
		const db = dbConnection.getConnection();
		const query = { email: email.toString() };
		return await db.collection(userCollection).findOne(query);
	} catch (e) {
		console.error(`ERROR in getUserByEmail: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {object} user {email:string, userId: String, password: string}
 * @returns
 */
async function registerUser(user) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(userCollection);
		const dbUser = await getUserByEmail(user.email);
		let result;
		if (dbUser !== null) throw Error('User already exists');
		else if (user.userId) {
			// update in register? attacker with userId could re-set anything
			result = await collection.updateOne(
				{ _id: new ObjectId(user.userId) },
				{ $set: { email: user.email, password: user.password } }
			);
		} else {
			delete user.userId;
			const query = { email: user.email.toString(), password: user.password };
			result = await collection.insertOne(query);
		}
		return result;
	} catch (e) {
		console.error(`ERROR in registerUser: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {object} user minimum model {login:string,  id:number, githubToken:string}
 * @returns
 */
async function registerGithubUser(user) {
	try {
		const db = dbConnection.getConnection();
		user = mongoSanitize(user);
		return await db.collection(userCollection).insertOne({ github: user });
	} catch (e) {
		console.error(`ERROR in registerGithubUser: ${e}`);
		throw e;
	}
}

/**
 * replaces a User in the DB
 * @param {*} newUser
 * @param {Collection} collection
 * @returns
 */
function replaceUser(newUser, collection) {
	const myObjt = { _id: new ObjectId(newUser._id) };
	return collection.findOneAndReplace(myObjt, newUser);
}

async function updateGithubToken(objId, updatedToken) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(userCollection)
			.updateOne(
				{ _id: new ObjectId(objId) },
				{ $set: { 'github.githubToken': updatedToken } }
			);
	} catch (e) {
		console.error(`ERROR in updateGithubToken: ${e}`);
		throw e;
	}
}

async function findOrRegisterGithub(user) {
	let result = await getUserByGithub(user.login, user.id);
	if (!result) result = await registerGithubUser(user);
	else result = await updateGithubToken(result._id, user.githubToken);
	return result;
}

async function mergeGithub(userId, login, id) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(userCollection);
		const githubAccount = await getUserByGithub(login, id);
		const seedAccount = await getUserById(userId);
		seedAccount.github = githubAccount.github;
		if (
			githubAccount.hasOwnProperty('jira')
      && !seedAccount.hasOwnProperty('jira')
		) seedAccount.jira = githubAccount.jira;

		if (githubAccount.email) {
			delete githubAccount.github;
			await replaceUser(githubAccount, collection);
		} else await deleteUser(githubAccount._id);
		return await replaceUser(seedAccount, collection);
	} catch (e) {
		console.error(`ERROR in mergeGithub: ${e}`);
		throw e;
	}
}

/**
 *
 * @returns updated UserObject
 * @param storyId
 * @param collection
 */
function findStory(storyId, collection) {
	const id = new ObjectId(storyId);
	return collection.findOne({ _id: id });
}

/**
 * replaces a Story in the DB
 * @param {*} story
 * @param {*} collection
 * @returns
 */
function replace(story, collection) {
	const filter = {
		_id: new ObjectId(story._id.toString())
	};
	story._id = new ObjectId(story._id);
	return collection.findOneAndReplace(filter, story);
}

async function disconnectGithub(user) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(userCollection);
		return await replaceUser(user, collection);
	} catch (e) {
		console.error(`ERROR in disconnectGithub: ${e}`);
		throw e;
	}
}

async function updateStory(
	updatedStory,
	session = undefined,
	client = undefined
) {
	try {
		const db = session
			? client.db('Seed', session)
			: dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		updatedStory._id = new ObjectId(updatedStory._id.toString());
		return await collection.findOneAndReplace(
			{ _id: new ObjectId(updatedStory._id.toString()) },
			updatedStory,
			{ returnDocument: 'after', session: session || undefined }
		);
	} catch (e) {
		console.error(`ERROR updateStory: ${e}`);
		throw e;
	}
}

// get One Story
// searches the story either by mongoDB _id:new ObjectId() or by story_id (from GitHub or Jira)
async function getOneStory(storyId) {
	let query;
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		if (typeof storyId === 'number') {
			query = {
				story_id: storyId
			};
		} else {
			query = {
				_id: new ObjectId(storyId.toString())
			};
		}
		return await collection.findOne(query);
	} catch (e) {
		// console.warn(`ERROR in getOneStory: ${e}`);
		// throw e;
		// if there is no Story (e.g. if its a new GitHub repo), return null
		console.log('if no match return null');
		return null;
	}
}

async function createStoryGroup(
	repoID,
	name,
	members,
	sequence,
	session = undefined,
	client = undefined,
	xayTestSet = false
) {
	try {
		const db = session
			? client.db('Seed', session)
			: dbConnection.getConnection();
		const group = {
			_id: new ObjectId(),
			name,
			member_stories: members,
			isSequential: sequence
		};
		if (xayTestSet) {
			group.xayTestSet = true;
		}
		const groups = await db.collection(repositoriesCollection).findOneAndUpdate(
			{ _id: new ObjectId(repoID) },
			{
				$push: {
					groups: group
				}
			},
			{ upsert: true, projection: { groups: 1 }, session: session || undefined }
		);
		return groups.groups.slice(-1)._id;
	} catch (e) {
		console.error(`ERROR in createStoryGroup: ${e}`);
	}
}

async function updateStoryGroup(
	repoId,
	groupId,
	updatedGroup,
	session = undefined,
	client = undefined
) {
	try {
		const db = session
			? client.db('Seed', session)
			: dbConnection.getConnection();
		updatedGroup._id = new ObjectId(updatedGroup._id);
		const collection = await db.collection(repositoriesCollection);
		const repo = await collection.findOne({ _id: new ObjectId(repoId) });
		// leave with double equal:
		const index = repo.groups.findIndex((o) => o._id == groupId);
		repo.groups[index] = updatedGroup;
		await collection.updateOne({ _id: new ObjectId(repoId) }, { $set: repo }, { session: session || undefined });
		return updatedGroup;
	} catch (e) {
		console.error(`ERROR in updateStoryGroup: ${e}`);
	}
}

async function deleteStoryGroup(repoId, groupId) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(repositoriesCollection);
		const repo = await collection.findOne({ _id: new ObjectId(repoId) });
		// leave with double equal:
		const index = repo.groups.findIndex((o) => o._id == groupId);
		repo.groups.splice(index, 1);
		await collection.updateOne({ _id: new ObjectId(repoId) }, { $set: repo });
		return null;
	} catch (e) {
		console.error(`ERROR in deleteStoryGroup: ${e}`);
	}
}

async function getAllStoryGroups(repoId) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(repositoriesCollection)
			.findOne({ _id: new ObjectId(repoId) }, { projection: { groups: 1 } });
	} catch (e) {
		console.error(`ERROR in getAllStoryGroups: ${e}`);
	}
}

async function getOneStoryGroup(repoId, groupId) {
	try {
		const groups = await getAllStoryGroups(repoId);
		return groups.groups.find((o) => o._id == groupId);
	} catch (e) {
		console.error(`ERROR in getOneStoryGroup: ${e}`);
	}
}

async function addToStoryGroup(repoId, groupId, storyId) {
	try {
		const group = await getOneStoryGroup(repoId, groupId);
		group.member_stories.push(storyId);
		await updateStoryGroup(repoId, groupId, group);
		return group;
	} catch (e) {
		console.error(`ERROR in AddToStoryGroup: ${e}`);
	}
}

async function removeFromStoryGroup(repoId, groupId, storyId) {
	try {
		const group = await getOneStoryGroup(repoId, groupId);
		group.member_stories.splice(group.indexOf(storyId), 1);
		await updateStoryGroup(repoId, groupId, group);
		return group;
	} catch (e) {
		console.error(`ERROR in removeFromStoryGroup: ${e}`);
	}
}

async function updateStoryGroupsArray(repoId, groupsArray) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(repositoriesCollection)
			.findOneAndUpdate(
				{ _id: new ObjectId(repoId) },
				{ $set: { groups: groupsArray } },
				{ projection: { groups: 1 } }
			);
	} catch (e) {
		console.error(`ERROR in updateStoryGroupsArray: ${e}`);
	}
}

/**
 * GET all StepTypes
 * @returns all StepTypeObjects
 */
async function showSteptypes() {
	try {
		const db = dbConnection.getConnection();
		return await db.collection(stepTypesCollection).find({})
			.toArray();
	} catch (e) {
		console.error(`ERROR in showSteptypes: ${e}`);
		throw e;
	}
}

// UPDATE Background
async function updateBackground(storyId, updatedBackground) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		return collection.findOneAndUpdate(
			{ _id: new ObjectId(storyId) },
			{ $set: { background: updatedBackground } },
			{ returnDocument: 'after', upsert: true }
		);
	} catch (e) {
		console.error(`ERROR in updateBackground: ${e}`);
		throw e;
	}
}

// DELETE Background
async function deleteBackground(storyId) {
	return updateBackground(storyId, emptyBackground());
}

async function createStory(
	storyTitle,
	storyDescription,
	repoId,
	session = undefined,
	client = undefined
) {
	const iNumberArray = [];
	let finalIssueNumber = 1;
	try {
		console.log(session);
		console.log(client);
		const db = session
			? client.db('Seed', session)
			: dbConnection.getConnection();
		const repo = await db
			.collection(repositoriesCollection)
			.findOne({ _id: new ObjectId(repoId) });
		if (repo && repo.stories.length > 0) {
			for (const storyId of repo.stories) {
				const story = await db
					.collection(storiesCollection)
					.findOne({ _id: new ObjectId(storyId) });
				iNumberArray.push(story.issue_number);
			}
			finalIssueNumber = iNumberArray.findIndex((_, i) => !iNumberArray.includes(i + 1)) + 1;
			if (finalIssueNumber === 0) finalIssueNumber = iNumberArray.length + 1;
		}
		const story = emptyStory(storyTitle, storyDescription);
		story.issue_number = finalIssueNumber;
		const result = await db.collection(storiesCollection).insertOne(story, { session: session || undefined });
		return result.insertedId;
	} catch (e) {
		console.error(`ERROR in createStory: ${e}`);
		throw e;
	}
}

/**
 * Deletes the Story in the StoryCollection and deletes the _id in the corresponding Repository and the StoryGroups
 * @param {*} repoId
 * @param {*} storyId
 * @returns deleteReport
 */
async function deleteStory(repoId, storyId) {
	// TODO refactor use promise all
	try {
		const db = dbConnection.getConnection();
		const repo = await db.collection(repositoriesCollection);
		try {
			const groups = await repo.findOne(
				{ _id: new ObjectId(repoId) },
				{ projection: { groups: 1 } }
			);
			for (const index in groups.groups) groups.groups[index].member_stories = groups.groups[
				index
			].member_stories.filter((story) => story !== storyId);
			await repo.findOneAndUpdate(
				{ _id: new ObjectId(repoId) },
				{ $set: { groups: groups.groups } }
			);
			try {
				await repo.findOneAndUpdate(
					{ _id: new ObjectId(repoId) },
					{ $pull: { stories: new ObjectId(storyId) } }
				);
				try {
					return await db
						.collection(storiesCollection)
						.findOneAndDelete({ _id: new ObjectId(storyId) });
				} catch (e) {
					console.log(
						`ERROR in deleteStory, couldn't delete the Story. Trying to recreate the Repo- and GroupsEntry: ${e}`
					);
					// TODO: recreate both Entrys
				}
			} catch (e) {
				console.log(
					`ERROR in deleteStory, couldn't delete the Story_id in the Repo. Trying to recreate the deleted GroupEntry : ${e}`
				);
				// TODO: recreate the GroupEntry
			}
		} catch (e) {
			console.error(`ERROR in deleteStory, couldn't delete GroupEntry: ${e}`);
			throw e;
		}
	} catch (e) {
		console.error(`ERROR in deleteStory, couldnt establish a Connection: ${e}`);
		throw e;
	}
}

async function insertStoryIdIntoRepo(
	storyId,
	repoId,
	session = undefined,
	client = undefined
) {
	try {
		const db = session
			? client.db('Seed', session)
			: dbConnection.getConnection();
		return await db
			.collection(repositoriesCollection)
			.findOneAndUpdate(
				{ _id: new ObjectId(repoId) },
				{ $push: { stories: new ObjectId(storyId) } },
				{ session: session || undefined }
			);
	} catch (e) {
		console.error(`ERROR in insertStoryIdIntoRepo: ${e}`);
		throw e;
	}
}

async function updateScenarioList(storyId, scenarioList) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(storiesCollection)
			.findOneAndUpdate(
				{ _id: new ObjectId(storyId) },
				{ $set: { scenarios: scenarioList } }
			);
	} catch (e) {
		console.error(`ERROR in insertStoryIdIntoRepo: ${e}`);
		throw e;
	}
}

async function getAllStoriesOfRepo(repoId) {
	const storiesArray = [];
	try {
		const db = dbConnection.getConnection();
		const repo = await db
			.collection(repositoriesCollection)
			.findOne({ _id: new ObjectId(repoId) });
		if (repo) for (const entry of repo.stories) {
			const story = await db
				.collection(storiesCollection)
				.findOne({ _id: new ObjectId(entry) });
			storiesArray.push(story);
		}
		return storiesArray;
	} catch (e) {
		console.error(`ERROR in getAllStoriesOfRepo: ${e}`);
		throw e;
	}
}

// GET ONE Scenario
async function getOneScenario(storyId, scenarioId) {
	try {
		const db = dbConnection.getConnection();
		const scenarios = await db
			.collection(storiesCollection)
			.findOne(
				{ _id: new ObjectId(storyId), 'scenarios.scenario_id': scenarioId },
				{ projection: { scenarios: 1 } }
			);
		return scenarios.scenarios.find((o) => o.scenario_id === scenarioId);
	} catch (e) {
		console.error(`ERROR in getOneScenario: ${e}`);
		throw e;
	}
}

// CREATE Scenario
async function createScenario(storyId, scenarioTitle) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		const story = await findStory(storyId, collection);
		const tmpScenario = emptyScenario();
		if (story.scenarios.length === 0) {
			tmpScenario.name = scenarioTitle;
			story.scenarios.push(tmpScenario);
		} else {
			let newScenId = 0;
			for (const scenario of story.scenarios) {
				if (scenario.scenario_id > newScenId) {
					newScenId = scenario.scenario_id;
				}
			}
			tmpScenario.scenario_id = newScenId + 1;
			tmpScenario.name = scenarioTitle;
			story.scenarios.push(tmpScenario);
		}
		await replace(story, collection);
		return tmpScenario;
	} catch (e) {
		console.error(`ERROR in createScenario: ${e}`);
		throw e;
	}
}

// PUT Scenario
/**
 *
 * @param {*} storyId
 * @param {*} updatedScenario
 * @returns updated Scenario
 */
async function updateScenario(storyId, updatedScenario) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		return collection
			.findOneAndUpdate(
				{ _id: new ObjectId(storyId) },
				{ $set: { 'scenarios.$[it]': updatedScenario } },
				{
					arrayFilters: [{ 'it.scenario_id': updatedScenario.scenario_id }],
					returnDocument: 'after',
					upsert: true,
					projection: { scenarios: true }
				}
			) // Options
			.then((result) => result.scenarios.find(
				(scen) => scen.scenario_id == updatedScenario.scenario_id
			));
	} catch (e) {
		console.error(`ERROR in updateScenario: ${e}`);
		throw e;
	}
}

// DELETE Scenario
async function deleteScenario(storyId, scenarioId) {
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		return collection
			.findOneAndUpdate(
				{ _id: new ObjectId(storyId) },
				{ $pull: { scenarios: { scenario_id: scenarioId } } },
				{ returnDocument: 'after' }
			)
			.then((res) => res);
	} catch (e) {
		console.error(`ERROR in deleteScenario: ${e}`);
		throw e;
	}
}

// gets all Repositories of one user
async function getRepository(userID) {
	try {
		const myObjt = { owner: new ObjectId(userID) };
		const db = dbConnection.getConnection();
		const wGCollection = await db.collection(WorkgroupsCollection);
		const repoCollection = await db.collection(repositoriesCollection);
		const user = await db
			.collection(userCollection)
			.findOne({ _id: new ObjectId(userID) });
		const positiveWorkgroups = await wGCollection
			.find({ Members: { $elemMatch: { email: user.email, canEdit: true } } })
			.toArray();
		const PWgArray = positiveWorkgroups.map(
			(entry) => new ObjectId(entry.Repo)
		);
		const PWgRepos = await repoCollection
			.find({ _id: { $in: PWgArray } })
			.toArray();
		PWgRepos.forEach((element) => {
			element.canEdit = true;
		});
		const negativeWorkgroups = await wGCollection
			.find({ Members: { $elemMatch: { email: user.email, canEdit: false } } })
			.toArray();
		const NWgArray = negativeWorkgroups.map(
			(entry) => new ObjectId(entry.Repo)
		);
		const NWgRepos = await repoCollection
			.find({ _id: { $in: NWgArray } })
			.toArray();
		NWgRepos.forEach((element) => {
			element.canEdit = false;
		});
		const result = await repoCollection.find(myObjt).toArray();
		result.forEach((element) => {
			element.canEdit = true;
		});
		return result.concat(PWgRepos, NWgRepos);
	} catch (e) {
		console.error(`ERROR in getRepository${e}`);
		throw e;
	}
}

// deletes all Repositories of own User
async function deleteRepositorys(ownerID) {
	// TODO: Dringend! Die eingetragenen Storys und die Einträge in Stories und Groups müssen gelöscht werden
	try {
		const query = { owner: new ObjectId(ownerID) };
		const db = dbConnection.getConnection();
		const collection = await db.collection(repositoriesCollection);
		return await collection.deleteMany(query);
	} catch (e) {
		console.error(`ERROR in deleteRepositorys${e}`);
		throw e;
	}
}

async function deleteRepository(repoId, ownerId) {
	// TODO: Dringend! Die eingetragenen Storys und die Einträge in Stories und Groups müssen gelöscht werden
	try {
		// todo delete Workgroup, delete story Reports
		const db = dbConnection.getConnection();
		const collectionRepo = await db.collection(repositoriesCollection);
		// const collectionStory = await db.collection(storiesCollection)
		// const repo = await collectionRepo.findOne({ owner: new ObjectId(ownerId), _id: new ObjectId(repoId)})
		// const storIds = repo.stories.map((val)=>new ObjectId(val))
		// const storiesRes = await collectionStory.deleteMany({_id:{$in: storIds}})
		return collectionRepo.deleteOne({
			owner: new ObjectId(ownerId),
			_id: new ObjectId(repoId)
		});
	} catch (e) {
		console.error(`ERROR in deleteRepository${e}`);
		throw e;
	}
}

async function getOneRepository(ownerId, name) {
	try {
		const repo = { owner: new ObjectId(ownerId), repoName: name };
		const db = dbConnection.getConnection();
		return db.collection(repositoriesCollection).findOne(repo);
	} catch (e) {
		console.error(`ERROR in getOneRepository${e}`);
	}
}

async function getOneRepositoryById(repoId) {
	try {
		const repo = { _id: new ObjectId(repoId) };
		const db = dbConnection.getConnection();
		return db.collection(repositoriesCollection).findOne(repo);
	} catch (e) {
		console.error(`ERROR in getOneRepository${e}`);
	}
}

/**
 *
 * @param {*} name
 * @returns one GitRepositoryObject
 */
async function getOneGitRepository(name) {
	try {
		const query = {
			repoName: name.toString(),
			repoType: 'github'
		};
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection).findOne(query);
	} catch (e) {
		console.error(`ERROR in getOneGitRepository${e}`);
	}
}

/**
 *
 * @param {*} name
 * @returns one JiraRepositoryObject
 */
async function getOneJiraRepository(name) {
	try {
		const query = { repoName: name.toString(), repoType: 'jira' };
		const db = dbConnection.getConnection();
		return await db.collection(repositoriesCollection).findOne(query);
	} catch (e) {
		console.error(`ERROR in getOneGitRepository${e}`);
	}
}

/**
 *
 * @param {*} source
 * @returns all RepositoryObjects from the corresponding source
 */
async function getAllSourceReposFromDb(source) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(repositoriesCollection)
			.find({ repoType: source })
			.toArray();
	} catch (e) {
		console.error(`ERROR in getAllSourceReposFromDb ${e}`);
	}
}

async function createRepo(
	ownerId,
	name,
	session = undefined,
	client = undefined
) {
	try {
		const emptyRepo = {
			owner: new ObjectId(ownerId),
			repoName: name.toString(),
			stories: [],
			repoType: 'db',
			customBlocks: [],
			groups: []
		};
		const db = session
			? client.db('Seed', session)
			: dbConnection.getConnection();
		console.log(session, 'In DB: ', db);
		const collection = await db.collection(repositoriesCollection);
		const query = { owner: new ObjectId(ownerId), repoName: name.toString() };
		const existingRepo = await collection.findOne(query);
		if (existingRepo !== null || !name) return 'Sie besitzen bereits ein Repository mit diesem Namen!'; // existing or empty name
		return collection.insertOne(emptyRepo, { session: session || undefined }).then((ret) => ret.insertedId);
	} catch (e) {
		console.error(`ERROR in createRepo${e}`);
	}
}

async function getRepoSettingsById(repoId) {
	if (!repoId || repoId.length !== 24) {
		console.error(`Invalid repository ID: ${repoId}. Must be a 24-character hex string.`);
		return null;
	}

	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(repositoriesCollection);

		// Safely create ObjectId from validated hex string
		const repo = await collection.findOne({ _id: ObjectId.createFromHexString(repoId) });

		if (!repo) {
			console.log(`No repository found with the ID: ${repoId}`);
			return null;
		}
		return repo.settings;
	} catch (e) {
		console.error(`Error retrieving repository settings: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} repoID
 * @param {*} newName
 * @param {*} globalSettings
 * @returns
 */
async function updateRepository(repoID, newName, globalSettings) {
	try {
		const repoFilter = { _id: new ObjectId(repoID) };
		const db = dbConnection.getConnection();
		const collection = await db.collection(repositoriesCollection);

		const updateFields = {};
		if (newName !== undefined) {
			updateFields.repoName = newName;
		}
		if (globalSettings !== undefined) {
			updateFields.settings = globalSettings;
		}

		const updatedRepo = await collection.findOneAndUpdate(
			repoFilter,
			{ $set: updateFields },
			{ returnDocument: 'after' }
		);

		return updatedRepo.value;
	} catch (e) {
		console.error(`ERROR updateRepository: ${e}`);
		throw e;
	}
}

async function createJiraRepo(repoName) {
	try {
		const db = dbConnection.getConnection();
		const repo = {
			owner: '',
			repoName,
			stories: [],
			repoType: 'jira',
			customBlocks: []
		};
		return await db.collection(repositoriesCollection).insertOne(repo);
	} catch (e) {
		console.error(`ERROR in createJiraRepo ${e}`);
		throw e;
	}
}

async function createGitRepo(gitOwnerId, repoName, userGithubId, userId) {
	let newRepo;
	try {
		const db = dbConnection.getConnection();
		newRepo = {
			owner: '',
			gitOwner: gitOwnerId,
			repoName,
			stories: [],
			repoType: 'github',
			customBlocks: []
		};
		if (userGithubId === gitOwnerId) newRepo.owner = new ObjectId(userId);
		return await db.collection(repositoriesCollection).insertOne(newRepo);
	} catch (e) {
		console.error(`ERROR in createGitRepo${e}`);
		throw e;
	}
}

async function removeFromWorkgroup(repoId, user) {
	try {
		const db = dbConnection.getConnection();
		const wGcollection = await db.collection(WorkgroupsCollection);
		const repo = await db
			.collection(repositoriesCollection)
			.findOne({ _id: new ObjectId(repoId) });
		const owner = await db
			.collection(userCollection)
			.findOne({ _id: repo.owner });
		const workGroup = await wGcollection.findOneAndUpdate(
			{ Repo: new ObjectId(repoId) },
			{ $pull: { Members: { email: user.email } } }
		);
		if (workGroup) {
			const wG = await wGcollection.findOne({ Repo: new ObjectId(repoId) });
			const result = { owner: {}, member: [] };
			result.owner = { email: owner.email, canEdit: true };
			result.member = wG.Members;
			return result;
		}
	} catch (e) {
		console.error(`ERROR in removeFromWorkgroup: ${e}`);
		throw e;
	}
}

async function updateOwnerInRepo(repoId, newOwnerId, oldOwnerId) {
	try {
		const db = dbConnection.getConnection();
		const oldOwner = await getUserById(oldOwnerId);
		// set new Owner for the given Repo
		const newOwner = await getUserById(newOwnerId);
		await db
			.collection(repositoriesCollection)
			.findOne({ _id: new ObjectId(repoId) });
		await db
			.collection(repositoriesCollection)
			.findOneAndUpdate(
				{ _id: new ObjectId(repoId) },
				{ $set: { owner: newOwnerId } }
			);
		// remove the new Owner from Workgroup
		await removeFromWorkgroup(repoId, newOwner);

		// add old Owner as Member and update Email in Workgroup
		const wgMember = { email: oldOwner.email, canEdit: Boolean(true) };
		await db
			.collection(WorkgroupsCollection)
			.findOneAndUpdate(
				{ Repo: new ObjectId(repoId) },
				{ $set: { owner: newOwner.email }, $push: { Members: wgMember } }
			);
		return 'Success';
	} catch (e) {
		console.error(`ERROR in updateOwnerInRepo ${e}`);
		throw e;
	}
}

async function updateStoriesArrayInRepo(repoId, storiesArray) {
	// TODO: vllt in updateStory reinnehmen dann spare ich den DBAufruf
	try {
		const sortedStoriesArray = storiesArray.map((s) => new ObjectId(s));
		const db = dbConnection.getConnection();
		return await db
			.collection(repositoriesCollection)
			.findOneAndUpdate(
				{ _id: new ObjectId(repoId) },
				{ $set: { stories: sortedStoriesArray } },
				{ returnNewDocument: true }
			);
	} catch (e) {
		console.error(`ERROR in updateStoriesArrayInRepo${e}`);
		throw e;
	}
}

async function upsertEntry(storyId, updatedContent) {
	try {
		const myObjt = {
			story_id: storyId
		};
		const db = dbConnection.getConnection();
		const collection = await db.collection(storiesCollection);
		let result = await collection.findOneAndUpdate(
			myObjt,
			{ $set: updatedContent },
			{
				upsert: false
			}
		);
		// TODO remove later when all used stories have the tag storySource
		if (!result) {
			myObjt.storySource = undefined;
			result = await collection.findOneAndUpdate(
				myObjt,
				{ $set: updatedContent },
				{
					upsert: true
				}
			);
		}
		return result;
	} catch (e) {
		console.error(`ERROR in upsertEntry: ${e}`);
		throw e;
	}
}

async function getTestReports(storyId) {
	let result;
	try {
		const db = dbConnection.getConnection();
		console.log('Getting Report for storyId :', storyId);
		result = await db
			.collection(ReportDataCollection)
			.find(
				{ storyId: new ObjectId(storyId) },
				{ projection: { jsonReport: 0, reportOptions: 0, json: 0 } }
			)
			.toArray();
		console.log('Got ', result.length, ' reports for  :', storyId);
	} catch (e) {
		console.log('ERROR in getTestReports', e);
	}
	return result;
}

async function getGroupTestReports(storyId) {
	try {
		const db = dbConnection.getConnection();
		console.log('Getting Groups Reports for storyId :', storyId);
		// projection value 0 excludes from returning
		const query = {
			storyStatuses: { $elemMatch: { storyId: new ObjectId(storyId) } }
		};
		const result = await db
			.collection(ReportDataCollection)
			.find(query, { projection: { jsonReport: 0, reportOptions: 0, json: 0 } })
			.toArray();
		console.log('Got ', result.length, ' Group Reports for  :', storyId);
		return result;
	} catch (e) {
		console.log('Error in getGroupTestReports: ', e);
		return {};
	}
}

async function deleteReport(reportId) {
	let result;
	let idToDelete;
	try {
		const db = dbConnection.getConnection();
		const collection = await db.collection(ReportDataCollection);
		const reportData = await collection.findOne({
			_id: new ObjectId(reportId)
		});
		if (reportData.smallReport) {
			idToDelete = reportData.smallReport;
			console.log(
				'Trying to delete smallReport',
				idToDelete,
				' in DB for Report',
				reportId
			);
			await db
				.collection(ReportsCollection)
				.deleteOne({ _id: new ObjectId(idToDelete) });
			result = await collection.deleteOne({ _id: new ObjectId(reportId) });
		} else {
			idToDelete = reportData.bigReport;
			console.log(
				'trying to delete bigReport',
				idToDelete,
				' in DB for Report',
				reportId
			);
			const bucket = await new mongodb.GridFSBucket(db, {
				bucketName: 'GridFS'
			});
			bucket.delete(new ObjectId(idToDelete));
			result = await collection.deleteOne({ _id: new ObjectId(reportId) });
		}
	} catch (e) {
		console.log('ERROR in deleteReport', e);
	}
	return result;
}

async function setIsSavedTestReport(testReportId, isSaved) {
	try {
		const db = dbConnection.getConnection();
		db.collection(ReportDataCollection).updateOne(
			{ _id: new ObjectId(testReportId) },
			{
				$set: { isSaved }
			}
		);
	} catch (e) {
		console.log('ERROR in setIsSavedTestReport', e);
	}
	return 'done';
}

async function updateStoryStatus(storyId, storyLastTestStatus) {
	try {
		const db = dbConnection.getConnection();
		db.collection(storiesCollection).updateOne(
			{ _id: new ObjectId(storyId) },
			{
				$set: { lastTestPassed: storyLastTestStatus }
			}
		);
		return 'done';
	} catch (e) {
		console.log('Error in updateStoryStatus: ', e);
		return {};
	}
}

async function updateScenarioStatus(
	storyId,
	scenarioId,
	scenarioLastTestStatus
) {
	// TODO: testen
	try {
		const db = dbConnection.getConnection();
		return await db.collection(storiesCollection).updateOne(
			{
				_id: new ObjectId(storyId),
				scenarios: {
					$elemMatch: { scenario_id: scenarioId }
				}
			},
			{
				$set: { 'scenarios.$.lastTestPassed': scenarioLastTestStatus }
			}
		);
	} catch (e) {
		console.log(
			'Error in updateScenarioStatus. Could not set scenario LastTestPassed: ',
			e
		);
	}
}

async function uploadBigJsonData(data, fileName) {
	const db = dbConnection.getConnection();
	const bucket = await new mongodb.GridFSBucket(db, { bucketName: 'GridFS' });
	const id = new ObjectId();
	str(JSON.stringify(data))
		.pipe(bucket.openUploadStreamWithId(id, fileName))
		.on('error', async (error) => {
			assert.ifError(error);
		})
		.on('finish', async () => {
			console.log('Done! Uploaded BigReport');
			console.log('ObjectID: of Big Report: ', id);
			return id;
		});
	return id;
}

async function uploadReport(reportResults) {
	const reportData = reportResults;
	const db = dbConnection.getConnection();
	const collection = await db.collection(ReportDataCollection);
	fs.readFile(
		reportResults.reportOptions.jsonFile,
		'utf8',
		async (err, data) => {
			if (err) console.log(err);
			const jReport = { jsonReport: data, created: new Date() };
			const len = Buffer.byteLength(JSON.stringify(data));
			if (len >= 16000000) {
				try {
					reportData.bigReport = await uploadBigJsonData(
						jReport,
						reportResults.storyId
					);
					console.log(
						'ObjectID: of Big Report in UploadReport: ',
						reportData.bigReport
					);
					collection.insertOne(reportData);
				} catch (e) {
					console.log('ERROR in uploadReport', e);
				}
			} else {
				try {
					db.collection(ReportsCollection).insertOne(jReport);
					reportData.smallReport = jReport._id;
					collection.insertOne(reportData);
				} catch (e) {
					console.log('ERROR in uploadReport', e);
				}
			}
		}
	);
	return reportResults;
}

async function getReportFromDB(report) {
	let result;
	try {
		const db = dbConnection.getConnection();
		if (report.smallReport) {
			const reportJson = await db
				.collection(ReportsCollection)
				.findOne({ _id: report.smallReport });
			result = {
				_id: report._id,
				jsonReport: reportJson.jsonReport
			};
		} else {
			const bucket = await new mongodb.GridFSBucket(db, {
				bucketName: 'GridFS'
			});
			const reportString = await toString(
				bucket.openDownloadStream(new ObjectId(report.bigReport.toString()))
			);
			const reportJson = JSON.parse(reportString);
			result = {
				_id: report._id,
				jsonReport: reportJson.jsonReport
			};
		}
		return result;
	} catch (e) {
		console.log('ERROR in getReportFromDB', e);
		return {};
	}
}

async function getReportByName(reportName) {
	try {
		const db = dbConnection.getConnection();
		const report = await db
			.collection(ReportDataCollection)
			.findOne({ reportName });
		return await getReportFromDB(report);
	} catch (e) {
		console.log('ERROR in getReportByName', e);
		return {};
	}
}

async function getReportById(reportId) {
	try {
		const db = dbConnection.getConnection();
		const report = await db
			.collection(ReportDataCollection)
			.findOne({ _id: new ObjectId(reportId.toString()) });
		return await getReportFromDB(report);
	} catch (e) {
		console.log('ERROR in getReportById (DBServices)', e);
		return {};
	}
}

async function getReportDataById(reportId) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(ReportDataCollection)
			.findOne({ _id: new ObjectId(reportId.toString()) });
	} catch (e) {
		console.log('ERROR in getReportDataById (DBServices)', e);
		return {};
	}
}

// delete User in DB needs ID
async function deleteUser(userID) {
	try {
		// delete user from Workgroup
		const oId = new ObjectId(userID);
		const myObjt = { _id: oId };
		const db = dbConnection.getConnection();
		const repos = await db
			.collection(repositoriesCollection)
			.find({ owner: oId })
			.toArray();
		if (repos) {
			for (const repo of repos) for (const storyID of repo.stories) await db
				.collection(storiesCollection)
				.deleteOne({ _id: new ObjectId(storyID) }); // use delete repo?

			const resultRepo = await db
				.collection(repositoriesCollection)
				.deleteMany({ owner: oId });
			const resultUser = await db.collection(userCollection).deleteOne(myObjt);
			return { resultUser, resultRepo };
		}
		return null;
	} catch (e) {
		console.error(`ERROR in deleteUser: ${e}`);
		throw e;
	}
}

// update a User in DB needs ID and JsonObject User returns altered JsonObject User
async function updateUser(userID, updatedUser) {
	try {
		const oId = new ObjectId(userID);
		const myObjt = { _id: oId };
		const db = dbConnection.getConnection();
		const result = await db
			.collection(userCollection)
			.findOneAndReplace(myObjt, updatedUser);
		return result;
	} catch (e) {
		console.error(`ERROR in updateUser: ${e}`);
		throw e;
	}
}

// get UserData needs ID returns JsonObject User
async function getUserData(userID) {
	try {
		const oId = new ObjectId(userID);
		const myObjt = { _id: oId };
		const db = dbConnection.getConnection();
		return await db.collection(userCollection).findOne(myObjt);
	} catch (e) {
		console.error(`ERROR FEHLERin getUserData: ${e}`);
		throw e;
	}
}

async function saveBlock(block, session = undefined, client = undefined) {
	try {
		block = mongoSanitize(block);
		block.repositoryId = new ObjectId(block.repositoryId);
		block.owner = new ObjectId(block.owner.toString());
		const db = session
			? client.db('Seed', session)
			: dbConnection.getConnection();
		return await db.collection(CustomBlocksCollection).insertOne(block, { session: session || undefined });
	} catch (e) {
		console.error(`ERROR in saveBlock: ${e}`);
		throw e;
	}
}

async function updateBlock(
	blockId,
	updatedBlock,
	session = undefined,
	client = undefined
) {
	try {
		updatedBlock._id = new ObjectId(updatedBlock._id);
		updatedBlock.repositoryId = new ObjectId(updatedBlock.repositoryId);
		updatedBlock.owner = new ObjectId(updatedBlock.owner);
		const db = session
			? client.db('Seed', session)
			: dbConnection.getConnection();
		updatedBlock._id = new ObjectId(updatedBlock._id);
		updatedBlock.repositoryId = new ObjectId(updatedBlock.repositoryId);
		updatedBlock.owner = new ObjectId(updatedBlock.owner);
		await db
			.collection(CustomBlocksCollection)
			.findOneAndReplace({ _id: new ObjectId(blockId) }, updatedBlock, { session: session || undefined });
	} catch (e) {
		console.error(`ERROR in updateBlock: ${e}`);
		throw e;
	}
}

// get one Block by Id
async function getBlock(blockId) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(CustomBlocksCollection)
			.findOne({ _id: new ObjectId(blockId) });
	} catch (e) {
		console.error(`ERROR in getBlock: ${e}`);
		throw e;
	}
}

// get all Blocks by Id returns Array with all existing CustomBlocks
async function getBlocks(repoId) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(CustomBlocksCollection)
			.find({ repositoryId: new ObjectId(repoId) })
			.toArray();
	} catch (e) {
		console.error(`ERROR in getBlocks: ${e}`);
		throw e;
	}
}
// deletes the CustomBlock with the given Name, need the name
async function deleteBlock(blockId, userId) {
	try {
		const myObjt = {
			_id: new ObjectId(blockId),
			owner: new ObjectId(userId)
		};
		const db = dbConnection.getConnection();
		await db.collection(CustomBlocksCollection).deleteOne(myObjt);
		return 'done';
	} catch (e) {
		console.error(`ERROR in deleteBlock: ${e}`);
		throw e;
	}
}

async function getWorkgroup(id) {
	try {
		const db = dbConnection.getConnection();
		return await db
			.collection(WorkgroupsCollection)
			.findOne({ Repo: new ObjectId(id) });
	} catch (e) {
		console.error(`ERROR in getWorkgroup: ${e}`);
		throw e;
	}
}

/**
 *
 * @param {*} repoId Repository Id
 * @param {object} user User object {email:string, canEdit:boolean}
 * @returns
 */
async function addMember(repoId, user) {
	try {
		const db = dbConnection.getConnection();
		const wGCollection = await db.collection(WorkgroupsCollection);
		const check = await wGCollection.findOne({
			Repo: new ObjectId(repoId),
			Members: { $elemMatch: { email: user.email } }
		});
		if (check) return 'Dieser User ist bereits in der Workgroup';
		const repo = await db
			.collection(repositoriesCollection)
			.findOne({ _id: new ObjectId(repoId) });
		const owner = await db
			.collection(userCollection)
			.findOne({ _id: repo.owner });
		const workGroup = await wGCollection.findOne({
			Repo: new ObjectId(repoId)
		});
		if (!workGroup) {
			await wGCollection.insertOne({
				name: repo.repoName,
				owner: owner.email,
				Repo: new ObjectId(repoId),
				Members: [{ email: user.email, canEdit: Boolean(user.canEdit) }]
			});
		} else {
			await wGCollection.findOneAndUpdate(
				{ Repo: new ObjectId(repoId) },
				{ $push: { Members: user } }
			);
		}
		const result = { owner: {}, member: [] };
		const wG = await wGCollection.findOne({ Repo: new ObjectId(repoId) });
		result.owner = { email: owner.email, canEdit: true };
		result.member = wG.Members;
		return result;
	} catch (e) {
		console.error(`ERROR in addMember: ${e}`);
		throw e;
	}
}

async function updateMemberStatus(repoId, user) {
	try {
		const db = dbConnection.getConnection();
		const wGCollection = await db.collection(WorkgroupsCollection);
		const repo = await db
			.collection(repositoriesCollection)
			.findOne({ _id: new ObjectId(repoId) });
		const usersCollection = await db.collection(userCollection);
		const owner = await usersCollection.findOne({ _id: repo.owner });
		const updatedWG = await wGCollection.findOneAndUpdate(
			{ Repo: new ObjectId(repoId) },
			{ $set: { 'Members.$[elem].canEdit': Boolean(user.canEdit) } },
			{ arrayFilters: [{ 'elem.email': user.email }] }
		);
		if (updatedWG) {
			const wG = await wGCollection.findOne({ Repo: new ObjectId(repoId) });
			const result = { owner: {}, member: [] };
			result.owner = { email: owner.email, canEdit: true };
			result.member = wG.Members;
			return result;
		}
	} catch (e) {
		console.error(`ERROR in updateMemberStatus: ${e}`);
		throw e;
	}
}

async function getMembers(id) {
	try {
		const db = dbConnection.getConnection();
		const repo = await db
			.collection(repositoriesCollection)
			.findOne({ _id: new ObjectId(id) });
		const owner = await db
			.collection(userCollection)
			.findOne({ _id: repo.owner });
		const wG = await db
			.collection(WorkgroupsCollection)
			.findOne({ Repo: new ObjectId(id) });
		if (!wG) return { owner: { email: owner.email, canEdit: true }, member: [] };
		const result = { owner: {}, member: [] };
		result.owner = { email: owner.email, canEdit: true };
		result.member = wG.Members;
		return result;
	} catch (e) {
		console.error(`ERROR in getMembers: ${e}`);
		throw e;
	}
}

async function updateOneDriver(id, driver) {
	try {
		const oneDriver = !driver.oneDriver;
		const db = dbConnection.getConnection();
		const result = await db
			.collection(storiesCollection)
			.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { oneDriver } });
		return result;
	} catch (e) {
		console.log('ERROR in updateOneDriver: ', e);
	}
}

// Function to add stories for the import functionality
async function importStories(
	post,
	importRepo,
	session,
	storyFiles,
	groupMapping,
	existingNameList,
	importMode,
	checkAndAddSuffix,
	findAssociatedID,
	client,
	file,
	allConflicts = []
) {
	const zip = new AdmZip(file.buffer);
	// Function to insert newID based on oldID
	function insertNewId(oldID, newID) {
		for (const mapping of groupMapping) {
			if (mapping.oldID === oldID) {
				mapping.newID = newID;
				return; // Exit the loop after successful insertion
			}
		}
		console.error(
			`Mapping with oldID: ${oldID} not found for newID insertion.`
		);
	}

	// Iterate through each story file
	for (const storyFile of storyFiles) {
		const storyData = zip.readAsText(storyFile.entryName);
		const storyObject = JSON.parse(storyData);
		let name = storyObject.title;
		if (!post && importMode) {
			name = checkAndAddSuffix(storyObject.title, existingNameList);
			storyObject.title = name;
		}

		if (post || importMode) {
			const newStory = await createStory(
				name,
				storyObject.body === null ? undefined : storyObject.body,
				importRepo,
				session,
				client
			);
			// Insert new ID corresponding to old one
			insertNewId(
				groupMapping[storyFiles.indexOf(storyFile)].oldID,
				newStory.toHexString()
			);
			// Get newly created StoryID and paste it into "old" story to replace newly generated one with same id
			storyObject._id = newStory;
			await updateStory(storyObject, session, client);
			await insertStoryIdIntoRepo(
				newStory,
				importRepo,
				session,
				client
			);
		}
		// Apply same logic for override
		if (!post && !importMode && findAssociatedID(name, allConflicts)) {
			storyObject._id = findAssociatedID(name, allConflicts);
			await updateStory(storyObject, session, client);
		}
	}
}

// RepoBlocks creation and assignment function for the import functionality
async function importBlocks(
	post,
	importRepo,
	repoName,
	session,
	existingNameList,
	repoBlocksData,
	importMode,
	checkAndAddSuffix,
	findAssociatedID,
	client,
	allConflicts = []
) {
	for (const singularBlock of repoBlocksData) {
		if (!post && importMode) singularBlock.name = checkAndAddSuffix(
			singularBlock.name,
			existingNameList
		);
		singularBlock.repository = repoName;
		singularBlock.repositoryId = importRepo;
		if (!post && !importMode) {
			singularBlock._id = findAssociatedID(singularBlock.name, allConflicts);
			if (!singularBlock._id) console.error('Error within findAssociatedID @ importBlocks');
			await updateBlock(singularBlock._id, singularBlock, session, client);
		} else {
			await saveBlock(singularBlock, session, client);
		}
	}
}

// Group creation and assignment function for the import functionality
// TODO: Ggf. Export anpassen -> Ersatz von StoryIds durch indices vermutlich unnötig
async function importGroups(
	post,
	importRepo,
	session,
	groupFiles,
	groupMapping,
	existingNameList,
	importMode,
	repo_id,
	checkAndAddSuffix,
	findAssociatedID,
	client,
	file,
	allConflicts = []
) {
	const zip = new AdmZip(file.buffer);
	for (const groupFile of groupFiles) {
		const groupData = zip.readAsText(groupFile.entryName);
		const groupObject = JSON.parse(groupData);
		for (let i = 0; i < groupObject.member_stories.length; i++) {
			groupObject.member_stories[i] = groupMapping[groupObject.member_stories[i]].newID;
		}
		let { name } = groupObject;
		if (!post && importMode) name = checkAndAddSuffix(name, existingNameList);
		if (!post && !importMode && findAssociatedID(name, allConflicts)) {
			groupObject._id = findAssociatedID(name, allConflicts);
			const oldGroup = await getOneStoryGroup(repo_id, groupObject._id);
			groupObject.member_stories = oldGroup.member_stories;
			const updatedGroup = await updateStoryGroup(
				repo_id,
				groupObject._id,
				groupObject,
				session,
				client
			);
			console.log(`Group ${name} has been updated. ID: ${updatedGroup._id}`);
		} else {
			await createStoryGroup(
				importRepo,
				name,
				groupObject.member_stories,
				groupObject.isSequential,
				session,
				client
			);
			console.log(`Group ${name} inserted into: ${importRepo}`);
		}
	}
}

async function fileUpload(filename, repoId, file) {
	try {
		const db = dbConnection.getConnection();
		const bucket = new mongodb.GridFSBucket(db, { bucketName: 'GridFS' });
		const repoObjId = new ObjectId(repoId);
		const id = new ObjectId();
		// base filename may be the same as filename, excluding extension
		const baseFilename = filename.replace(/\s?(\(\d+\))?\.\w+$/, '');
		// the regex searches for files <filename> and any <filename> (0-9)
		// eslint-disable-next-line no-useless-escape
		const existingFiles = await db.collection('GridFS.files').find({ filename: { $regex: `^${baseFilename}` }, metadata: { repoId: repoObjId } }, { filename: 1 })
			.toArray();
		const existingFilenames = existingFiles.map((file) => file.filename);
		const newFilename = generateUniqueFilename(existingFilenames, baseFilename, filename);

		return new Promise((resolve, reject) => {
			str(file, 'base64')
				.pipe(bucket.openUploadStreamWithId(id, newFilename, { metadata: { repoId: repoObjId } }))
				.on('error', async (error) => reject(error))
				.on('finish', async () => resolve({
					_id: id, filename: newFilename, uploadDate: new Date(Date.now()).toISOString(), metadata: { repoId: repoObjId }
				}));
		});
	} catch (e) {
		console.log('ERROR in file upload: ', e);
		throw e;
	}
}

function generateUniqueFilename(existingFilenames, baseFilename, filename) {
	let newFilename = filename;
	let count = 2;
	while (existingFilenames.includes(newFilename)) {
		newFilename = `${baseFilename} (${count++}).${filename.split('.').pop()}`;
	}
	return newFilename;
}

async function deleteFile(fileId) {
	try {
		const db = dbConnection.getConnection();
		console.log('Delete FileId: ', fileId);
		const bucket = new mongodb.GridFSBucket(db, { bucketName: 'GridFS' });
		await bucket.delete(new ObjectId(fileId));
	} catch (e) {
		console.log('ERROR in file delete: ', e);
		throw e;
	}
}

async function getFileList(repoId) {
	try {
		const db = dbConnection.getConnection();
		const files = await db.collection('GridFS.files').find({ 'metadata.repoId': new ObjectId(repoId) })
			.toArray();
		return files;
	} catch (e) {
		console.log('ERROR in get file list: ', e);
		throw e;
	}
}

/**
 * Store Files Temporarily in the File System
 * @param {string} fileIds
 */
async function getFiles(fileTitles, repoId) {
	const db = dbConnection.getConnection();
	const bucket = new mongodb.GridFSBucket(db, { bucketName: 'GridFS' });

	let destinationDirectory;
	switch (process.platform) {
		case 'win32': // Windows
			destinationDirectory = 'C:\\Users\\Public\\SeedTmp\\';
			break;
		case 'darwin': // macOS
			destinationDirectory = `/Users/${os.userInfo().username}/SeedTmp/`;
			break;
		default:
			destinationDirectory = '/home/public/SeedTmp/';
	}
	console.log('destination: ', destinationDirectory);
	if (!fs.existsSync(destinationDirectory)) {
		fs.mkdirSync(destinationDirectory, { recursive: true });
	}

	for (const fileTitle of fileTitles) {
		try {
			const fileInfo = await bucket.find({ 'metadata.repoId': new ObjectId(repoId), filename: fileTitle }).toArray((err, file) => file[0]);
			console.log(fileInfo);
			const downloadStream = bucket.openDownloadStream(fileInfo[0]._id);
			const destinationPath = destinationDirectory + fileInfo[0].filename;
			const fileWriteStream = fs.createWriteStream(destinationPath);

			setTimeout(() => {
				fs.unlink(destinationPath, (err) => {
					if (err) console.log(err);
					else console.log(`${fileInfo[0].filename} deleted.`);
				});
			}, 18000000); // 5h Timeout

			await new Promise((resolve, reject) => {
				downloadStream.pipe(fileWriteStream);
				downloadStream.on('error', reject);
				fileWriteStream.on('finish', resolve);
				fileWriteStream.on('error', reject);
			}).catch((e) => {
				console.error(e);
			});

			console.log('Datei erfolgreich heruntergeladen:', destinationPath);
		} catch (error) {
			console.error('Datei nicht gefunden:', error.message);
		}
	}
}

function mongoSanitize(v) { // from https://github.com/vkarpov15/mongo-sanitize
	if (v instanceof Object) {
		for (const key in v) {
			if (/^\$/.test(key)) {
				delete v[key];
			} else {
				mongoSanitize(v[key]);
			}
		}
	}
	return v;
}

async function getStoriesByIssueKeys(issueKeys) {
	try {
		const db = dbConnection.getConnection();
		const stories = await db.collection(storiesCollection).find({
			issue_number: { $in: issueKeys }
		})
			.project({ _id: 1 })
			.toArray();

		if (!stories.length) {
			console.log('No stories found for the provided issue keys.');
			return [];
		}

		const storyIds = stories.map((story) => story._id.toString());
		return storyIds;
	} catch (error) {
		console.error('Error retrieving stories by issue keys:', error);
		throw error;
	}
}

/**
 * Get single story by issue key
 */

async function getOneStoryByIssueKey(issueKey) {
	try {
		const db = dbConnection.getConnection();
		const story = await db.collection(storiesCollection).findOne({
			issue_number: issueKey
		});

		if (!story) {
			console.log('No story found for the provided issue key.');
			return null;
		}

		return story;
	} catch (error) {
		console.error('Error retrieving story by issue key:', error);
		throw error;
	}
}

module.exports = {
	getFileList,
	getFiles,
	fileUpload,
	deleteFile,
	setIsSavedTestReport,
	deleteReport,
	getTestReports,
	getGroupTestReports,
	getReportByName,
	getReportById,
	getReportDataById,
	uploadReport,
	disconnectGithub,
	mergeGithub,
	findOrRegisterGithub,
	getUserByGithub,
	getUserById,
	registerUser,
	getUserByEmail,
	showSteptypes,
	// createBackground,
	deleteBackground,
	updateBackground,
	getOneScenario,
	createScenario,
	updateScenario,
	deleteScenario,
	updateScenarioList,
	createStory,
	deleteStory,
	insertStoryIdIntoRepo,
	getOneStory,
	upsertEntry,
	updateStory,
	deleteUser,
	updateUser,
	getUserData,
	createJiraRepo,
	updateStoriesArrayInRepo,
	getRepository,
	deleteRepository,
	getOneRepository,
	getOneGitRepository,
	getOneJiraRepository,
	getAllStoriesOfRepo,
	createRepo,
	createStoryGroup,
	updateStoryGroup,
	deleteStoryGroup,
	addToStoryGroup,
	removeFromStoryGroup,
	getAllStoryGroups,
	getOneStoryGroup,
	updateStoryGroupsArray,
	createResetRequest,
	getResetRequest,
	deleteRequest,
	getResetRequestByEmail,
	saveBlock,
	updateBlock,
	getBlock,
	getBlocks,
	deleteBlock,
	getWorkgroup,
	addMember,
	updateMemberStatus,
	getMembers,
	removeFromWorkgroup,
	updateOneDriver,
	updateScenarioStatus,
	updateStoryStatus,
	getAllSourceReposFromDb,
	createGitRepo,
	updateOwnerInRepo,
	updateRepository,
	getOneRepositoryById,
	getRepoSettingsById,
	importStories,
	importBlocks,
	importGroups,
	getStoriesByIssueKeys,
	getOneStoryByIssueKey
};
