import { type ObjectId, type InsertOneResult, type DeleteResult, type UpdateResult } from 'mongodb';
import * as dbConnection from '../database/DbConnector.js';
import { type User } from '@seed-test/shared/models/User.js';
import * as repositoryService from './repository.service.js';
import * as workgroupService from './workgroup.service.js';
import { type UserDoc, type RepositoryDoc, oid } from '../types/mongo.types.js';
import { AppError } from '../helpers/AppError.js';
import { mongoSanitize } from '../utils/mongo-sanitize.js';

const userCollection = 'User';
const PwResetReqCollection = 'PwResetRequests';

// Password reset request document shape
interface PwResetRequestDoc {
	_id?: ObjectId;
	createdAt: Date;
	uuid: string;
	email: string;
}

// --- Password Reset ---

export async function createResetRequest(request: PwResetRequestDoc): Promise<InsertOneResult<PwResetRequestDoc>> {
	const db = dbConnection.getConnection();
	return db.collection<PwResetRequestDoc>(PwResetReqCollection).insertOne(request);
}

export async function getResetRequest(id: string): Promise<PwResetRequestDoc | null> {
	const db = dbConnection.getConnection();
	return db.collection<PwResetRequestDoc>(PwResetReqCollection).findOne({ uuid: id.toString() });
}

export async function getResetRequestByEmail(mail: string): Promise<PwResetRequestDoc | null> {
	const db = dbConnection.getConnection();
	return db.collection<PwResetRequestDoc>(PwResetReqCollection).findOne({ email: mail.toString() });
}

export async function deleteRequest(mail: string): Promise<DeleteResult> {
	const db = dbConnection.getConnection();
	return db.collection<PwResetRequestDoc>(PwResetReqCollection).deleteOne({ email: mail.toString() });
}

// --- User Account Management (CRUD) ---

export function getUserById(userId: string | ObjectId) {
	const db = dbConnection.getConnection();
	const filter = { _id: oid(userId) };
	return db.collection<UserDoc>(userCollection).findOne(filter).then(v => v as unknown as User | null);
}

export function getUserByEmail(email: string) {
	const db = dbConnection.getConnection();
	return db.collection<UserDoc>(userCollection).findOne({ email: email.toString() }).then(v => v as unknown as User | null);
}

export async function registerUser(user: Partial<User>): Promise<InsertOneResult<UserDoc>> {
	const db = dbConnection.getConnection();
	const collection = db.collection<UserDoc>(userCollection);
	const dbUser = await getUserByEmail(user.email!);
	if (dbUser) 
		throw AppError.conflict('User already exists');
    

	if (user._id) 
		return collection.updateOne(
			{ _id: oid(user._id) },
			{ $set: { email: user.email, password: user.password } }
		) as unknown as InsertOneResult<UserDoc>;
    
	return collection.insertOne(user as unknown as UserDoc);
}

export function updateUser(userId: string | ObjectId | undefined, updatedUser: User) {
	const db = dbConnection.getConnection();
	const filter = { _id: oid(userId!) };
	return db.collection<UserDoc>(userCollection).findOneAndReplace(filter, updatedUser).then(v => v as unknown as User | null);
}

/**
 * Deletes a user and all their associated data.
 * - Deletes/Transfers all repositories owned by the user.
 * - Removes the user from all workgroups they are a member of.
 * - Finally, deletes the user document itself.
 */
export async function deleteUser(userId: string | ObjectId): Promise<DeleteResult> {
	const db = dbConnection.getConnection();
	const user = await db.collection<UserDoc>(userCollection).findOne({ _id: oid(userId) }) as unknown as User | null;
	if (!user) 
		throw AppError.notFound(`User with ID ${String(userId)} not found`);
    

	// 1. Handle all repositories owned by the user
	const ownedRepositories = await db.collection<RepositoryDoc>('Repositories').find({ owner: oid(userId) }).toArray();
    
	// Create an array of promises for all repository deletion/transfer operations
	const deletionPromises = ownedRepositories.map(repo => 
		repositoryService.deleteRepository(repo._id.toString(), userId.toString())
	);
    
	// Wait for all promises to resolve
	await Promise.all(deletionPromises);

	// 2. Remove the user from all workgroups where they are a member
	await workgroupService.removeUserFromAllWorkgroups(user.email);

	// 3. Finally, delete the user document
	return db.collection<UserDoc>(userCollection).deleteOne({ _id: oid(userId) });
}

// Minimal shape of the raw GitHub API profile — only fields this service reads
interface GithubProfile {
	login: string;
	id: number;
	githubToken: string;
	[key: string]: unknown;
}

// --- GitHub Account Management ---

export function getUserByGithub(login: string, id: number) {
	const db = dbConnection.getConnection();
	const query = { 'github.id': id, 'github.login': login };
	return db.collection<UserDoc>(userCollection).findOne(query).then(v => v as unknown as User | null);
}

export async function registerGithubUser(githubProfile: GithubProfile): Promise<InsertOneResult<UserDoc>> {
	const db = dbConnection.getConnection();
	const sanitizedProfile = mongoSanitize(githubProfile);
	const userToInsert: Partial<User> = { github: sanitizedProfile };
	return db.collection<UserDoc>(userCollection).insertOne(userToInsert as unknown as UserDoc);
}

export async function findOrRegisterGithub(githubProfile: GithubProfile): Promise<User | null> {
	let user = await getUserByGithub(githubProfile.login, githubProfile.id);
	if (!user) {
		const result = await registerGithubUser(githubProfile);
		user = await getUserById(result.insertedId);
	} else if (user._id) 
		await updateGithubToken(user._id, githubProfile.githubToken);
    
	return user;
}

export async function updateGithubToken(userId: string | ObjectId, token: string): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<UserDoc>(userCollection).updateOne(
		{ _id: oid(userId) },
		{ $set: { 'github.githubToken': token } }
	);
}

export async function mergeGithub(seedUserId: string, githubLogin: string, githubId: number): Promise<User> {
	const db = dbConnection.getConnection();
	const collection = db.collection<UserDoc>(userCollection);
	const githubAccount = await getUserByGithub(githubLogin, githubId);
	const seedAccount = await getUserById(seedUserId);

	if (!githubAccount || !seedAccount || !githubAccount._id || !seedAccount._id) 
		throw AppError.notFound('One or both user accounts could not be found for merging.');
    

	seedAccount.github = githubAccount.github;
	if (githubAccount.jira && !seedAccount.jira) 
		seedAccount.jira = githubAccount.jira;
    

	await collection.deleteOne({ _id: oid(githubAccount._id) });
	await updateUser(seedAccount._id, seedAccount);
	return seedAccount;
}

export async function disconnectGithub(userId: string | ObjectId): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<UserDoc>(userCollection).updateOne(
		{ _id: oid(userId) },
		{ $unset: { github: '' } }
	);
}