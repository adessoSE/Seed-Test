import { type ObjectId, type InsertOneResult, type DeleteResult, type UpdateResult } from 'mongodb';
import { randomUUID } from 'node:crypto';
import * as dbConnection from '../database/DbConnector.js';
import { type User } from '@seed-test/shared/models/User.js';
import * as repositoryService from './repository.service.js';
import * as workgroupService from './workgroup.service.js';
import { type UserDoc, type RepositoryDoc, oid } from '../types/mongo.types.js';
import { AppError } from '../helpers/AppError.js';
import { mongoSanitize } from '../utils/mongo-sanitize.js';
import { encrypt, decrypt } from '../helpers/cryptoHelper.js';

const userCollection = 'User';
const PwResetReqCollection = 'PwResetRequests';
const repositoriesCollection = 'Repositories';

// Password reset request document shape
interface PwResetRequestDoc {
	_id?: ObjectId;
	createdAt: Date;
	uuid: string;
	email: string;
}

// Minimal shape of the raw GitHub API profile — only fields this service reads
interface GithubProfile {
	login: string;
	id: number;
	githubToken: string;
	[key: string]: unknown;
}

// cryptoHelper.encrypt output: 'nonce(12 bytes = 24 hex):ciphertext(hex):authTag(16 bytes = 32 hex)'.
// GitHub tokens carry prefixes like 'gho_' or 'github_pat_' (with underscores), so this pattern
// never matches a plaintext token. That makes it safe to tell stored ciphertext from legacy plaintext.
const ENCRYPTED_TOKEN_PATTERN = /^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/i;

/**
 * Encrypts a GitHub token for storage. Idempotent: a value that is already ciphertext is returned unchanged,
 * so repeated writes of a decrypted user record never double-encrypt.
 */
function toStoredToken(token: string): string {
	if (ENCRYPTED_TOKEN_PATTERN.test(token)) return token;
	return encrypt(token) ?? '';
}

/**
 * Decrypts a stored GitHub token for in-memory use.
 * Legacy plaintext records (written before encryption existed) are returned as-is and are encrypted
 * the next time the account is written. Undecryptable ciphertext (e.g. rotated key) yields '' so the
 * account simply has no usable token instead of leaking or crashing.
 */
function fromStoredToken(token: string): string {
	if (!token || !ENCRYPTED_TOKEN_PATTERN.test(token)) return token;
	return decrypt(token) ?? '';
}

/** Returns the user with its GitHub token decrypted. Every read path goes through this, so consumers never see ciphertext. */
function withReadableGithubToken(user: User | null): User | null {
	if (user?.github)
		user.github = { ...user.github, githubToken: fromStoredToken(user.github.githubToken) };
	return user;
}

// --- Password Reset ---

// Password reset links are valid for 24 hours after creation
const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Tells whether a reset request is past its lifetime. Written as !(age <= TTL) so that a missing or invalid
 * createdAt (NaN) counts as expired.
 */
export function isResetRequestExpired(createdAt: Date, now: number = Date.now()): boolean {
	const ageMs = now - new Date(createdAt).getTime();
	return !(ageMs <= RESET_TOKEN_TTL_MS);
}

/** Stores a new password reset request (uuid + email + createdAt) for later redemption via /reset. */
export async function createResetRequest(request: PwResetRequestDoc): Promise<InsertOneResult<PwResetRequestDoc>> {
	const db = dbConnection.getConnection();
	return db.collection<PwResetRequestDoc>(PwResetReqCollection).insertOne(request);
}

/** Finds a reset request by its uuid. Returns null when the token is unknown or already used. */
export async function getResetRequest(id: string): Promise<PwResetRequestDoc | null> {
	const db = dbConnection.getConnection();
	return db.collection<PwResetRequestDoc>(PwResetReqCollection).findOne({ uuid: id.toString() });
}

/** Finds the pending reset request for an email address. */
export async function getResetRequestByEmail(mail: string): Promise<PwResetRequestDoc | null> {
	const db = dbConnection.getConnection();
	return db.collection<PwResetRequestDoc>(PwResetReqCollection).findOne({ email: mail.toString() });
}

/** Deletes the pending reset request for an email address (used on reuse, expiry and after a successful reset). */
export async function deleteRequest(mail: string): Promise<DeleteResult> {
	const db = dbConnection.getConnection();
	return db.collection<PwResetRequestDoc>(PwResetReqCollection).deleteOne({ email: mail.toString() });
}

