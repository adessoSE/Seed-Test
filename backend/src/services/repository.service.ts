import { ObjectId, type ClientSession, type MongoClient, type WithId, type InsertOneResult, type UpdateResult, type UpdateFilter } from 'mongodb';
import { type RepositoryDoc, type UserDoc, type GroupDoc, oid } from '../types/mongo.types.js';
import * as dbConnection from '../database/DbConnector.js';
import { type Group } from '@shared/models/Group.js';
import { type Repository } from '@shared/models/Repository.js';
import { type RepositoryContainer, type AiConfig } from '@shared/models/RepositoryContainer.js';
import { deleteStory } from './story.service.js';
import { getUserById } from './user.service.js';
import * as workgroupService from './workgroup.service.js';
import { encrypt } from '../helpers/cryptoHelper.js';
import { AppError } from '../helpers/AppError.js';

// Note: ObjectId casts needed — shared models use string, MongoDB uses ObjectId
const ENCRYPTED_FORMAT = /^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/;
function isAlreadyEncrypted(value: string): boolean {
	return ENCRYPTED_FORMAT.test(value);
}

const repositoriesCollection = 'Repositories';
const userCollection = 'User';
const customBlocksCollection = 'CustomBlocks';


// --- Repository Functions ---

/**
 * Fetches a list of repositories for a user, including owned and member repositories.
 * Returns a lightweight RepositoryContainer array suitable for frontend lists.
 */
export async function getRepository(userId: string): Promise<RepositoryContainer[]> {
	const db = dbConnection.getConnection();
	const user = await db.collection<UserDoc>(userCollection).findOne({ _id: oid(userId) });
	if (!user) return [];

	const ownerRepos: (RepositoryDoc & { canEdit: boolean })[] = (await db.collection<RepositoryDoc>(repositoriesCollection).find({ owner: oid(userId) }).toArray()).map(repo => ({ ...repo, canEdit: true }));

	// Workgroup docs shape — not in mongo.types.ts, only accessed via Repo field
	const memberWorkgroups = await db.collection('Workgroups').find({ 'Members.email': user.email }).toArray() as unknown as { Repo: ObjectId, Members: { email: string, canEdit: boolean }[] }[];
	const repoIds = memberWorkgroups.map(wg => oid(wg.Repo));

	const memberRepos: (RepositoryDoc & { canEdit: boolean })[] = (await db.collection<RepositoryDoc>(repositoriesCollection).find({ _id: { $in: repoIds } }).toArray()).map(repo => {
		const memberInfo = memberWorkgroups.find(wg => wg.Repo.toString() === repo._id.toString())?.Members.find(m => m.email === user.email);
		return { ...repo, canEdit: memberInfo ? memberInfo.canEdit : false };
	});
    
	const allRepos = [...ownerRepos, ...memberRepos];
	// _id is always present on docs returned from find()
	const uniqueRepos = Array.from(new Map(allRepos.map(repo => [repo._id!.toString(), repo])).values());

	return uniqueRepos.map(repo => ({
		_id: repo._id,
		repoName: repo.repoName,
		source: repo.repoType,
		canEdit: repo.canEdit,
		settings: repo.settings,
		aiConfig: repo.aiConfig
	})) as unknown as RepositoryContainer[];
}

/**
 * Filters a list of repositories to only include those from 'db' source.
 * (Moved from projectManagement.ts)
 * @param userId The user's ID.
 * @returns Array of repository container objects.
 */
export async function dbProjects(userId: string): Promise<RepositoryContainer[]> {
	if (!userId) return [];
	// Let errors propagate — controller uses Promise.allSettled to handle failures per source
	const userRepos = await getRepository(userId);
	return userRepos
		.filter(repo => repo.source === 'db')
		.map(repo => ({
			_id: repo._id,
			repoName: repo.repoName,
			source: repo.source,
			canEdit: repo.canEdit,
			settings: repo.settings,
			aiConfig: repo.aiConfig
		}));
}

/**
 * Removes duplicate repositories based on _id.
 * (Moved from projectManagement.ts)
 * @param repositories Array of repository objects.
 * @returns Array of unique repository objects.
 */
export function uniqueRepositories(repositories: Partial<RepositoryContainer>[]): Partial<RepositoryContainer>[] {
	const uniqueMap = new Map<string, Partial<RepositoryContainer>>();
	for (const repo of repositories) 
		if (repo._id && !uniqueMap.has(repo._id.toString())) 
			uniqueMap.set(repo._id.toString(), repo);
    
  
	return Array.from(uniqueMap.values());
}


