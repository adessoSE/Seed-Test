import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import * as repositoryService from '../services/repository.service'
import * as storyService from '../services/story.service';
import * as featureFileService from '../services/feature-file.service';
import * as importExportService from '../services/import-export.service';
import * as specialCommandParser from '../helpers/specialCommandParser';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import * as aiService from '../services/ai.service';
import * as xrayService from '../services/xray.service'
import * as externalSyncService from '../services/externalSync.service'
import { AiConfig } from '@shared/models/RepositoryContainer';
import { User } from '@shared/models/User';

// --- Story CRUD ---

/**
 * Fetches stories based on the source (GitHub, Jira, DB) specified in query params.
 * This function now delegates the fetching and syncing logic to externalSyncService.
 */
export async function getStories(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = req.user as User;
    const { source, id } = req.query as { source: string, id: string };

    try {
        let stories: Story[] = [];

        if (source === 'db') {
            // DB source is a simple fetch, no external sync needed
            if (!id || !ObjectId.isValid(id)) {
                 res.status(400).json({ error: 'Invalid repository ID format for DB source' });
                 return;
            }
            stories = await storyService.getAllStoriesOfRepo(id);
            
            // If we need to match order (like the old logic), we might need the repo doc
            const repo = await repositoryService.getOneRepositoryById(id);
            if (repo) {
                 const storyMap = new Map(stories.map(s => [s._id.toString(), s]));
                 stories = await externalSyncService.matchStoryOrder(stories.map(s => s._id), storyMap, repo);
            }

        } else if (source === 'github' || source === 'jira') {
            // GitHub and Jira sources require external fetching and syncing
            stories = await externalSyncService.getStoriesFromSource(user, req.query as { [key: string]: string });
        } else {
            res.status(400).json({ error: 'Invalid or missing source parameter' });
            return;
        }

        res.status(200).json(stories);

    } catch (error) {
        next(error); // Pass errors to central handler
    }
}

export async function getStoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storyId = req.params._id;
        if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid story ID format' }); return;
        }
        const story = await storyService.getOneStory(storyId);
        if (!story) {
             res.status(404).json({ error: 'Story not found' }); return;
        }
        res.status(200).json(story);
    } catch (error) {
        next(error);
    }
}

export async function getStoryByIssueKey(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const issueKey = req.params.issue_key;
        // Basic validation, adjust if Jira keys have stricter rules
        if (!issueKey || typeof issueKey !== 'string') {
             res.status(400).json({ error: 'Invalid issue key format' }); return;
        }
        const story = await storyService.getOneStoryByIssueKey(issueKey);
         if (!story) {
             res.status(404).json({ error: 'Story not found for this issue key' }); return;
        }
        res.status(200).json(story);
    } catch (error) {
        next(error);
    }
}


export async function createStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { title, description, _id: repoId } = req.body; // repoId comes as _id in the body
        if (!title || !repoId || !ObjectId.isValid(repoId)) {
             res.status(400).json({ error: 'Missing title or invalid repository ID' }); return;
        }
        const dbId = await storyService.createStory(title, description || '', repoId);
        // Assuming insertStoryIdIntoRepo is now part of repositoryService or called within createStory logic
        // await repositoryService.insertStoryIdIntoRepo(dbId.toString(), repoId);
        await featureFileService.updateFeatureFile(dbId.toString());
        res.status(200).json({ _id: dbId }); // Return the new story ID
    } catch (error) {
        next(error);
    }
}

export async function updateStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storyId = req.params._id;
         if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid story ID format' }); return;
        }
        const storyData: Story = req.body;
        // Ensure the ID in the body matches the URL parameter for consistency
        storyData._id = new ObjectId(storyId);

        const result = await storyService.updateStory(storyData);
        await featureFileService.updateFeatureFile(storyId);
        res.status(200).json(result); // result might be the updated doc or update status
    } catch (error) {
        next(error);
    }
}

export async function deleteStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { repo_id, _id: storyId } = req.params;
         if (!ObjectId.isValid(repo_id) || !ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid repository or story ID format' }); return;
        }
        const story = await storyService.getOneStory(storyId); // Fetch story to get title for file deletion
        if (!story) {
             res.status(404).json({ error: 'Story not found' }); return;
        }
        await storyService.deleteStory(repo_id, storyId);
        await featureFileService.deleteFeatureFile(story.title, story._id);
        res.status(200).json({ message: 'success' });
    } catch (error) {
        next(error);
    }
}

