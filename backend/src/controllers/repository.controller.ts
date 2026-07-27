import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { User } from '@shared/models/User.js';
import { RepositoryContainer, AiConfig } from '@shared/models/RepositoryContainer.js';
import * as repositoryService from '../services/repository.service.js';
import * as userService from '../services/user.service.js';
import * as externalSyncService from '../services/externalSync.service.js';
import { logger } from '../logging.js';


/**
 * Fetches all repositories for the logged-in user from all sources (DB, GitHub, Jira).
 */
export async function getRepositories(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = req.user as User;

		const jiraPromise = externalSyncService.getJiraRepos(user.jira);
		const dbPromise = repositoryService.dbProjects(user._id!.toString());

		let starredPromise: Promise<any[]> = Promise.resolve([]);
		let ownedPromise: Promise<any[]> = Promise.resolve([]);

		if (user?.github) {
			const { login: githubName, githubToken: token, id: githubId } = user.github;
			starredPromise = externalSyncService.starredRepositories(user._id!.toString(), githubId, githubName, token);
			ownedPromise = externalSyncService.ownRepositories(user._id!.toString(), githubId, githubName, token);

		} else if (process.env.TESTACCOUNT_NAME && process.env.TESTACCOUNT_TOKEN) {
			logger.info(`User ${user.email} not linked. Using TESTACCOUNT fallback.`);
			const githubName = process.env.TESTACCOUNT_NAME!;
			const token = process.env.TESTACCOUNT_TOKEN!;
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

		const processResult = (result: PromiseSettledResult<any>, name: string): any[] => {
			if (result.status === 'fulfilled') 
				return result.value;
			else {
				logger.error(`Error fetching ${name}: ${result.reason?.message || result.reason}`);
				return [];
			}
		};

		const starred = processResult(results[0], 'GitHub Starred Repos');
		const owned = processResult(results[1], 'GitHub Owned Repos');
		const jira = processResult(results[2], 'Jira Repos');
		const db = processResult(results[3], 'DB Repos');

		const merged: Partial<RepositoryContainer>[] = [
			...(starred as any[]), 
			...(owned as any[]), 
			...(jira as any[]), 
			...(db as any[])
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
		const { name } = req.body;
		if (!name) {
			res.status(400).json({ error: 'Repository name is required' });
			return;
		}

		const insertedId = await repositoryService.createRepo(user._id!.toString(), name);
		res.status(201).json({ insertedId });
	} catch (error) {
		// Duplicate repository name — return 409 Conflict instead of generic 500
		if (error instanceof Error && error.message.includes('already own a repository')) {
			res.status(409).json({ error: error.message });
			return;
		}
		next(error);
	}
}

/**
 * Updates a repository's settings (name, global settings, AI config).
 */
export async function updateRepositorySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { repo_id } = req.params;
		if (!ObjectId.isValid(repo_id)) {
			res.status(400).json({ error: 'Invalid repository ID' });
			return;
		}
        
		const { repoName, settings, aiConfig }: { repoName?: string, settings?: any, aiConfig?: AiConfig } = req.body;

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
		if (!ObjectId.isValid(repo_id)) {
			res.status(400).json({ error: 'Invalid repository ID' });
			return;
		}
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
		if (!ObjectId.isValid(repo_id)) {
			res.status(400).json({ error: 'Invalid repository ID' });
			return;
		}
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
		if (!ObjectId.isValid(repo_id)) {
			res.status(400).json({ error: 'Invalid repository ID' });
			return;
		}

		const newOwner = await userService.getUserByEmail(req.body.email);
		if (!newOwner) {
			res.status(404).json({ error: 'New owner user not found' });
			return;
		}

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
		if (!ObjectId.isValid(repo_id)) {
			res.status(400).json({ error: 'Invalid repository ID' });
			return;
		}

		const result = await repositoryService.deleteRepository(repo_id, user._id!.toString());
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}