// --- User Account Management (CRUD) ---

/**
 * Loads a user by its ObjectId. The GitHub token is returned decrypted.
 * @returns The user, or null when no account has this id.
 */
export function getUserById(userId: string | ObjectId) {
	const db = dbConnection.getConnection();
	const filter = { _id: oid(userId) };
	return db.collection<UserDoc>(userCollection).findOne(filter).then(v => withReadableGithubToken(v as unknown as User | null));
}

/**
 * Loads a user by email. The GitHub token is returned decrypted.
 * @returns The user, or null when no account has this email.
 */
export function getUserByEmail(email: string) {
	const db = dbConnection.getConnection();
	return db.collection<UserDoc>(userCollection).findOne({ email: email.toString() }).then(v => withReadableGithubToken(v as unknown as User | null));
}

/**
 * Inserts a new account. Never updates an existing one.
 * Any `_id` in the input is dropped here: the caller cannot choose the id of a document, so registration
 * can never be turned into an overwrite of another account.
 * @throws AppError 409 when an account with this email already exists.
 */
export async function registerUser(user: Partial<User>): Promise<InsertOneResult<UserDoc>> {
	const db = dbConnection.getConnection();
	const collection = db.collection<UserDoc>(userCollection);
	const dbUser = await getUserByEmail(user.email!);
	if (dbUser)
		throw AppError.conflict('User already exists');

	const { _id: _ignoredId, ...newUser } = user;
	return collection.insertOne(newUser as unknown as UserDoc);
}

/**
 * Applies a partial update: only the keys present in `updatedUser` are $set, all other fields are left
 * untouched. Callers must pass just the fields they change, never a snapshot of the whole user, or a
 * concurrent change to another field can be overwritten.
 * A GitHub token in the update is encrypted before it is written.
 */
export function updateUser(userId: string | ObjectId | undefined, updatedUser: Partial<User>) {
	const db = dbConnection.getConnection();
	const filter = { _id: oid(userId!) };
	const updateFields: Record<string, unknown> = { ...updatedUser };
	delete updateFields._id;
	if (updatedUser.github?.githubToken)
		updateFields.github = { ...updatedUser.github, githubToken: toStoredToken(updatedUser.github.githubToken) };
	return db.collection<UserDoc>(userCollection).findOneAndUpdate(
		filter,
		{ $set: updateFields },
		{ returnDocument: 'after' }
	).then(v => v as unknown as User | null);
}

/**
 * Deletes a user and all their associated data.
 * - Deletes all repositories owned by the user, one after another. The first failure stops the process
 *   and is reported to the caller, so the account is never half-deleted in silence.
 * - Removes the user from all workgroups they are a member of.
 * - Finally, deletes the user document itself.
 * @throws AppError 404 when the user does not exist.
 */
export async function deleteUser(userId: string | ObjectId): Promise<DeleteResult> {
	const db = dbConnection.getConnection();
	const user = await db.collection<UserDoc>(userCollection).findOne({ _id: oid(userId) }) as unknown as User | null;
	if (!user)
		throw AppError.notFound(`User with ID ${String(userId)} not found`);

	// 1. Handle all repositories owned by the user
	const ownedRepositories = await db.collection<RepositoryDoc>(repositoriesCollection).find({ owner: oid(userId) }).toArray();

	// Sequential on purpose: Promise.all would start every deletion and leave an unpredictable partial state on failure
	for (const repo of ownedRepositories)
		await repositoryService.deleteRepository(repo._id.toString(), userId.toString());

	// 2. Remove the user from all workgroups where they are a member
	await workgroupService.removeUserFromAllWorkgroups(user.email);

	// 3. Finally, delete the user document
	return db.collection<UserDoc>(userCollection).deleteOne({ _id: oid(userId) });
}

// --- GitHub Account Management ---

/**
 * Finds the account that carries a given GitHub identity (login + numeric id). The token is returned decrypted.
 * @returns The account, or null when no account is linked to this GitHub identity.
 */
export function getUserByGithub(login: string, id: number) {
	const db = dbConnection.getConnection();
	const query = { 'github.id': id, 'github.login': login };
	return db.collection<UserDoc>(userCollection).findOne(query).then(v => withReadableGithubToken(v as unknown as User | null));
}