// --- Scenario CRUD ---

export async function getScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const { story_id, _id: scenarioNumId } = req.params;
        const scenarioId = parseInt(scenarioNumId, 10);
         if (!ObjectId.isValid(story_id) || isNaN(scenarioId)) {
             res.status(400).json({ error: 'Invalid story ID or scenario ID format' }); return;
        }
        const scenario = await storyService.getOneScenario(story_id, scenarioId);
         if (!scenario) {
             res.status(404).json({ error: 'Scenario not found' }); return;
        }
        res.status(200).json(scenario);
    } catch (error) {
        next(error);
    }
}


export async function createScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const storyId = req.params.story_id;
         if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid story ID format' }); return;
        }
        const { name } = req.body; // Assuming name comes in body

        const scenario = await storyService.createScenario(storyId, name || 'New Scenario');
        await featureFileService.updateFeatureFile(storyId);
        res.status(200).json(scenario);
    } catch (error) {
        next(error);
    }
}

export async function updateScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { story_id, _id: scenarioNumId } = req.params;
        const scenarioId = parseInt(scenarioNumId, 10);
         if (!ObjectId.isValid(story_id) || isNaN(scenarioId)) {
             res.status(400).json({ error: 'Invalid story ID or scenario ID format' }); return;
        }
        const scenarioData: Scenario = req.body;
        // Ensure scenario_id matches
        scenarioData.scenario_id = scenarioId;

        await storyService.updateScenario(story_id, scenarioData);
        await featureFileService.updateFeatureFile(story_id);
        res.status(200).json(scenarioData); // Return submitted data or fetch updated if needed
    } catch (error) {
        next(error);
    }
}

export async function deleteScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
    let dbError: Error | null = null;
    let xrayError: Error | null = null;

    const { story_id, _id: scenarioNumId } = req.params;
    const scenarioId = parseInt(scenarioNumId, 10);

    if (!ObjectId.isValid(story_id) || isNaN(scenarioId)) {
        res.status(400).json({ error: 'Invalid story ID or scenario ID format' });
        return;
    }

    try {
        // Step 1: Delete from Seed-Test DB
        await storyService.deleteScenario(story_id, scenarioId);
        await featureFileService.updateFeatureFile(story_id);
    } catch (error: any) {
        console.error('Database error during scenario deletion:', error);
        dbError = error;
    }

    // Step 2: Delete from XRay if enabled
    const xrayEnabled = req.headers['x-xray-enabled'] === 'true';
    const user = req.user as User;

    if (xrayEnabled && user?.jira) {
        try {
            const testKey = req.headers['x-test-key'] as string;
            // Call the new XRay service
            await xrayService.deleteXrayStep(user, testKey, scenarioId);
        } catch (error: any) {
            console.error('Error while deleting XRay step:', error);
            xrayError = error;
        }
    }

    // Step 3: Respond based on results
    if (!dbError && !xrayError) {
        res.status(200).json({ message: 'Scenario deleted successfully.' });
    } else {
        let errorMessage = 'Error during deletion: ';
        if (dbError) errorMessage += `Database error: ${dbError.message}. `;
        if (xrayError) errorMessage += `XRay error: ${xrayError.message}.`;
        res.status(500).json({ error: errorMessage.trim() });
    }
}

export async function updateScenarioList(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const storyId = req.params.story_id;
         if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid story ID format' }); return;
        }
        const scenarioList: Scenario[] = req.body;
        await storyService.updateScenarioList(storyId, scenarioList);
        await featureFileService.updateFeatureFile(storyId);
        res.status(200).json({ message: 'Scenario list updated' }); // Or return the list
    } catch (error) {
        next(error);
    }
}


// --- File Download/Upload & Export/Import ---

export async function downloadSingleFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storyId = req.params._id;
         if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid story ID format' }); return;
        }
        const fileContent = await featureFileService.exportSingleFeatureFile(storyId);
        // Fetch story to get title for filename
        const story = await storyService.getOneStory(storyId);
        const filename = featureFileService.cleanFileName(story?.title + storyId) + ".feature";
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'text/plain');
        res.charset = 'UTF-8';
        res.write(fileContent);
        res.end();
    } catch (error) {
        next(error);
    }
}

