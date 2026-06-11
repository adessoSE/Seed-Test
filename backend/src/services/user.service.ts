import { ObjectId, Filter } from 'mongodb';
import * as dbConnection from '../database/DbConnector';
import { User } from '@shared/models/User';
import * as repositoryService from './repository.service';
import * as workgroupService from './workgroup.service';
import { Repository } from '@shared/models/Repository';

const userCollection = 'User';
const PwResetReqCollection = 'PwResetRequests';

// --- Password Reset ---

export async function createResetRequest(request: { createdAt: Date, uuid: string, email: string }): Promise<any> {
    const db = dbConnection.getConnection();
    return db.collection(PwResetReqCollection).insertOne(request);
}

export async function getResetRequest(id: string): Promise<any> {
    const db = dbConnection.getConnection();
    return db.collection(PwResetReqCollection).findOne({ uuid: id.toString() });
}

export async function getResetRequestByEmail(mail: string): Promise<any> {
    const db = dbConnection.getConnection();
    return db.collection(PwResetReqCollection).findOne({ email: mail.toString() });
}

export async function deleteRequest(mail: string): Promise<any> {
    const db = dbConnection.getConnection();
    return db.collection(PwResetReqCollection).deleteOne({ email: mail.toString() });
}

// --- User Account Management (CRUD) ---

export async function getUserById(userId: string | ObjectId): Promise<User | null> {
    const db = dbConnection.getConnection();
    const filter: Filter<User> = { _id: new ObjectId(userId) };
    return db.collection<User>(userCollection).findOne(filter);
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const db = dbConnection.getConnection();
    return db.collection<User>(userCollection).findOne({ email: email.toString() });
}

export async function registerUser(user: Partial<User>): Promise<any> {
    const db = dbConnection.getConnection();
    const collection = db.collection<User>(userCollection);
    const dbUser = await getUserByEmail(user.email!);
    if (dbUser) {
        throw new Error('User already exists');
    }

    if (user._id) {
        return collection.updateOne(
            { _id: new ObjectId(user._id) },
            { $set: { email: user.email, password: user.password } }
        );
    }
    return collection.insertOne(user as User);
}

export async function updateUser(userId: string | ObjectId, updatedUser: User): Promise<any> {
    const db = dbConnection.getConnection();
    const filter: Filter<User> = { _id: new ObjectId(userId) };
    return db.collection<User>(userCollection).findOneAndReplace(filter, updatedUser);
}

/**
 * Deletes a user and all their associated data.
 * - Deletes/Transfers all repositories owned by the user.
 * - Removes the user from all workgroups they are a member of.
 * - Finally, deletes the user document itself.
 */
export async function deleteUser(userId: string | ObjectId): Promise<any> {
    const db = dbConnection.getConnection();
    const user = await db.collection<User>(userCollection).findOne({ _id: new ObjectId(userId) });
    if (!user) {
        throw new Error(`User with ID ${userId} not found`);
    }

    // 1. Handle all repositories owned by the user
    const ownedRepositories = await db.collection<Repository>('Repositories').find({ owner: new ObjectId(userId) }).toArray();
    
    // Create an array of promises for all repository deletion/transfer operations
    const deletionPromises = ownedRepositories.map(repo => 
        repositoryService.deleteRepository(repo._id!.toString(), userId.toString())
    );
    
    // Wait for all promises to resolve
    await Promise.all(deletionPromises);

    // 2. Remove the user from all workgroups where they are a member
    await workgroupService.removeUserFromAllWorkgroups(user.email);

    // 3. Finally, delete the user document
    return await db.collection<User>(userCollection).deleteOne({ _id: new ObjectId(userId) });
}

// --- GitHub Account Management ---

export async function getUserByGithub(login: string, id: number): Promise<User | null> {
    const db = dbConnection.getConnection();
    const query: Filter<User> = { 'github.id': id, 'github.login': login };
    return db.collection<User>(userCollection).findOne(query);
}

export async function registerGithubUser(githubProfile: any): Promise<any> {
    const db = dbConnection.getConnection();
    const sanitizedProfile = mongoSanitize(githubProfile);
    const userToInsert: Partial<User> = { github: sanitizedProfile };
    return db.collection<User>(userCollection).insertOne(userToInsert as User);
}

export async function findOrRegisterGithub(githubProfile: any): Promise<User | null> {
    let user = await getUserByGithub(githubProfile.login, githubProfile.id);
    if (!user) {
        const result = await registerGithubUser(githubProfile);
        user = await getUserById(result.insertedId);
    } else if (user._id) {
        await updateGithubToken(user._id, githubProfile.githubToken);
    }
    return user;
}

export async function updateGithubToken(userId: string | ObjectId, token: string): Promise<any> {
    const db = dbConnection.getConnection();
    return db.collection<User>(userCollection).updateOne(
        { _id: new ObjectId(userId) },
        { $set: { 'github.githubToken': token } }
    );
}

export async function mergeGithub(seedUserId: string, githubLogin: string, githubId: number): Promise<User> {
    const db = dbConnection.getConnection();
    const collection = db.collection<User>(userCollection);
    const githubAccount = await getUserByGithub(githubLogin, githubId);
    const seedAccount = await getUserById(seedUserId);

    if (!githubAccount || !seedAccount || !githubAccount._id || !seedAccount._id) {
        throw new Error("One or both user accounts could not be found for merging.");
    }

    seedAccount.github = githubAccount.github;
    if (githubAccount.jira && !seedAccount.jira) {
        seedAccount.jira = githubAccount.jira;
    }

    await collection.deleteOne({ _id: githubAccount._id });
    await updateUser(seedAccount._id, seedAccount);
    return seedAccount;
}

export async function disconnectGithub(userId: string | ObjectId): Promise<any> {
    const db = dbConnection.getConnection();
    return db.collection<User>(userCollection).updateOne(
        { _id: new ObjectId(userId) },
        { $unset: { github: "" } }
    );
}

function mongoSanitize(v: any): any {
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