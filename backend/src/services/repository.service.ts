import { ObjectId, ClientSession, MongoClient } from 'mongodb';
import { RepositoryDoc, UserDoc, GroupDoc, oid } from '../types/mongo.types';
import * as dbConnection from '../database/DbConnector';
import { Group } from '@shared/models/Group';
import { Repository } from '@shared/models/Repository';
import { RepositoryContainer, AiConfig } from '@shared/models/RepositoryContainer';
import { deleteStory } from './story.service';
import { getUserById } from './user.service';
import * as workgroupService from './workgroup.service';
import { encrypt } from '../helpers/cryptoHelper';

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

	const ownerRepos = await db.collection<RepositoryDoc>(repositoriesCollection).find({ owner: oid(userId) }).toArray();
	ownerRepos.forEach(repo => (repo as any).canEdit = true);

	const memberWorkgroups = await db.collection('Workgroups').find({ 'Members.email': user.email }).toArray();
	const repoIds = memberWorkgroups.map(wg => oid(wg.Repo));

	const memberRepos = await db.collection<RepositoryDoc>(repositoriesCollection).find({ _id: { $in: repoIds } }).toArray();
	memberRepos.forEach(repo => {
		const memberInfo = memberWorkgroups.find(wg => wg.Repo.toString() === repo._id!.toString())?.Members.find((m: any) => m.email === user.email);
		(repo as any).canEdit = memberInfo ? memberInfo.canEdit : false;
	});
    
	const allRepos = [...ownerRepos, ...memberRepos];
	const uniqueRepos = Array.from(new Map(allRepos.map(repo => [repo._id!.toString(), repo])).values());

	return uniqueRepos.map(repo => ({
		_id: repo._id,
		repoName: repo.repoName,
		source: repo.repoType,
		canEdit: (repo as any).canEdit,
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
export function uniqueRepositories(repositories: any[]): any[] {
	const uniqueMap = new Map<string, any>();
	for (const repo of repositories) 
		if (repo?._id && !uniqueMap.has(repo._id.toString())) 
			uniqueMap.set(repo._id.toString(), repo);
    
  
	return Array.from(uniqueMap.values());
}


export async function getOneRepositoryById(repoId: string): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	return await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) }) as unknown as Repository | null;
}

export async function getOneRepository(ownerId: string, name: string): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	return await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ owner: oid(ownerId), repoName: name }) as unknown as Repository | null;
}

export async function getRepoSettingsById(repoId: string): Promise<any> {
	const db = dbConnection.getConnection();
	const repo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) });
	return repo?.settings || null;
}

export async function getRepoAiConfigById(repoId: string): Promise<AiConfig | null> {
	const db = dbConnection.getConnection();
	const repo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) });
	return repo?.aiConfig || null;
}

export async function createRepo(ownerId: string, name: string, session?: ClientSession, client?: MongoClient): Promise<ObjectId> {
	const db = session ? client!.db('Seed') : dbConnection.getConnection();
	const existingRepo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ owner: oid(ownerId), repoName: name }, { session });
	if (existingRepo) 
		throw new Error('You already own a repository with this name!');
    

	const emptyRepo: Omit<RepositoryDoc, '_id'> = {
		owner: oid(ownerId),
		repoName: name,
		stories: [],
		repoType: 'db',
		groups: [],
		customBlocks: []
	};

	const result = await db.collection<RepositoryDoc>(repositoriesCollection).insertOne(emptyRepo as RepositoryDoc, { session });
	return result.insertedId;
}

export async function updateRepository(repoId: string, newName?: string, globalSettings?: any, aiConfig?: AiConfig): Promise<any> {
	const db = dbConnection.getConnection();
	const updateFields: Partial<Repository> = {};
	if (newName !== undefined) updateFields.repoName = newName;
	if (globalSettings !== undefined) updateFields.settings = globalSettings;
    
	// Encrypt API keys before saving
	if (aiConfig !== undefined) {
		// Create a deep copy to avoid modifying the input object
		const configToSave: AiConfig = JSON.parse(JSON.stringify(aiConfig));

		if (configToSave.textPreparation?.apiKey && !isAlreadyEncrypted(configToSave.textPreparation.apiKey)) 
			configToSave.textPreparation.apiKey = encrypt(configToSave.textPreparation.apiKey) || undefined;
        

		if (configToSave.jsonConversion?.apiKey && !isAlreadyEncrypted(configToSave.jsonConversion.apiKey)) 
			configToSave.jsonConversion.apiKey = encrypt(configToSave.jsonConversion.apiKey) || undefined;
        

		updateFields.aiConfig = configToSave;
	}

	const result = await db.collection<RepositoryDoc>(repositoriesCollection).findOneAndUpdate(
		{ _id: oid(repoId) },
		{ $set: updateFields } as any,
		{ returnDocument: 'after' }
	);
	return result;
}

