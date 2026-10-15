// src/database/DbConnector.spec.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));

vi.mock('mongodb', () => ({
	MongoClient: { connect }
}));

vi.mock('../logging', () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import * as dbConnector from './DbConnector.js';

describe('DbConnector', () => {
	const originalUri = process.env.DATABASE_URI;

	beforeEach(() => {
		delete process.env.DATABASE_URI;
		connect.mockReset();
	});

	afterEach(() => {
		if (originalUri === undefined)
			delete process.env.DATABASE_URI;
		else
			process.env.DATABASE_URI = originalUri;
	});

	// Regression: a hardcoded fallback URI shipped working admin credentials in the source
	it('fails closed with a clear error when DATABASE_URI is not set and never connects with a default', async () => {
		await expect(dbConnector.establishConnection()).rejects.toThrow(/DATABASE_URI is not set/);
		expect(connect).not.toHaveBeenCalled();
	});

	it('connects using the URI from the environment', async () => {
		process.env.DATABASE_URI = 'mongodb://example.test:27017';
		connect.mockResolvedValue({ db: vi.fn(() => ({})) });

		await dbConnector.establishConnection();

		expect(connect).toHaveBeenCalledWith('mongodb://example.test:27017', expect.anything());
	});
});
