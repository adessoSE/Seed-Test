import { type Request, type Response, type NextFunction } from 'express';
import { requireValidId } from '../utils/validation.js';
import { type User } from '@seed-test/shared/models/User.js';
import { type RepositoryContainer, type AiConfig } from '@seed-test/shared/models/RepositoryContainer.js';
import * as repositoryService from '../services/repository.service.js';
import * as userService from '../services/user.service.js';
import * as externalSyncService from '../services/externalSync.service.js';
import { logger } from '../logging.js';
import { AppError } from '../helpers/AppError.js';


/**
 * Fetches all repositories for the logged-in user from all sources (DB, GitHub, Jira).
 */
export async function getRepositories(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = req.user as User;

		const jiraPromise = externalSyncService.getJiraRepos(user.jira);
		const dbPromise = repositoryService.dbProjects(user._id!.toString());

		let starredPromise: Promise<unknown[]> = Promise.resolve([]);
		let ownedPromise: Promise<unknown[]> = Promise.resolve([]);

		if (user.github) {
			const { login: githubName, githubToken: token, id: githubId } = user.github;
			starredPromise = externalSyncService.starredRepositories(user._id!.toString(), githubId, githubName, token);
			ownedPromise = externalSyncService.ownRepositories(user._id!.toString(), githubId, githubName, token);

		} else if (process.env.TESTACCOUNT_NAME && process.env.TESTACCOUNT_TOKEN) {
			logger.info(`User ${user.email} not linked. Using TESTACCOUNT fallback.`);
			const githubName = process.env.TESTACCOUNT_NAME;
			const token = process.env.TESTACCOUNT_TOKEN;
			const githubId = 0;
			starredPromise = externalSyncService.starredRepositories(user._id!.toString(), githubId, githubName, token);
			ownedPromise = externalSyncService.ownRepositories(user._id!.toString(), githubId, githubName, token);
        
		} else 
			logger.info(`User ${user.email} not linked. TESTACCOUNT variables not set. Skipping GitHub sync.`);
        

		// Use the new/correct services for each source
		const results = await Promise.allSettled([
			starredPromise,
			ownedPromise,
			jiraPromise,
			dbPromise
		]);

		const processResult = (result: PromiseSettledResult<unknown[]>, name: string): unknown[] => {
			if (result.status === 'fulfilled') 
				return result.value;
			else {
				const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
				logger.error(`Error fetching ${name}: ${reason}`);
				return [];
			}
		};

		const starred = processResult(results[0], 'GitHub Starred Repos');
		const owned = processResult(results[1], 'GitHub Owned Repos');
		const jira = processResult(results[2], 'Jira Repos');
		const db = processResult(results[3], 'DB Repos');

		const merged: Partial<RepositoryContainer>[] = [
			...(starred as Partial<RepositoryContainer>[]), 
			...(owned as Partial<RepositoryContainer>[]), 
			...(jira as Partial<RepositoryContainer>[]), 
			...(db as Partial<RepositoryContainer>[])
		];
		const unique = repositoryService.uniqueRepositories(merged);
        
		res.status(200).json(unique);
	} catch (error) {
		next(error);
	}
}

/**
 * Creates a new, empty repository in the database.
 */
export async function createRepository(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = req.user as User;
		const name = (req.body as Record<string, unknown>).name as string;
		if (!name)
			throw AppError.badRequest('Repository name is required');

		const insertedId = await repositoryService.createRepo(user._id!.toString(), name);
		res.status(201).json({ insertedId });
	} catch (error) {
		// Duplicate repository name — return 409 Conflict instead of generic 500
		if (error instanceof Error && error.message.includes('already own a repository'))
			throw AppError.conflict(error.message);

		next(error);
	}
}

/**
 * Updates a repository's settings (name, global settings, AI config).
 */
export async function updateRepositorySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id } = req.params;
		requireValidId(repo_id, 'repository ID');

		const { repoName, settings, aiConfig } = req.body as { repoName?: string; settings?: Record<string, unknown>; aiConfig?: AiConfig };

		// Note: The repositoryService.updateRepository already handles API key encryption
		const repo = await repositoryService.updateRepository(repo_id, repoName, settings, aiConfig);
		res.status(200).json(repo);
	} catch (error) {
		next(error);
	}
}

/**
 * Fetches the global settings for a specific repository.
 */
export async function getRepositorySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id } = req.params;
		requireValidId(repo_id, 'repository ID');

		const settings = await repositoryService.getRepoSettingsById(repo_id);
		res.status(200).json(settings);
	} catch (error) {
		next(error);
	}
}

/**
 * Fetches the AI configuration for a specific repository.
 */
export async function getRepositoryAiConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id } = req.params;
		requireValidId(repo_id, 'repository ID');

		const aiConfig = await repositoryService.getRepoAiConfigById(repo_id);
		res.status(200).json(aiConfig);
	} catch (error) {
		next(error);
	}
}

/**
 * Transfers ownership of a repository to a new user.
 */
export async function updateRepositoryOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id } = req.params;
		const user = req.user as User;
		requireValidId(repo_id, 'repository ID');

		const newOwner = await userService.getUserByEmail((req.body as Record<string, unknown>).email as string);
		if (!newOwner)
			throw AppError.notFound('New owner user not found');

		await repositoryService.updateOwnerInRepo(repo_id, newOwner._id!.toString(), user._id!.toString());
		res.status(200).json({ message: 'Owner updated successfully' });
	} catch (error) {
		next(error);
	}
}

/**
 * Deletes a repository (or transfers ownership if workgroup members exist).
 */
export async function deleteRepository(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id } = req.params;
		const user = req.user as User;
		requireValidId(repo_id, 'repository ID');

		const result = await repositoryService.deleteRepository(repo_id, user._id!.toString());
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}