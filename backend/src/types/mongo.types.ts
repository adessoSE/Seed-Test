/**
 * MongoDB Document Types
 *
 * Maps shared model interfaces to their MongoDB representation.
 * Shared models use `string` for ID/reference fields (consumed by the frontend).
 * MongoDB stores these as `ObjectId`. These types bridge that gap so services
 * can work with typed collections — no `as any` casts needed for filters or assignments.
 *
 * Usage:
 *   db.collection<StoryDoc>(storiesCollection).findOne({ _id: oid(storyId) })
 *
 * Return values (WithId<XxxDoc>) serialize correctly via res.json() because
 * ObjectId.toJSON() returns the hex string. Cast to the shared model type
 * at service function boundaries: `return doc as unknown as Story | null;`
 */
import { ObjectId } from 'mongodb';
import { Block } from '@shared/models/Block.js';
import { Story } from '@shared/models/Story.js';
import { Repository } from '@shared/models/Repository.js';
import { Group } from '@shared/models/Group.js';
import { User } from '@shared/models/User.js';
import { FileElement } from '@shared/models/FileElement.js';

// --- Conversion Helpers ---

/** Shorthand for `new ObjectId(id)` — use instead of `new ObjectId(id) as any` */
export function oid(id: string | ObjectId): ObjectId {
	return id instanceof ObjectId ? id : new ObjectId(id);
}

// --- MongoDB Document Types ---

export interface StoryDoc extends Omit<Story, '_id'> {
	_id?: ObjectId;
}

export interface BlockDoc extends Omit<Block, '_id' | 'owner' | 'repositoryId'> {
	_id?: ObjectId;
	owner?: ObjectId;
	repositoryId?: ObjectId;
}

export interface UserDoc extends Omit<User, '_id'> {
	_id?: ObjectId;
}

export interface FileDoc extends Omit<FileElement, '_id'> {
	_id?: ObjectId;
}

export interface GroupDoc extends Omit<Group, '_id' | 'member_stories'> {
	_id?: ObjectId;
	member_stories: ObjectId[];
}

export interface RepositoryDoc extends Omit<Repository, '_id' | 'owner' | 'stories' | 'customBlocks' | 'groups'> {
	_id?: ObjectId;
	owner: ObjectId;
	stories: ObjectId[];
	customBlocks?: ObjectId[];
	groups: GroupDoc[];
}