export async function updateOwnerInRepo(repoId: string, newOwnerId: string, oldOwnerId: string): Promise<string> {
	const oldOwner = await getUserById(oldOwnerId);
	const newOwner = await getUserById(newOwnerId);

	if (!oldOwner || !newOwner) 
		throw new Error('Could not find one or both users');
    

	// Update repository owner
	await dbConnection.getConnection().collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId) },
		{ $set: { owner: oid(newOwnerId) } as any }
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
		throw new Error('Repository not found or user is not the owner.');
    

	// Check for members to transfer ownership
	const workgroup = await workgroupService.getWorkgroup(repoId);

	// Case 1: Transfer ownership if members exist
	if (workgroup && Array.isArray(workgroup.Members) && workgroup.Members.length > 0) {
		const members = await workgroupService.getMembers(repoId);
		const newOwnerMember = members.member.find(m => m.canEdit) || members.member[0];
		const newOwnerUser = await db.collection<UserDoc>('User').findOne({ email: newOwnerMember.email });

		if (!newOwnerUser) throw new Error('Could not find user to promote to new owner.');

		// 1. Update repository owner
		await repoCollection.updateOne({ _id: oid(repoId) }, { $set: { owner: oid(newOwnerUser._id) } as any });

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

export async function insertStoryIdIntoRepo(storyId: string, repoId: string, client?: MongoClient, session?: ClientSession): Promise<any> {
	const db = session ? client!.db('Seed', session) : dbConnection.getConnection();
    
	return await db.collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId) },
		{ $push: { stories: oid(storyId) } as any },
		{ session }
	);
}

export async function updateStoriesArrayInRepo(repoId: string, storiesArray: string[]): Promise<Repository | null> {
	const db = dbConnection.getConnection();
	const sortedStoriesArray = storiesArray.map(s => oid(s));

	const result = await db.collection<RepositoryDoc>(repositoriesCollection).findOneAndUpdate(
		{ _id: oid(repoId) },
		{ $set: { stories: sortedStoriesArray } as any },
		{ returnDocument: 'after' }
	);

	return result as unknown as Repository | null;
}


// --- Story Group Functions ---

export async function getAllStoryGroups(repoId: string): Promise<Group[]> {
	const db = dbConnection.getConnection();
	const repo = await db.collection<RepositoryDoc>(repositoriesCollection).findOne({ _id: oid(repoId) }, { projection: { groups: 1 } });
	return (repo?.groups || []) as unknown as Group[];
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
		{ $push: { groups: newGroup } as any },
		{ upsert: false, projection: { groups: 1 }, session, returnDocument: 'after' }
	);

	if (!result?.groups?.length) 
		throw new Error(`Repository ${repoId} not found or group creation failed`);
    
	const newGroupId = result.groups.slice(-1)[0]._id!;
	return newGroupId;
}

export async function updateStoryGroup(repoId: string, groupId: string, updatedGroup: Group, client?: MongoClient, session?: ClientSession): Promise<any> {
	const db = session && client ? client.db('Seed', session) : dbConnection.getConnection();
	updatedGroup._id = oid(groupId) as any;
	const collection = db.collection<RepositoryDoc>(repositoriesCollection);
	const repo = await collection.findOne({ _id: oid(repoId) }, { session });

	if (!repo) 
		throw new Error('Repository not found');
    

	// leave with double equal
	const index = repo.groups.findIndex((g) => g._id?.toString() == groupId);
	if (index === -1) 
		throw new Error('Group not found in repository');
    

	repo.groups[index] = updatedGroup as unknown as GroupDoc;

	await collection.updateOne({ _id: oid(repoId) }, { $set: { groups: repo.groups } as any }, { session });
	return updatedGroup;
}

export async function deleteStoryGroup(repoId: string, groupId: string): Promise<any> {
	const db = dbConnection.getConnection();
	return db.collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId) },
		{ $pull: { groups: { _id: oid(groupId) } } as any }
	);
}

export async function addToStoryGroup(repoId: string, groupId: string, storyId: string): Promise<any> {
	const db = dbConnection.getConnection();
	return db.collection(repositoriesCollection).updateOne(
		{ _id: oid(repoId), 'groups._id': oid(groupId) },
		{ $push: { 'groups.$.member_stories': oid(storyId) } as any }
	);
}

export async function removeFromStoryGroup(repoId: string, groupId: string, storyId: string): Promise<any> {
	const db = dbConnection.getConnection();
	return db.collection(repositoriesCollection).updateOne(
		{ _id: oid(repoId), 'groups._id': oid(groupId) },
		{ $pull: { 'groups.$.member_stories': oid(storyId) } as any }
	);
}

export async function updateStoryGroupsArray(repoId: string, groupsArray: Group[]): Promise<any> {
	const db = dbConnection.getConnection();
	return db.collection<RepositoryDoc>(repositoriesCollection).updateOne(
		{ _id: oid(repoId) },
		{ $set: { groups: groupsArray } as any }
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

export async function createJiraRepo(repoName: string): Promise<any> {
	const db = dbConnection.getConnection();
	const newRepo: Partial<RepositoryDoc> = {
		owner: '' as any,  // Jira repos have no owner
		repoName,
		stories: [],
		repoType: 'jira'
	};
	return await db.collection<RepositoryDoc>(repositoriesCollection).insertOne(newRepo as RepositoryDoc);
}

export async function createGitRepo(gitOwnerId: string, repoName: string, userGithubId: number, userId: string): Promise<any> {
	const db = dbConnection.getConnection();
	const newRepo: Partial<RepositoryDoc> = {
		owner: '' as any,  // Set below if user is the GitHub owner
		gitOwner: gitOwnerId,
		repoName,
		stories: [],
		repoType: 'github'
	};
	if (userGithubId.toString() === gitOwnerId) 
		newRepo.owner = oid(userId);
    
	return await db.collection<RepositoryDoc>(repositoriesCollection).insertOne(newRepo as RepositoryDoc);
}