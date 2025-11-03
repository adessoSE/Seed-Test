import { ObjectId } from 'mongodb';
import * as dbConnection from '../database/DbConnector';
import { Repository } from '@shared/models/Repository';
import { getUserById } from './user.service';

const repositoriesCollection = 'Repositories';
const workgroupsCollection = 'Workgroups';

export interface Workgroup {
    _id?: ObjectId;
    name: string;
    owner: string;
    Repo: ObjectId;
    Members: { email: string, canEdit: boolean }[];
}

/**
 * Retrieves a single workgroup document by its repository ID.
 * @param repoId The ID of the repository linked to the workgroup.
 * @returns A Promise that resolves to the workgroup object or null if not found.
 */
export async function getWorkgroup(repoId: string): Promise<Workgroup | null> {
    const db = dbConnection.getConnection();
    return await db.collection<Workgroup>(workgroupsCollection).findOne({ Repo: new ObjectId(repoId) });
}

/**
 * Retrieves the owner and all members of a workgroup for a given repository.
 * @param repoId The ID of the repository.
 * @returns An object containing the owner and a list of members.
 */
export async function getMembers(repoId: string): Promise<{ owner: { email: string | undefined, canEdit: true }, member: any[] }> {
    const db = dbConnection.getConnection();
    const repo = await db.collection<Repository>(repositoriesCollection).findOne({ _id: new ObjectId(repoId) });
    if (!repo) {
        throw new Error('Repository not found');
    }

    const owner = await getUserById(repo.owner);
    const workgroup = await db.collection<Workgroup>(workgroupsCollection).findOne({ Repo: new ObjectId(repoId) });

    return {
        owner: { email: owner?.email, canEdit: true },
        member: workgroup?.Members || []
    };
}

/**
 * Adds a new member to a repository's workgroup. Creates the workgroup if it doesn't exist.
 * @param repoId The ID of the repository.
 * @param user The user to add, containing email and canEdit status.
 * @returns The updated list of members for the repository.
 */
export async function addMember(repoId: string, user: { email: string, canEdit: boolean }): Promise<any> {
    const db = dbConnection.getConnection();
    const workgroupCollection = db.collection<Workgroup>(workgroupsCollection);
    const repo = await db.collection<Repository>(repositoriesCollection).findOne({ _id: new ObjectId(repoId) });
    if (!repo) {
        throw new Error('Repository not found');
    }

    const owner = await getUserById(repo.owner);
    const workgroup = await workgroupCollection.findOne({ Repo: new ObjectId(repoId) });

    if (!workgroup) {
        // Create a new workgroup if none exists for this repo
        await workgroupCollection.insertOne({
            name: repo.repoName,
            owner: owner!.email,
            Repo: new ObjectId(repoId),
            Members: [user]
        });
    } else {
        const memberExists = workgroup.Members.some((m: any) => m.email === user.email);
        if (memberExists) {
            throw new Error('This user is already in the work group');
        }
        await workgroupCollection.updateOne(
            { Repo: new ObjectId(repoId) },
            { $push: { Members: user } as any }
        );
    }
    return await getMembers(repoId);
}

/**
 * Updates the edit status of a member in a workgroup.
 * @param repoId The ID of the repository.
 * @param user An object with the member's email and their new canEdit status.
 * @returns The updated list of members.
 */
export async function updateMemberStatus(repoId: string, user: { email: string, canEdit: boolean }): Promise<any> {
    const db = dbConnection.getConnection();
    await db.collection<Workgroup>(workgroupsCollection).updateOne(
        { Repo: new ObjectId(repoId), "Members.email": user.email },
        { $set: { "Members.$.canEdit": user.canEdit } }
    );
    return await getMembers(repoId);
}

/**
 * Transfers ownership of a workgroup to a new owner and adds the old owner as a member.
 * @param repoId The ID of the repository.
 * @param newOwnerEmail The email of the new owner.
 * @param oldOwnerEmail The email of the old owner.
 */
export async function transferOwnership(repoId: string, newOwnerEmail: string, oldOwnerEmail: string): Promise<void> {
    const db = dbConnection.getConnection();
    const workgroupCollection = db.collection<Workgroup>(workgroupsCollection);

    // Set new owner and remove them from the members list
    await workgroupCollection.updateOne(
        { Repo: new ObjectId(repoId) },
        {
            $set: { owner: newOwnerEmail },
            $pull: { Members: { email: newOwnerEmail } } as any
        }
    );

    // Add old owner as a member with edit rights
    await addMember(repoId, { email: oldOwnerEmail, canEdit: true });

}

/**
 * Promotes a member to be the new owner of a workgroup.
 * This is used when the current owner deletes their repository.
 * @param repoId The ID of the repository.
 * @param newOwnerEmail The email of the member who will become the new owner.
 */
export async function promoteNewOwner(repoId: string, newOwnerEmail: string): Promise<void> {
    const db = dbConnection.getConnection();
    await db.collection<Workgroup>(workgroupsCollection).updateOne(
        { Repo: new ObjectId(repoId) },
        {
            $set: { owner: newOwnerEmail },
            $pull: { Members: { email: newOwnerEmail } } as any
        }
    );
}

/**
 * Removes a member from a repository's workgroup.
 * @param repoId The ID of the repository.
 * @param user An object with the email of the member to remove.
 * @returns The updated list of members.
 */
export async function removeFromWorkgroup(repoId: string, user: { email: string }): Promise<any> {
    const db = dbConnection.getConnection();
    await db.collection<Workgroup>(workgroupsCollection).updateOne(
        { Repo: new ObjectId(repoId) },
        { $pull: { Members: { email: user.email } } as any }
    );
    return await getMembers(repoId);
}

/**
 * Removes a user from all workgroups they are a member of.
 * This is typically used when a user account is being deleted.
 * @param email The email of the user to remove from all workgroups.
 * @returns The result of the updateMany operation.
 */
export async function removeUserFromAllWorkgroups(email: string): Promise<any> {
    const db = dbConnection.getConnection();
    return await db.collection<Workgroup>(workgroupsCollection).updateMany(
        { 'Members.email': email },
        { $pull: { Members: { email } } as any }
    );
}