/**
 * Inserts a GitHub-only account built from the verified OAuth profile. The token is stored encrypted.
 */
export async function registerGithubUser(githubProfile: GithubProfile): Promise<InsertOneResult<UserDoc>> {
	const db = dbConnection.getConnection();
	const sanitizedProfile = mongoSanitize({ ...githubProfile, githubToken: toStoredToken(githubProfile.githubToken) });
	const userToInsert: Partial<User> = { github: sanitizedProfile };
	return db.collection<UserDoc>(userCollection).insertOne(userToInsert as unknown as UserDoc);
}

/**
 * Login helper for the GitHub OAuth callback: returns the account linked to this GitHub identity, creating
 * a GitHub-only account on first login. For an existing account the stored token is refreshed.
 * @returns The account with a decrypted token, or null if it could not be loaded after insert.
 */
export async function findOrRegisterGithub(githubProfile: GithubProfile): Promise<User | null> {
	let user = await getUserByGithub(githubProfile.login, githubProfile.id);
	if (!user) {
		const result = await registerGithubUser(githubProfile);
		user = await getUserById(result.insertedId);
	} else if (user._id)
		await updateGithubToken(user._id, githubProfile.githubToken);

	return user;
}

/** Replaces the GitHub token of an account. The token is stored encrypted. */
export async function updateGithubToken(userId: string | ObjectId, token: string): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<UserDoc>(userCollection).updateOne(
		{ _id: oid(userId) },
		{ $set: { 'github.githubToken': toStoredToken(token) } }
	);
}

/**
 * Tells whether an account is a GitHub-only stub: created by the OAuth callback, with a GitHub link and
 * no Seed-Test login (no e-mail, no password). Only a stub may be absorbed or deleted by a merge, and
 * only a stub may receive a login through registration.
 */
export function isGithubOnlyStub(user: Pick<User, 'github' | 'email' | 'password'>): boolean {
	return !!user.github && !user.email && !user.password;
}

/**
 * Adds a Seed-Test login (e-mail and already-hashed password) to a GitHub-only stub, which then becomes a
 * regular account. The stub keeps its id, its repositories and its GitHub link.
 * The caller must pass the id of the authenticated session user, never an id from the request body.
 * @throws AppError 409 when the e-mail already belongs to an account, or when the stub already has a login.
 */
export async function attachCredentialsToGithubStub(userId: string | ObjectId, email: string, hashedPassword: string): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	if (await getUserByEmail(email))
		throw AppError.conflict('User already exists');

	// The filter repeats the "no login yet" check, so two concurrent registrations on one stub cannot both succeed.
	// null matches both a missing field and a null one.
	// Untyped collection: the typed filter does not accept null, and null is the point of this match
	const result = await db.collection(userCollection).updateOne(
		{ _id: oid(userId), email: null, password: null },
		{ $set: { email, password: hashedPassword, transitioned: true } }
	);
	if (result.matchedCount === 0)
		throw AppError.conflict('This GitHub account already has a Seed-Test login.');
	return result;
}

// Merge-intent tokens issued by initiate and consumed by mergeGithub. They live in memory: an intent is valid
// for minutes only, and a restart just means the user starts the merge again.
const MERGE_INTENT_TTL_MS = 5 * 60 * 1000;
const mergeIntents = new Map<string, { userId: string; expiresAt: number }>();

/** Drops every merge intent whose lifetime has passed. */
function purgeExpiredMergeIntents(now: number = Date.now()): void {
	for (const [token, intent] of mergeIntents)
		if (intent.expiresAt <= now)
			mergeIntents.delete(token);
}

// Frees intents of accounts that never complete a merge. unref() keeps this timer from holding the process open.
setInterval(purgeExpiredMergeIntents, 5 * 60 * 1000).unref();

/**
 * Issues a single-use merge token for a Seed account. Each account holds at most one live token: a new
 * initiate replaces the token issued before. The store therefore grows with the number of accounts, not
 * with the number of requests, so one client cannot exhaust it by calling initiate in a loop.
 * @returns the token to pass to mergeGithub.
 */
export function createMergeIntent(userId: string): string {
	for (const [token, intent] of mergeIntents)
		if (intent.userId === userId)
			mergeIntents.delete(token);

	const token = randomUUID();
	mergeIntents.set(token, { userId, expiresAt: Date.now() + MERGE_INTENT_TTL_MS });
	return token;
}

