// src/services/user.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// --- 2. Define mock collections ---
// These will be returned by mockDb.collection
const mockUserCollection = {
	findOne: vi.fn(),
	insertOne: vi.fn(),
	deleteOne: vi.fn(),
	findOneAndReplace: vi.fn(),
	updateOne: vi.fn()
};
const mockRepoCollection = {
	find: vi.fn()
};

// --- 3. The Test Suite ---
describe('UserService', () => {

	// Reset all mocks before each individual test
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset the implementation of mockDb.collection for each test
		mockDb.collection.mockImplementation((name: string) => {
			if (name === 'User') return mockUserCollection;
			if (name === 'Repositories') return mockRepoCollection;
			// Return a default mock if another collection is unexpectedly called
			return { findOne: vi.fn(), insertOne: vi.fn(), deleteOne: vi.fn() };
		});

		// Reset individual mock functions inside the collections
		mockUserCollection.findOne.mockReset();
		mockUserCollection.insertOne.mockReset();
		mockUserCollection.deleteOne.mockReset();
		mockRepoCollection.find.mockReset();
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
	});

});