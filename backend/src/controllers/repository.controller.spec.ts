// src/controllers/repository.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedRepoService,
	mockedSyncService,
	mockedUserService,
	mockedLogger,
} = vi.hoisted(() => ({
	mockedRepoService: {
		dbProjects: vi.fn(),
		uniqueRepositories: vi.fn(),
		createRepo: vi.fn(),
		updateRepository: vi.fn(),
		updateOwnerInRepo: vi.fn(),
		deleteRepository: vi.fn(),
		getRepoSettingsById: vi.fn(),
		getRepoAiConfigById: vi.fn(),
	},
	mockedSyncService: {
		getJiraRepos: vi.fn(),
		starredRepositories: vi.fn(),
		ownRepositories: vi.fn(),
	},
	mockedUserService: {
		getUserByEmail: vi.fn(),
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock('../services/repository.service', () => mockedRepoService);
vi.mock('../services/externalSync.service', () => mockedSyncService);
vi.mock('../services/user.service', () => mockedUserService);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './repository.controller.js';

// --- Test constants ---
const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_ID_2 = '507f1f77bcf86cd799439012';
const INVALID_ID = 'invalid';

// --- Test helpers ---

/** Creates a minimal Express Request with sensible defaults and optional overrides. */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		user: {
			_id: new ObjectId(VALID_ID),
			email: 'test@seed.de',
		},
		...overrides,
	} as unknown as Request;
}

/** Creates a mock Express Response with chainable status() and json(). */
function createRes(): Response {
	const res = {} as Response;
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
}


// --- Test Suite ---
describe('RepositoryController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn() as unknown as NextFunction;
	});

	// ---------------------------------------------------------------
	// getRepositories
	// ---------------------------------------------------------------
	describe('getRepositories', () => {
		it('returns repositories for the authenticated user', async () => {
			const dbRepos = [{ _id: VALID_ID, repoName: 'DbRepo', source: 'db' }];
			const uniqueRepos = [{ _id: VALID_ID, repoName: 'DbRepo', source: 'db' }];

			// Default all external sources to empty — prevents failures if TESTACCOUNT env vars are set
			mockedSyncService.getJiraRepos.mockResolvedValue([]);
			mockedSyncService.starredRepositories.mockResolvedValue([]);
			mockedSyncService.ownRepositories.mockResolvedValue([]);
			mockedRepoService.dbProjects.mockResolvedValue(dbRepos);
			mockedRepoService.uniqueRepositories.mockReturnValue(uniqueRepos);

			const req = createReq();
			await controller.getRepositories(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(mockedRepoService.dbProjects).toHaveBeenCalledWith(VALID_ID);
			expect(mockedRepoService.uniqueRepositories).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(uniqueRepos);
			expect(next).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// createRepository
	// ---------------------------------------------------------------
	describe('createRepository', () => {
		it('creates a repository and returns 201 with inserted ID', async () => {
			const insertedId = new ObjectId(VALID_ID_2);
			mockedRepoService.createRepo.mockResolvedValue(insertedId);

			const req = createReq({ body: { name: 'NewRepo' } });
			await controller.createRepository(req, res, next);

			expect(mockedRepoService.createRepo).toHaveBeenCalledWith(VALID_ID, 'NewRepo');
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({ insertedId });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 when repository name is missing', async () => {
			const req = createReq({ body: {} });
			await controller.createRepository(req, res, next);

			// Missing name throws AppError.badRequest inside try, caught and passed to next
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Repository name is required' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('throws 409 when repository name is a duplicate', async () => {
			// Service rejects with a message the catch block recognizes as a duplicate
			mockedRepoService.createRepo.mockRejectedValue(
				new Error('You already own a repository named TestRepo')
			);

			const req = createReq({ body: { name: 'TestRepo' } });

			// The catch block re-throws AppError.conflict instead of calling next
			await expect(controller.createRepository(req, res, next))
				.rejects.toMatchObject({ statusCode: 409 });

			expect(next).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// deleteRepository
	// ---------------------------------------------------------------
	describe('deleteRepository', () => {
		it('deletes a repository and returns 200', async () => {
			const result = { status: 'deleted', message: 'Repository deleted' };
			mockedRepoService.deleteRepository.mockResolvedValue(result);

			const req = createReq({ params: { repo_id: VALID_ID } });
			await controller.deleteRepository(req, res, next);

			expect(mockedRepoService.deleteRepository).toHaveBeenCalledWith(VALID_ID, VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(result);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repo_id: INVALID_ID } });
			await controller.deleteRepository(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// updateRepositorySettings
	// ---------------------------------------------------------------
	describe('updateRepositorySettings', () => {
		it('updates repository settings and returns 200', async () => {
			const updatedRepo = { _id: VALID_ID, repoName: 'Updated', settings: { browser: 'chrome' } };
			mockedRepoService.updateRepository.mockResolvedValue(updatedRepo);

			const req = createReq({
				params: { repo_id: VALID_ID },
				body: { repoName: 'Updated', settings: { browser: 'chrome' } },
			});
			await controller.updateRepositorySettings(req, res, next);

			expect(mockedRepoService.updateRepository).toHaveBeenCalledWith(
				VALID_ID, 'Updated', { browser: 'chrome' }, undefined
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updatedRepo);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repo_id: INVALID_ID }, body: { repoName: 'X' } });
			await controller.updateRepositorySettings(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// updateRepositoryOwner (transferOwnership)
	// ---------------------------------------------------------------
	describe('updateRepositoryOwner', () => {
		it('transfers ownership successfully', async () => {
			const newOwner = { _id: new ObjectId(VALID_ID_2), email: 'newowner@seed.de' };
			mockedUserService.getUserByEmail.mockResolvedValue(newOwner);
			mockedRepoService.updateOwnerInRepo.mockResolvedValue('Success');

			const req = createReq({
				params: { repo_id: VALID_ID },
				body: { email: 'newowner@seed.de' },
			});
			await controller.updateRepositoryOwner(req, res, next);

			expect(mockedUserService.getUserByEmail).toHaveBeenCalledWith('newowner@seed.de');
			expect(mockedRepoService.updateOwnerInRepo).toHaveBeenCalledWith(
				VALID_ID, VALID_ID_2, VALID_ID
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Owner updated successfully' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({
				params: { repo_id: INVALID_ID },
				body: { email: 'someone@seed.de' },
			});
			await controller.updateRepositoryOwner(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(mockedUserService.getUserByEmail).not.toHaveBeenCalled();
		});

		it('returns 404 when new owner is not found', async () => {
			mockedUserService.getUserByEmail.mockResolvedValue(null);

			const req = createReq({
				params: { repo_id: VALID_ID },
				body: { email: 'unknown@seed.de' },
			});
			await controller.updateRepositoryOwner(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404, message: 'New owner user not found' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// getRepositorySettings
	// The controller has no separate renameRepository — renaming is
	// handled through updateRepositorySettings (tested above).
	// ---------------------------------------------------------------
	describe('getRepositorySettings', () => {
		it('returns settings for a valid repository ID', async () => {
			const settings = { browser: 'chrome', resolution: '1920x1080' };
			mockedRepoService.getRepoSettingsById.mockResolvedValue(settings);

			const req = createReq({ params: { repo_id: VALID_ID } });
			await controller.getRepositorySettings(req, res, next);

			expect(mockedRepoService.getRepoSettingsById).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(settings);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repo_id: INVALID_ID } });
			await controller.getRepositorySettings(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