export async function getOneRepositoryById(repoId: string): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	return await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) }) as unknown as Repository | null;
}

/**
 * Finds the repository that contains a given story ID in its stories array.
 * Used by authorization middleware to resolve repo ownership from a story reference.
 */
export async function getRepoByStoryId(storyId: string): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	return await db.collection<RepositoryDoc>(repositoriesCollection).findOne(
		{ stories: oid(storyId) }
	) as unknown as Repository | null;
}

export async function getOneRepository(ownerId: string, name: string): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	return await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ owner: oid(ownerId), repoName: name }) as unknown as Repository | null;
}

export async function getRepoSettingsById(repoId: string): Promise<Repository['settings'] | null> {
	const db = dbConnection.getConnection();
	const repo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) });
	return repo?.settings ?? null;
}

export async function getRepoAiConfigById(repoId: string): Promise<AiConfig | null> {
	const db = dbConnection.getConnection();
	const repo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) });
	return repo?.aiConfig ?? null;
}

export async function createRepo(ownerId: string, name: string, session?: ClientSession, client?: MongoClient): Promise<ObjectId> {
	const db = session ? client!.db('Seed') : dbConnection.getConnection();
	const existingRepo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ owner: oid(ownerId), repoName: name }, { session });
	if (existingRepo) 
		throw AppError.conflict('You already own a repository with this name!');
    

	const emptyRepo: Omit<RepositoryDoc, '_id'> = {
		owner: oid(ownerId),
		repoName: name,
		stories: [],
		repoType: 'db',
		groups: [],
		customBlocks: []
	};

	const result = await db.collection<RepositoryDoc>(repositoriesCollection).insertOne(emptyRepo, { session });
	return result.insertedId;
}

export async function updateRepository(repoId: string, newName?: string, globalSettings?: Repository['settings'], aiConfig?: AiConfig): Promise<WithId<RepositoryDoc> | null> {
	const db = dbConnection.getConnection();
	const updateFields: Partial<Repository> = {};
	if (newName !== undefined) updateFields.repoName = newName;
	if (globalSettings !== undefined) updateFields.settings = globalSettings;
    
	// Encrypt API keys before saving
	// The JSON round-trip strips undefined fields, and at runtime
	// configToSave may be a partial object missing textPreparation or
	// jsonConversion (e.g. import from a repo that never configured AI).
	// Cast via Partial to allow optional-chain without false lint positives.
	if (aiConfig !== undefined) {
		// Create a deep copy to avoid modifying the input object
		const configToSave = JSON.parse(JSON.stringify(aiConfig)) as Partial<AiConfig>;

		if (configToSave.textPreparation?.apiKey && !isAlreadyEncrypted(configToSave.textPreparation.apiKey)) 
			configToSave.textPreparation.apiKey = encrypt(configToSave.textPreparation.apiKey) ?? undefined;
        

		if (configToSave.jsonConversion?.apiKey && !isAlreadyEncrypted(configToSave.jsonConversion.apiKey)) 
			configToSave.jsonConversion.apiKey = encrypt(configToSave.jsonConversion.apiKey) ?? undefined;
        

		updateFields.aiConfig = configToSave as AiConfig;
	}

	const result = await db.collection<RepositoryDoc>(repositoriesCollection).findOneAndUpdate(
		{ _id: oid(repoId) },
		{ $set: updateFields } as unknown as UpdateFilter<RepositoryDoc>,
		{ returnDocument: 'after' }
	);
	return result;
}

export async function updateOwnerInRepo(repoId: string, newOwnerId: string, oldOwnerId: string): Promise<string> {
	const oldOwner = await getUserById(oldOwnerId);
	const newOwner = await getUserById(newOwnerId);

	if (!oldOwner || !newOwner) 
		throw AppError.notFound('Could not find one or both users');
    

	// Update repository owner
	await dbConnection.getConnection().collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId) },
		{ $set: { owner: oid(newOwnerId) } }
	);

	// Use the dedicated service to handle the workgroup logic
	await workgroupService.transferOwnership(repoId, newOwner.email, oldOwner.email);

	return 'Success';
}

/**
 * Deletes a repository or transfers ownership if other members exist in the workgroup.
 * @param repoId The ID of the repository to delete.
 * @param ownerId The ID of the current owner.
 * @returns An object indicating the result of the operation (deleted or transferred).
 */
