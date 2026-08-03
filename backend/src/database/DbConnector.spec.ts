import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = vi.hoisted(() => ({
	db: vi.fn().mockReturnValue('mockDb'),
	close: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('mongodb', () => ({
	MongoClient: {
		connect: vi.fn().mockResolvedValue(mockClient)
	}
}));

vi.mock('../logging.js', () => ({
	logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

import { establishConnection, getConnection, closeConnection } from './DbConnector.js';

describe('DbConnector', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Reset module-level state so each test starts with a clean connection
		await closeConnection();
	});

	it('establishes a connection and returns a MongoClient', async () => {
		const client = await establishConnection();
		expect(client).toBe(mockClient);
		expect(mockClient.db).toHaveBeenCalledWith('Seed');
	});

	it('getConnection returns the Db instance after connection', async () => {
		await establishConnection();
		expect(getConnection()).toBe('mockDb');
	});

	it('getConnection throws before establishing a connection', () => {
		// State is clean after beforeEach — no connection has been established
		expect(() => getConnection()).toThrow('Database connection has not been established yet.');
	});

	it('closeConnection closes the MongoClient and nullifies state', async () => {
		await establishConnection();
		await closeConnection();
		expect(mockClient.close).toHaveBeenCalled();
	});

	it('closeConnection is safe to call multiple times', async () => {
		// Both calls should complete without throwing
		await closeConnection();
		await closeConnection();
	});
});
