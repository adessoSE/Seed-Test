// src/services/user.service.spec.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';

// Import the services we are testing or mocking
import * as userService from './user.service.js';
import * as dbConnection from '../database/DbConnector.js';
import * as repositoryService from './repository.service.js';
import * as workgroupService from './workgroup.service.js';

// --- 1. Mock all external dependencies ---

// Mock the database connector
const mockDb = {
	collection: vi.fn()
};
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));

// Mock the services that are called by userService.deleteUser
vi.mock('./repository.service', () => ({
	deleteRepository: vi.fn().mockResolvedValue({ status: 'deleted' })
}));
vi.mock('./workgroup.service', () => ({
	removeUserFromAllWorkgroups: vi.fn().mockResolvedValue({ modifiedCount: 1 })
}));

// Deterministic stand-in for AES-256-GCM: the stored format is 'nonce:hex(plain):tag',
// which matches the real cryptoHelper output shape so the service's format detection is exercised.
const fakeCrypto = vi.hoisted(() => ({
	encrypt: vi.fn((text: string) => `${'a'.repeat(24)}:${Buffer.from(text, 'utf8').toString('hex')}:${'b'.repeat(32)}`),
	decrypt: vi.fn((encrypted: string) => Buffer.from(encrypted.split(':')[1], 'hex').toString('utf8'))
}));
vi.mock('../helpers/cryptoHelper', () => fakeCrypto);

// --- 2. Define mock collections ---
// These will be returned by mockDb.collection
const mockUserCollection = {
	findOne: vi.fn(),
	insertOne: vi.fn(),
	deleteOne: vi.fn(),
	findOneAndReplace: vi.fn(),
	findOneAndUpdate: vi.fn(),
	updateOne: vi.fn()
};
const mockRepoCollection = {
	find: vi.fn(),
	updateMany: vi.fn()
};
const mockWorkgroupCollection = {
	updateMany: vi.fn()
};

const SEED_ID = '605c72ef1f1d4b001f8e8e8e';
const GITHUB_ONLY_ID = '605c72ef1f1d4b001f8e8e8f';

/**
 * Routes findOne by query shape: a 'github.id' filter returns the GitHub-identity account,
 * an _id filter returns the Seed account. Mirrors how mergeGithub loads both sides.
 */
function mockAccounts(githubAccount: unknown, seedAccount: unknown) {
	mockUserCollection.findOne.mockImplementation(async (filter: Record<string, unknown>) => {
		if ('github.id' in filter) return githubAccount;
		if (String(filter._id) === SEED_ID) return seedAccount;
		return null;
	});
}