export async function downloadProjectFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const repoId = req.params.repo_id;
         if (!ObjectId.isValid(repoId)) {
             res.status(400).json({ error: 'Invalid repository ID format' }); return;
        }
        const version = req.query.version_id as string | undefined;
        const zipBuffer = await featureFileService.exportProjectFeatureFiles(repoId, version);
        const repo = await repositoryService.getOneRepositoryById(repoId); // Fetch repo for name
        const filename = featureFileService.cleanFileName(repo?.repoName || `project_${repoId}`) + ".zip";

        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/zip');
        res.send(zipBuffer);
    } catch (error) {
        next(error);
    }
}

export async function exportProjectArchive(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const repoId = req.params.repo_id;
         if (!ObjectId.isValid(repoId)) {
             res.status(400).json({ error: 'Invalid repository ID format' }); return;
        }
        const zipBuffer = await importExportService.exportProject(repoId);
        const repo = await repositoryService.getOneRepositoryById(repoId);
        const filename = featureFileService.cleanFileName(repo?.repoName || `export_${repoId}`) + ".zip";

        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/zip');
        res.send(zipBuffer);
    } catch (error) {
        next(error);
    }
}

export async function importProjectArchive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded.' }); return;
        }
        const repoId = req.query.repo_id as string | undefined;
        const projectName = req.query.projectName as string | undefined;
        const importMode = req.query.importMode === 'true'; // Convert query string to boolean

        // Differentiate between POST (new project) and PUT (existing project)
        if (req.method === 'POST' && !projectName) {
             res.status(400).json({ error: 'Project name is required for new imports.' }); return;
        }
         if (req.method === 'PUT' && (!repoId || !ObjectId.isValid(repoId))) {
             res.status(400).json({ error: 'Valid repository ID is required for updating imports.' }); return;
        }

        const result = await importExportService.importProject(req.file, repoId, projectName, importMode);
        res.status(200).json(result);

    } catch (error) {
        next(error);
    }
}

// --- Other Story Actions ---

export async function setOneDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const storyId = req.params.storyID;
         if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid story ID format' }); return;
        }
        // Assuming the service expects the current value to toggle it
        const result = await storyService.updateOneDriver(storyId, req.body.oneDriver);
        res.status(200).json(result); // Return result from service
    } catch (error) {
        next(error);
    }
}

export function resolveSpecialCommands(req: Request, res: Response, next: NextFunction): void {
     try {
        const command = req.body.command as string;
        if (typeof command !== 'string') {
             res.status(400).json({ error: 'Invalid command input' }); return;
        }
        const result = specialCommandParser.applySpecialCommands(command);
        res.status(200).json({ resolved: result });
    } catch (error) {
        // Specific error handling for parsing errors might be useful here
         res.status(400).json({ error: (error as Error).message || 'Failed to resolve command' });
    }
}

// --- AI Scenario Generation ---

export async function generateAiScenarios(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
        const storyId = req.params.story_id;
         if (!ObjectId.isValid(storyId)) {
             res.status(400).json({ error: 'Invalid story ID format' }); return;
        }
        
        // The body now contains the structured AiConfig
        const aiConfig: AiConfig = req.body.aiConfig; 
        const repoId = req.headers.repoid as string;

        if (!aiConfig) {
             res.status(400).json({ error: 'AI configuration is missing.' }); return;
        }
         if (!repoId || !ObjectId.isValid(repoId)) {
             res.status(400).json({ error: 'Valid repository ID (repoid) is missing in headers.' }); return;
        }

        // Pass the structured aiConfig directly to the queue
        aiService.queueAiScenarioGeneration(storyId, aiConfig, repoId);

        res.status(202).json({ message: 'AI generation task accepted and queued.' });
    } catch (error) {
        next(error); // Pass unexpected errors
    }
}

export function getAiGenerationStatus(req: Request, res: Response, next: NextFunction): void {
     // This function remains unchanged as it only uses the emitter
     const storyId = req.params.story_id;
     if (!ObjectId.isValid(storyId)) {
         res.status(400).json({ error: 'Invalid story ID format' }); return;
     }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log(`SSE Client connected for AI status updates for story ${storyId}`);

    const listener = (result: any) => {
        res.write(`data: ${JSON.stringify(result)}\n\n`);
    };

    aiService.aiJobEmitter.on(`job-done-${storyId}`, listener);

    req.on('close', () => {
        aiService.aiJobEmitter.removeListener(`job-done-${storyId}`, listener);
        console.log(`SSE Client disconnected for AI status updates for story ${storyId}`);
        res.end();
    });

    // Send an initial connected message?
    // res.write(`data: ${JSON.stringify({ status: 'connected', storyId })}\n\n`);
}