export async function deleteRepository(repoId: string, ownerId: string): Promise<{ status: string, message: string, newOwner?: string }> {
	const db = dbConnection.getConnection();
	const repoCollection = db.collection<RepositoryDoc>(repositoriesCollection);

	const repo = await repoCollection.findOne({ _id: oid(repoId), owner: oid(ownerId) });
	if (!repo) 
		throw AppError.notFound('Repository not found or user is not the owner.');
    

	// Check for members to transfer ownership
	const workgroup = await workgroupService.getWorkgroup(repoId);

	// Case 1: Transfer ownership if members exist
	if (workgroup && Array.isArray(workgroup.Members) && workgroup.Members.length > 0) {
		const members = await workgroupService.getMembers(repoId);
		const newOwnerMember = members.member.find(m => m.canEdit) ?? members.member[0];
		const newOwnerUser = await db.collection<UserDoc>('User').findOne({ email: newOwnerMember.email });

		if (!newOwnerUser) throw AppError.notFound('Could not find user to promote to new owner.');

		// 1. Update repository owner
		await repoCollection.updateOne({ _id: oid(repoId) }, { $set: { owner: oid(newOwnerUser._id) } });

		// 2. Use the dedicated service to promote the new owner in the workgroup
		await workgroupService.promoteNewOwner(repoId, newOwnerUser.email);

		return {
			status: 'ownership_transferred',
			message: `Repository ownership transferred to ${newOwnerMember.email}.`,
			newOwner: newOwnerMember.email
		};
	}

	// Case 2: No other members, proceed with full deletion
	// Delete all stories parallely
	const deletePromises = repo.stories.map(storyId => deleteStory(repoId, storyId.toString()));
	await Promise.all(deletePromises);


	await db.collection(customBlocksCollection).deleteMany({ repositoryId: oid(repoId) });
	if (workgroup)
		await db.collection('Workgroups').deleteOne({ _id: oid(workgroup._id!) }); // Direct DB call for now
    
	await repoCollection.deleteOne({ _id: oid(repoId) });

	return { status: 'deleted', message: 'Repository and all associated data have been deleted.' };
}

export async function insertStoryIdIntoRepo(storyId: string, repoId: string, client?: MongoClient, session?: ClientSession): Promise<UpdateResult> {
	const db = session ? client!.db('Seed', session) : dbConnection.getConnection();
    
	return db.collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId) },
		{ $push: { stories: oid(storyId) } },
		{ session }
	);
}

export async function updateStoriesArrayInRepo(repoId: string, storiesArray: string[]): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	const sortedStoriesArray = storiesArray.map(s => oid(s));

	const result = await db.collection<RepositoryDoc>(repositoriesCollection).findOneAndUpdate(
		{ _id: oid(repoId) },
		{ $set: { stories: sortedStoriesArray } },
		{ returnDocument: 'after' }
	);

	return result as unknown as Repository | null;
}


// --- Story Group Functions ---

export async function getAllStoryGroups(repoId: string): Promise<Group[]> {
	const db = dbConnection.getConnection();
	const repo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) }, { projection: { groups: 1 } });
	// Convert ObjectId fields to proper types — MongoDB returns _id as ObjectId and member_stories as ObjectId[]
	// but shared Group model expects _id: string and member_stories: string[]
	return ((repo?.groups ?? []) as unknown as GroupDoc[]).map(g => ({
		...g,
		_id: g._id?.toString() ?? '',
		member_stories: (g.member_stories ?? []).map(m => m?.toString?.() ?? '')
	})) as unknown as Group[];
}

export async function getOneStoryGroup(repoId: string, groupId: string): Promise<Group | undefined> {
	const groups = await getAllStoryGroups(repoId);
	return groups.find(g => g._id?.toString() === groupId);
}

export async function createStoryGroup(repoId: string, name: string, members: string[], sequence: boolean, xrayTestSet: boolean = false, client?: MongoClient, session?: ClientSession): Promise<ObjectId> {
	const db = client ? client.db('Seed', session) : dbConnection.getConnection();
	const newGroup: GroupDoc = {
		_id: new ObjectId(),
		name,
		member_stories: members.map(id => oid(id)),
		isSequential: sequence,
		xrayTestSet
	};

	const result = await db.collection<RepositoryDoc>(repositoriesCollection).findOneAndUpdate(
		{ _id: oid(repoId) },
		{ $push: { groups: newGroup } },
		{ upsert: false, projection: { groups: 1 }, session, returnDocument: 'after' }
	);

	if (!result?.groups.length) 
		throw AppError.notFound(`Repository ${repoId} not found or group creation failed`);
    
	const newGroupId = result.groups.slice(-1)[0]._id!;
	return newGroupId;
}

