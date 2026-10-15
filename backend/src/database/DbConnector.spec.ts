// src/database/DbConnector.spec.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { connect, mockClient } = vi.hoisted(() => ({
	connect: vi.fn(),
	mockClient: { db: vi.fn(), close: vi.fn() }
}));

vi.mock('mongodb', () => ({
	MongoClient: { connect }
}));

vi.mock('../logging', () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import * as dbConnector from './DbConnector.js';

describe('DbConnector', () => {
	const originalUri = process.env.DATABASE_URI;

	beforeEach(async () => {
		process.env.DATABASE_URI = 'mongodb://example.test:27017';
		connect.mockReset();
		connect.mockResolvedValue(mockClient);
		mockClient.db.mockReset();
		mockClient.db.mockReturnValue('mockDb');
		mockClient.close.mockReset();
		mockClient.close.mockResolvedValue(undefined);
		// Connection state lives at module level; reset it so each test starts disconnected
		await dbConnector.closeConnection();
	});

	afterEach(() => {
		if (originalUri === undefined)
			delete process.env.DATABASE_URI;
		else
			process.env.DATABASE_URI = originalUri;
	});

	// Regression: a hardcoded fallback URI shipped working admin credentials in the source
	it('fails closed with a clear error when DATABASE_URI is not set and never connects with a default', async () => {
		delete process.env.DATABASE_URI;

		await expect(dbConnector.establishConnection()).rejects.toThrow(/DATABASE_URI is not set/);
		expect(connect).not.toHaveBeenCalled();
	});

	it('connects using the URI from the environment', async () => {
		await dbConnector.establishConnection();

		expect(connect).toHaveBeenCalledWith('mongodb://example.test:27017', expect.anything());
	});

	it('establishes a connection and returns a MongoClient', async () => {
		const client = await dbConnector.establishConnection();

		expect(client).toBe(mockClient);
		expect(mockClient.db).toHaveBeenCalledWith('Seed');
	});

	it('getConnection returns the Db instance after connection', async () => {
		await dbConnector.establishConnection();

		expect(dbConnector.getConnection()).toBe('mockDb');
	});

	it('getConnection throws before establishing a connection', () => {
		expect(() => dbConnector.getConnection()).toThrow('Database connection has not been established yet.');
	});

	it('closeConnection closes the MongoClient and clears the Db instance', async () => {
		await dbConnector.establishConnection();

		await dbConnector.closeConnection();

		expect(mockClient.close).toHaveBeenCalledTimes(1);
		expect(() => dbConnector.getConnection()).toThrow('Database connection has not been established yet.');
	});

	it('closeConnection is a no-op when no connection was established', async () => {
		await dbConnector.closeConnection();

		expect(mockClient.close).not.toHaveBeenCalled();
	});

	it('closeConnection closes only once when called repeatedly', async () => {
		await dbConnector.establishConnection();

		await dbConnector.closeConnection();
		await dbConnector.closeConnection();

		expect(mockClient.close).toHaveBeenCalledTimes(1);
	});
});