// --- 3. The Test Suite ---
describe('UserService', () => {

	// Reset all mocks before each individual test
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset the implementation of mockDb.collection for each test
		mockDb.collection.mockImplementation((name: string) => {
			if (name === 'User') return mockUserCollection;
			if (name === 'Repositories') return mockRepoCollection;
			if (name === 'Workgroups') return mockWorkgroupCollection;
			// Return a default mock if another collection is unexpectedly called
			return { findOne: vi.fn(), insertOne: vi.fn(), deleteOne: vi.fn() };
		});

		// Reset individual mock functions inside the collections
		mockUserCollection.findOne.mockReset();
		mockUserCollection.insertOne.mockReset();
		mockUserCollection.deleteOne.mockReset();
		mockUserCollection.findOneAndUpdate.mockReset().mockResolvedValue(null);
		mockUserCollection.updateOne.mockReset().mockResolvedValue({ modifiedCount: 1 });
		mockRepoCollection.find.mockReset();
		mockRepoCollection.updateMany.mockReset().mockResolvedValue({ modifiedCount: 0 });
		mockWorkgroupCollection.updateMany.mockReset().mockResolvedValue({ modifiedCount: 0 });
	});

	// --- Tests for GetUser ---

	describe('getUserById', () => {
		it('should return a user when found', async () => {
			// A. Arrange (Set up the test data and mocks)
			const fakeUserId = '605c72ef1f1d4b001f8e8e8e'; // Valid 24-char hex
			const fakeUser = { _id: new ObjectId(fakeUserId), email: 'test@test.com' };

			// Tell our mock findOne to return the fake user
			mockUserCollection.findOne.mockResolvedValue(fakeUser);

			// B. Act (Call the function we want to test)
			const user = await userService.getUserById(fakeUserId);

			// C. Assert (Check if the result is correct)
			expect(user).toEqual(fakeUser);
			expect(dbConnection.getConnection).toHaveBeenCalledTimes(1);
			expect(mockDb.collection).toHaveBeenCalledWith('User');
			expect(mockUserCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(fakeUserId) });
		});

		it('should return null when user is not found', async () => {
			// A. Arrange
			const fakeUserId = '123456789012345678901234'; // Valid 24-char hex
			mockUserCollection.findOne.mockResolvedValue(null);

			// B. Act
			const user = await userService.getUserById(fakeUserId);

			// C. Assert
			expect(user).toBeNull();
			expect(mockUserCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(fakeUserId) });
		});
	});

	describe('getUserByEmail', () => {
		it('should return a user when found by email', async () => {
			// A. Arrange
			const fakeEmail = 'test@test.com';
			const fakeUser = { _id: new ObjectId(), email: fakeEmail };
			mockUserCollection.findOne.mockResolvedValue(fakeUser);

			// B. Act
			const user = await userService.getUserByEmail(fakeEmail);

			// C. Assert
			expect(user).toEqual(fakeUser);
			expect(mockUserCollection.findOne).toHaveBeenCalledWith({ email: fakeEmail });
		});
	});

	// --- Tests for RegisterUser ---

	describe('registerUser', () => {
		it('should throw an error if the user already exists', async () => {
			// A. Arrange
			const existingUser = { email: 'exists@test.com', password: 'pw' };
			// This mock simulates that getUserByEmail finds a user
			mockUserCollection.findOne.mockResolvedValue(existingUser);

			// B. Act & C. Assert
			await expect(userService.registerUser(existingUser))
				.rejects
				.toThrow('User already exists');

			// Ensure we checked for the user
			expect(mockUserCollection.findOne).toHaveBeenCalledWith({ email: existingUser.email });
			// Ensure we did NOT try to insert
			expect(mockUserCollection.insertOne).not.toHaveBeenCalled();
		});

		it('should insert a new user if they do not exist', async () => {
			// A. Arrange
			const newUser = { email: 'new@test.com', password: 'pw' };
			const insertResult = { insertedId: new ObjectId() };

			// 1. Mock for getUserByEmail (user not found)
			mockUserCollection.findOne.mockResolvedValue(null);
			// 2. Mock for insertOne (success)
			mockUserCollection.insertOne.mockResolvedValue(insertResult);

			// B. Act
			const result = await userService.registerUser(newUser);

			// C. Assert
			expect(result).toEqual(insertResult);
			// Ensure we first checked if the user exists
			expect(mockUserCollection.findOne).toHaveBeenCalledWith({ email: newUser.email });
			// Ensure we then inserted the user
			expect(mockUserCollection.insertOne).toHaveBeenCalledWith(newUser);
		});

		it('never updates an existing account, even when the input carries an _id (account-takeover regression)', async () => {
			// Attacker-supplied _id pointing at a victim account must not turn registration into an update
			const victimId = new ObjectId(SEED_ID);
			mockUserCollection.findOne.mockResolvedValue(null);
			mockUserCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			await userService.registerUser({ _id: victimId as unknown as string, email: 'attacker@test.com', password: 'hash' });

			expect(mockUserCollection.updateOne).not.toHaveBeenCalled();
			expect(mockUserCollection.insertOne).toHaveBeenCalledTimes(1);
		});
	});

	// --- Tests for UpdateUser ---

	describe('updateUser', () => {
		it('only $sets the fields it is given (no full-snapshot overwrite)', async () => {
			await userService.updateUser(SEED_ID, { password: 'new-hash' });

			expect(mockUserCollection.findOneAndUpdate).toHaveBeenCalledWith(
				{ _id: new ObjectId(SEED_ID) },
				{ $set: { password: 'new-hash' } },
				{ returnDocument: 'after' }
			);
		});

		it('encrypts a plaintext GitHub token before writing it', async () => {
			await userService.updateUser(SEED_ID, { github: { githubToken: 'gho_plain', login: 'ghuser', id: 42 } });

			expect(fakeCrypto.encrypt).toHaveBeenCalledWith('gho_plain');
			const update = mockUserCollection.findOneAndUpdate.mock.calls[0][1] as { $set: { github: { githubToken: string } } };
			expect(update.$set.github.githubToken).not.toBe('gho_plain');
			expect(fakeCrypto.decrypt(update.$set.github.githubToken)).toBe('gho_plain');
		});

		it('does not re-encrypt a token that is already in encrypted form', async () => {
			const alreadyEncrypted = fakeCrypto.encrypt('gho_plain');
			fakeCrypto.encrypt.mockClear();

			await userService.updateUser(SEED_ID, { github: { githubToken: alreadyEncrypted, login: 'ghuser', id: 42 } });

			expect(fakeCrypto.encrypt).not.toHaveBeenCalled();
			const update = mockUserCollection.findOneAndUpdate.mock.calls[0][1] as { $set: { github: { githubToken: string } } };
			expect(update.$set.github.githubToken).toBe(alreadyEncrypted);
		});
	});

	// --- Tests for GitHub token storage ---

	describe('GitHub token storage', () => {
		it('getUserById returns the decrypted GitHub token for an encrypted record', async () => {
			mockUserCollection.findOne.mockResolvedValue({
				_id: new ObjectId(SEED_ID),
				github: { githubToken: fakeCrypto.encrypt('gho_secret'), login: 'ghuser', id: 42 }
			});

			const user = await userService.getUserById(SEED_ID);

			expect(user?.github?.githubToken).toBe('gho_secret');
		});

		it('getUserById passes a legacy plaintext token through unchanged (backward compatibility)', async () => {
			mockUserCollection.findOne.mockResolvedValue({
				_id: new ObjectId(SEED_ID),
				github: { githubToken: 'gho_legacy', login: 'ghuser', id: 42 }
			});

			const user = await userService.getUserById(SEED_ID);

			expect(user?.github?.githubToken).toBe('gho_legacy');
			expect(fakeCrypto.decrypt).not.toHaveBeenCalled();
		});

		it('registerGithubUser stores the token encrypted', async () => {
			mockUserCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			await userService.registerGithubUser({ login: 'ghuser', id: 42, githubToken: 'gho_x' });

			const stored = mockUserCollection.insertOne.mock.calls[0][0] as { github: { githubToken: string } };
			expect(stored.github.githubToken).not.toBe('gho_x');
			expect(fakeCrypto.decrypt(stored.github.githubToken)).toBe('gho_x');
		});

		it('updateGithubToken stores the token encrypted', async () => {
			await userService.updateGithubToken(SEED_ID, 'gho_y');

			const update = mockUserCollection.updateOne.mock.calls[0][1] as { $set: Record<string, string> };
			expect(update.$set['github.githubToken']).not.toBe('gho_y');
			expect(fakeCrypto.decrypt(update.$set['github.githubToken'])).toBe('gho_y');
		});
	});

	// --- Tests for DeleteUser (Critical Path) ---

	describe('deleteUser', () => {
		it('should delete a user and all their associated data', async () => {
			// A. Arrange
			const fakeUserId = '605c72ef1f1d4b001f8e8e8e';
			const fakeUser = {
				_id: new ObjectId(fakeUserId),
				email: 'user-to-delete@test.com'
			};
			const fakeRepos = [
				{ _id: 'repo1', owner: fakeUserId },
				{ _id: 'repo2', owner: fakeUserId }
			];

			// 1. Mock finding the user to delete
			mockUserCollection.findOne.mockResolvedValue(fakeUser);
			// 2. Mock finding the user's repositories
			mockRepoCollection.find.mockReturnValue({
				toArray: vi.fn().mockResolvedValue(fakeRepos)
			} as any); // Use 'as any' to simplify the complex 'find' type
			// 3. Mock the final user deletion
			mockUserCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

			// B. Act
			const result = await userService.deleteUser(fakeUserId);

			// C. Assert
			expect(result.deletedCount).toBe(1);

			// 1. Check if user was fetched
			expect(mockUserCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(fakeUserId) });

			// 2. Check if repos were fetched
			expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
			expect(mockRepoCollection.find).toHaveBeenCalledWith({ owner: new ObjectId(fakeUserId) });

			// 3. Check if repositoryService was called for each repo
			expect(repositoryService.deleteRepository).toHaveBeenCalledTimes(2);
			expect(repositoryService.deleteRepository).toHaveBeenCalledWith('repo1', fakeUserId);
			expect(repositoryService.deleteRepository).toHaveBeenCalledWith('repo2', fakeUserId);

			// 4. Check if workgroupService was called
			expect(workgroupService.removeUserFromAllWorkgroups).toHaveBeenCalledWith(fakeUser.email);

			// 5. Check if user was finally deleted
			expect(mockUserCollection.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(fakeUserId) });
		});

		it('should throw an error if user to delete is not found', async () => {
			// A. Arrange
			const fakeUserId = '605c72ef1f1d4b001f8e8e8e';
			mockUserCollection.findOne.mockResolvedValue(null); // User not found

			// B. Act & C. Assert
			await expect(userService.deleteUser(fakeUserId))
				.rejects
				.toThrow(`User with ID ${fakeUserId} not found`);

			// Ensure no other actions were taken
			expect(repositoryService.deleteRepository).not.toHaveBeenCalled();
			expect(workgroupService.removeUserFromAllWorkgroups).not.toHaveBeenCalled();
			expect(mockUserCollection.deleteOne).not.toHaveBeenCalled();
		});

		it('stops at the first failing repository and leaves the user document in place (no partial-state success)', async () => {
			mockUserCollection.findOne.mockResolvedValue({ _id: new ObjectId(SEED_ID), email: 'u@test.com' });
			mockRepoCollection.find.mockReturnValue({
				toArray: vi.fn().mockResolvedValue([{ _id: 'repo1' }, { _id: 'repo2' }])
			} as any);
			vi.mocked(repositoryService.deleteRepository).mockRejectedValueOnce(new Error('repo deletion failed'));

			await expect(userService.deleteUser(SEED_ID)).rejects.toThrow('repo deletion failed');

			// Sequential: the second repository is never attempted and the account survives for a retry
			expect(repositoryService.deleteRepository).toHaveBeenCalledTimes(1);
			expect(workgroupService.removeUserFromAllWorkgroups).not.toHaveBeenCalled();
			expect(mockUserCollection.deleteOne).not.toHaveBeenCalled();
		});
	});

	// --- Tests for mergeGithub ---

	describe('mergeGithub', () => {
		// GitHub-only stub: created by the OAuth callback, no email and no password
		const githubOnly = { _id: new ObjectId(GITHUB_ONLY_ID), github: { login: 'ghuser', id: 42, githubToken: 'gho_g' } };
		const seed = { _id: new ObjectId(SEED_ID), email: 'seed@test.com' };

		it('rejects a self-merge (the GitHub identity already belongs to the target) and deletes nothing', async () => {
			// If the target already carries this identity, deleting the "source" would delete the target itself
			mockAccounts({ ...seed, github: { login: 'ghuser', id: 42, githubToken: 'gho_g' } }, { ...seed, github: { login: 'ghuser', id: 42, githubToken: 'gho_g' } });

			await expect(userService.mergeGithub(SEED_ID, 'ghuser', 42)).rejects.toMatchObject({ statusCode: 400 });
			expect(mockUserCollection.deleteOne).not.toHaveBeenCalled();
			expect(mockUserCollection.findOneAndUpdate).not.toHaveBeenCalled();
		});

		// Regression: the source used to be deleted even when it carried a password or owned data
		it('refuses (409) to delete a source account that has its own Seed-Test password, and writes nothing', async () => {
			mockAccounts({ ...githubOnly, password: 'existing-hash' }, seed);

			await expect(userService.mergeGithub(SEED_ID, 'ghuser', 42)).rejects.toMatchObject({ statusCode: 409 });
			expect(mockRepoCollection.updateMany).not.toHaveBeenCalled();
			expect(mockUserCollection.updateOne).not.toHaveBeenCalled();
			expect(mockUserCollection.findOneAndUpdate).not.toHaveBeenCalled();
			expect(mockUserCollection.deleteOne).not.toHaveBeenCalled();
		});

		it('refuses (409) to delete a source account that has an e-mail address, and writes nothing', async () => {
			mockAccounts({ ...githubOnly, email: 'gh@test.com' }, seed);

			await expect(userService.mergeGithub(SEED_ID, 'ghuser', 42)).rejects.toMatchObject({ statusCode: 409 });
			expect(mockUserCollection.deleteOne).not.toHaveBeenCalled();
			expect(mockUserCollection.findOneAndUpdate).not.toHaveBeenCalled();
		});

		// Order: repositories move first (nothing is left on a source that is about to be deleted), then the
		// GitHub link is detached from the source, attached to the Seed account, and the source is deleted last.
		it('moves repositories, detaches the link from the source, attaches it to the Seed account, then deletes the source', async () => {
			mockAccounts(githubOnly, seed);

			await userService.mergeGithub(SEED_ID, 'ghuser', 42);

			const repoMoveOrder = mockRepoCollection.updateMany.mock.invocationCallOrder[0];
			const unsetOrder = mockUserCollection.updateOne.mock.invocationCallOrder[0];
			const attachOrder = mockUserCollection.findOneAndUpdate.mock.invocationCallOrder[0];
			const deleteOrder = mockUserCollection.deleteOne.mock.invocationCallOrder[0];
			expect(repoMoveOrder).toBeLessThan(unsetOrder);
			expect(unsetOrder).toBeLessThan(attachOrder);
			expect(attachOrder).toBeLessThan(deleteOrder);
			expect(mockUserCollection.updateOne).toHaveBeenCalledWith({ _id: new ObjectId(GITHUB_ONLY_ID) }, { $unset: { github: '' } });
			expect(mockUserCollection.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(GITHUB_ONLY_ID) });
		});

		it('transfers repository ownership from the GitHub-only account to the Seed account', async () => {
			mockAccounts(githubOnly, seed);

			await userService.mergeGithub(SEED_ID, 'ghuser', 42);

			expect(mockRepoCollection.updateMany).toHaveBeenCalledWith(
				{ owner: new ObjectId(GITHUB_ONLY_ID) },
				{ $set: { owner: new ObjectId(SEED_ID) } }
			);
		});

		// Regression: a full-snapshot write of the Seed account would overwrite concurrent changes to other fields
		it('writes only the GitHub link to the Seed account when there is no Jira link to carry over', async () => {
			mockAccounts(githubOnly, seed);

			await userService.mergeGithub(SEED_ID, 'ghuser', 42);

			const set = mockUserCollection.findOneAndUpdate.mock.calls[0][1].$set;
			expect(Object.keys(set)).toEqual(['github']);
		});

		it('also carries the Jira link over when the Seed account has none', async () => {
			mockAccounts({ ...githubOnly, jira: { jiraAccountName: 'jira-user' } }, seed);

			await userService.mergeGithub(SEED_ID, 'ghuser', 42);

			const set = mockUserCollection.findOneAndUpdate.mock.calls[0][1].$set;
			expect(Object.keys(set).sort()).toEqual(['github', 'jira']);
		});

		// Retry safety: a failure before the source is deleted leaves the source in place
		it('keeps the source account when writing the Seed account fails', async () => {
			mockAccounts(githubOnly, seed);
			mockUserCollection.findOneAndUpdate.mockRejectedValueOnce(new Error('connection lost'));

			await expect(userService.mergeGithub(SEED_ID, 'ghuser', 42)).rejects.toThrow('connection lost');
			expect(mockUserCollection.deleteOne).not.toHaveBeenCalled();
		});

		it('refuses to overwrite a different GitHub identity already linked to the Seed account (409)', async () => {
			mockAccounts(githubOnly, { ...seed, github: { login: 'other-user', id: 999, githubToken: 'gho_other' } });

			await expect(userService.mergeGithub(SEED_ID, 'ghuser', 42)).rejects.toMatchObject({ statusCode: 409 });
			expect(mockUserCollection.findOneAndUpdate).not.toHaveBeenCalled();
			expect(mockUserCollection.updateOne).not.toHaveBeenCalled();
			expect(mockUserCollection.deleteOne).not.toHaveBeenCalled();
			expect(mockRepoCollection.updateMany).not.toHaveBeenCalled();
		});
	});

	// --- GitHub-only stub detection and login attachment (register from a GitHub account) ---

	describe('isGithubOnlyStub', () => {
		it('is true for an account with a GitHub link and neither e-mail nor password', () => {
			expect(userService.isGithubOnlyStub({ github: { login: 'gh', id: 1, githubToken: 't' } } as any)).toBe(true);
		});

		it('is false when the account has a password', () => {
			expect(userService.isGithubOnlyStub({ github: { login: 'gh', id: 1, githubToken: 't' }, password: 'hash' } as any)).toBe(false);
		});

		it('is false when the account has an e-mail address', () => {
			expect(userService.isGithubOnlyStub({ github: { login: 'gh', id: 1, githubToken: 't' }, email: 'a@b.de' } as any)).toBe(false);
		});

		it('is false when the account has no GitHub link', () => {
			expect(userService.isGithubOnlyStub({ email: undefined } as any)).toBe(false);
		});
	});

	describe('attachCredentialsToGithubStub', () => {
		it('adds the e-mail, the hashed password and the transitioned flag to a stub that has neither', async () => {
			mockUserCollection.findOne.mockResolvedValue(null);
			mockUserCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

			await userService.attachCredentialsToGithubStub(GITHUB_ONLY_ID, 'new@test.com', 'hashed');

			// The filter re-checks "no login yet" atomically, so two concurrent registrations cannot both succeed
			expect(mockUserCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(GITHUB_ONLY_ID), email: null, password: null },
				{ $set: { email: 'new@test.com', password: 'hashed', transitioned: true } }
			);
		});

		it('refuses (409) an e-mail that already belongs to another account and writes nothing', async () => {
			mockUserCollection.findOne.mockResolvedValue({ _id: new ObjectId(), email: 'new@test.com' });

			await expect(userService.attachCredentialsToGithubStub(GITHUB_ONLY_ID, 'new@test.com', 'hashed')).rejects.toMatchObject({ statusCode: 409 });
			expect(mockUserCollection.updateOne).not.toHaveBeenCalled();
		});

		it('refuses (409) when the stub already has a login by the time the write runs', async () => {
			mockUserCollection.findOne.mockResolvedValue(null);
			mockUserCollection.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

			await expect(userService.attachCredentialsToGithubStub(GITHUB_ONLY_ID, 'new@test.com', 'hashed')).rejects.toMatchObject({ statusCode: 409 });
		});
	});

	// --- Reset-token lifetime ---

	describe('isResetRequestExpired', () => {
		const DAY_MS = 24 * 60 * 60 * 1000;

		it('is false for a request created just now', () => {
			expect(userService.isResetRequestExpired(new Date())).toBe(false);
		});

		it('is true for a request older than 24 hours', () => {
			expect(userService.isResetRequestExpired(new Date(Date.now() - DAY_MS - 60_000))).toBe(true);
		});

		// A missing createdAt gives NaN, which must count as expired rather than valid
		it('is true when createdAt is missing or invalid', () => {
			expect(userService.isResetRequestExpired(undefined as unknown as Date)).toBe(true);
		});
	});

	// --- Merge intents (single-use, short-lived, one per account) ---

	describe('merge intents', () => {
		const ACCOUNT_A = '60a000000000000000000001';
		const ACCOUNT_B = '60a000000000000000000002';
		const ACCOUNT_C = '60a000000000000000000003';

		afterEach(() => {
			vi.useRealTimers();
		});

		it('consumes a token exactly once and returns the account it was issued for', () => {
			const token = userService.createMergeIntent(ACCOUNT_A);

			expect(userService.consumeMergeIntent(token)).toBe(ACCOUNT_A);
			expect(userService.consumeMergeIntent(token)).toBeNull();
		});

		it('returns null for a token that was never issued', () => {
			expect(userService.consumeMergeIntent('never-issued')).toBeNull();
		});

		// Regression: a global cap let one user fill the store; now a re-initiate replaces the account's own token
		it('replaces the previous live intent of the same account', () => {
			const first = userService.createMergeIntent(ACCOUNT_B);
			const second = userService.createMergeIntent(ACCOUNT_B);

			expect(userService.consumeMergeIntent(first)).toBeNull();
			expect(userService.consumeMergeIntent(second)).toBe(ACCOUNT_B);
		});

		it('leaves the intent of a different account untouched', () => {
			const ownToken = userService.createMergeIntent(ACCOUNT_C);
			userService.createMergeIntent(ACCOUNT_A);

			expect(userService.consumeMergeIntent(ownToken)).toBe(ACCOUNT_C);
		});

		it('rejects an intent once its five-minute lifetime has passed', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
			const token = userService.createMergeIntent(ACCOUNT_A);

			vi.setSystemTime(new Date('2026-01-01T00:05:00.001Z'));

			expect(userService.consumeMergeIntent(token)).toBeNull();
		});
	});
});