export async function updateStoryGroup(repoId: string, groupId: string, updatedGroup: Group, client?: MongoClient, session?: ClientSession): Promise<Group> {
	const db = session && client ? client.db('Seed', session) : dbConnection.getConnection();
	// Group model uses string for _id, but MongoDB stores ObjectId — cast preserves runtime behaviour
	updatedGroup._id = oid(groupId) as unknown as string;
	// Convert member_stories strings to ObjectIds — frontend sends string[] but MongoDB GroupDoc expects ObjectId[]
	(updatedGroup as unknown as GroupDoc).member_stories = ((updatedGroup.member_stories ?? []) as string[]).filter(Boolean).map(id => oid(id));
	const collection = db.collection<RepositoryDoc>(repositoriesCollection);
	const repo = await collection.findOne({ _id: oid(repoId) }, { session });

	if (!repo)
		throw AppError.notFound('Repository not found');


	const index = repo.groups.findIndex((g) => g._id?.toString() === groupId);
	if (index === -1) 
		throw AppError.notFound('Group not found in repository');
     

	repo.groups[index] = updatedGroup as unknown as GroupDoc;

	await collection.updateOne({ _id: oid(repoId) }, { $set: { groups: repo.groups } }, { session });
	return updatedGroup;
}

export async function deleteStoryGroup(repoId: string, groupId: string): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId) },
		{ $pull: { groups: { _id: oid(groupId) } } }
	);
}

export async function addToStoryGroup(repoId: string, groupId: string, storyId: string): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId), 'groups._id': oid(groupId) },
		{ $push: { 'groups.$.member_stories': oid(storyId) } }
	);
}

export async function removeFromStoryGroup(repoId: string, groupId: string, storyId: string): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId), 'groups._id': oid(groupId) },
		{ $pull: { 'groups.$.member_stories': oid(storyId) } }
	);
}

export async function updateStoryGroupsArray(repoId: string, groupsArray: Group[]): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	// Convert member_stories strings to ObjectIds — frontend sends string[] but MongoDB GroupDoc expects ObjectId[]
	const syncedGroups = groupsArray.map(group => ({
		...group,
		_id: group._id ? oid(group._id) as unknown as string : undefined,
		member_stories: (group.member_stories ?? []).map(id => (id ? oid(id) : undefined))
	})) as unknown as GroupDoc[];
	return db.collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId) },
		{ $set: { groups: syncedGroups } }
	);
}

// --- Source specific Functions ---
export async function getOneGitRepository(name: string): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	return await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ repoName: name, repoType: 'github' }) as unknown as Repository | null;
}

export async function getOneJiraRepository(name: string): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	return await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ repoName: name, repoType: 'jira' }) as unknown as Repository | null;
}

export async function getAllSourceReposFromDb(source: 'db' | 'github' | 'jira'): Promise<Repository[]> {
	const db = dbConnection.getConnection();
	return await db.collection<RepositoryDoc>(repositoriesCollection).find({ repoType: source }).toArray() as unknown as Repository[];
}

export async function createJiraRepo(repoName: string): Promise<InsertOneResult<RepositoryDoc> & { _id?: ObjectId }> {
	const db = dbConnection.getConnection();
	const newRepo: Partial<RepositoryDoc> = {
		// RepositoryDoc.owner is ObjectId but Jira repos have no owner — preserve existing runtime behaviour
		owner: '' as unknown as ObjectId,
		repoName,
		stories: [],
		repoType: 'jira'
	};
	return db.collection<RepositoryDoc>(repositoriesCollection).insertOne(newRepo as RepositoryDoc);
}

export async function createGitRepo(gitOwnerId: string, repoName: string, userGithubId: number, userId: string): Promise<InsertOneResult<RepositoryDoc> & { _id?: ObjectId }> {
	const db = dbConnection.getConnection();
	const newRepo: Partial<RepositoryDoc> = {
		// RepositoryDoc.owner is ObjectId but GitHub repos initially have no owner — set below if user is the GitHub owner
		owner: '' as unknown as ObjectId,
		gitOwner: gitOwnerId,
		repoName,
		stories: [],
		repoType: 'github'
	};
	if (userGithubId.toString() === gitOwnerId) 
		newRepo.owner = oid(userId);
    
	return db.collection<RepositoryDoc>(repositoriesCollection).insertOne(newRepo as RepositoryDoc);
}