/**
 * Consumes a merge token. The token is deleted on every call, even when it has expired, so it can never be
 * replayed.
 * @returns the Seed account id the token was issued for, or null when the token is unknown or expired.
 */
export function consumeMergeIntent(token: string): string | null {
	const intent = mergeIntents.get(token);
	if (!intent)
		return null;

	mergeIntents.delete(token);
	return intent.expiresAt < Date.now() ? null : intent.userId;
}

/**
 * Merges a verified GitHub-only stub (G, the session user after OAuth) into a Seed account (S).
 * The controller has already consumed a merge-intent token that proves ownership of S.
 *
 * Write order, chosen so that no failure leaves the GitHub id on two accounts and no data is lost:
 *   1. G's repositories move to S (G still holds the GitHub link, so a retry finds it again)
 *   2. the GitHub link is removed from G
 *   3. the GitHub link (and Jira link, if S has none) is written to S
 *   4. G is deleted
 * Step 2 must precede step 3: the GitHub identity may exist on one account only. A failure between steps 2
 * and 3 leaves the link on neither account; G has no repositories left by then, and the user needs a new
 * GitHub login. Deleting G before the repositories move would lose them for good.
 * This is sequential, not atomic: multi-document transactions need a replica set.
 * S is updated with a field-level $set, not a full snapshot, so concurrent changes to S are not overwritten.
 * @throws AppError 404 when either account is missing.
 * @throws AppError 400 when the GitHub identity already belongs to the target (a self-merge would delete it).
 * @throws AppError 409 when S is already linked to a different GitHub identity (never silently overwritten).
 * @throws AppError 409 when G is not a GitHub-only stub: it has a password or an e-mail and is a real account.
 */
export async function mergeGithub(seedUserId: string, githubLogin: string, githubId: number): Promise<User> {
	const db = dbConnection.getConnection();
	const githubAccount = await getUserByGithub(githubLogin, githubId);
	const seedAccount = await getUserById(seedUserId);

	if (!githubAccount || !seedAccount || !githubAccount._id || !seedAccount._id)
		throw AppError.notFound('One or both user accounts could not be found for merging.');

	// CASE 1: Self-merge — the GitHub identity already lives on the target, so deleting the "source" would delete the target
	if (githubAccount._id.toString() === seedAccount._id.toString())
		throw AppError.badRequest('This GitHub account is already linked to your Seed account.');

	// CASE 2: Target is linked to another GitHub identity — refuse instead of overwriting it
	if (seedAccount.github && (seedAccount.github.id !== githubId || seedAccount.github.login !== githubLogin))
		throw AppError.conflict('This Seed account is already linked to a different GitHub account.');

	// CASE 3: Source has its own password or e-mail, so it is a real account. Deleting it would destroy a login
	if (!isGithubOnlyStub(githubAccount))
		throw AppError.conflict('This GitHub account already has its own Seed-Test login and cannot be merged. Log in with that login instead.');

	const usersCollection = db.collection<UserDoc>(userCollection);
	const sourceId = oid(githubAccount._id);

	// Step 1: repositories move first, so no data stays behind on the source
	await db.collection<RepositoryDoc>(repositoriesCollection).updateMany(
		{ owner: sourceId },
		{ $set: { owner: oid(seedAccount._id) } }
	);

	// Step 2: detach the GitHub identity from G
	await usersCollection.updateOne({ _id: sourceId }, { $unset: { github: '' } });

	// Step 3: attach it to S. Only the changed fields are written.
	const seedChanges: Partial<User> = { github: githubAccount.github };
	if (githubAccount.jira && !seedAccount.jira)
		seedChanges.jira = githubAccount.jira;
	await updateUser(seedAccount._id, seedChanges);

	// Step 4: G is now empty and holds no identity, so it can go
	await usersCollection.deleteOne({ _id: sourceId });

	seedAccount.github = githubAccount.github;
	if (seedChanges.jira)
		seedAccount.jira = seedChanges.jira;
	return seedAccount;
}

/**
 * Removes the GitHub link from an account ($unset of the github sub-document). The account itself is kept.
 */
export async function disconnectGithub(userId: string | ObjectId): Promise<UpdateResult> {
	const db = dbConnection.getConnection();
	return db.collection<UserDoc>(userCollection).updateOne(
		{ _id: oid(userId) },
		{ $unset: { github: '' } }
	);
}
