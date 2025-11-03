import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { User } from '@shared/models/User';
import { RepositoryContainer, AiConfig } from '@shared/models/RepositoryContainer';
import * as repositoryService from '../services/repository.service';
import * as userService from '../services/user.service';
import * as externalSyncService from '../services/externalSync.service';


/**
 * Fetches all repositories for the logged-in user from all sources (DB, GitHub, Jira).
 */
export async function getRepositories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = req.user as User;
        let githubName: string;
        let token: string;
        let githubId: number;

        if (user?.github) {
            githubName = user.github.login;
            token = user.github.githubToken;
            githubId = user.github.id;
        } else {
            // Fallback to test account if needed (though less ideal in TS)
            /* githubName = process.env.TESTACCOUNT_NAME!;
            token = process.env.TESTACCOUNT_TOKEN!;
            githubId = 0; */
            console.log(`User ${user.email} has no GitHub account linked. Skipping GitHub repository sync.`);
        }

        // Use the new/correct services for each source
        const [starred, owned, jira, db] = await Promise.all([
            externalSyncService.starredRepositories(user._id.toString(), githubId, githubName, token),
            externalSyncService.ownRepositories(user._id.toString(), githubId, githubName, token),
            externalSyncService.getJiraRepos(user.jira),
            repositoryService.dbProjects(user._id.toString())
        ]);

        let merged: Partial<RepositoryContainer>[] = [
            ...(starred as any[]), 
            ...(owned as any[]), 
            ...(jira as any[]), 
            ...(db as any[])
        ];
        const unique = repositoryService.uniqueRepositories(merged);
        
        res.status(200).json(unique);
    } catch (error) {
        console.error(`Get Repositories Error: ${error}`);
        res.status(500).json({ error: 'Failed to fetch repositories' });
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

        const result = await repositoryService.createRepo(user._id.toString(), name);
        if (typeof result === 'string') {
            res.status(400).json({ error: result });
            return;
        }
        res.status(201).json({ insertedId: result }); // 201 Created
    } catch (error) {
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

        await repositoryService.updateOwnerInRepo(repo_id, newOwner._id.toString(), user._id.toString());
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

        const result = await repositoryService.deleteRepository(repo_id, user._id.toString());
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}