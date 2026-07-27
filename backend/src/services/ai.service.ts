import { EventEmitter } from 'node:events';
import { JobQueue } from '../helpers/jobQueue.js';
import * as repositoryService from './repository.service.js';
import * as storyService from './story.service.js';
import { decrypt } from '../helpers/cryptoHelper.js';
import { logger } from '../logging.js';

let parseTextToStory: ((opts: any) => Promise<any>) | null = null;
let _parserChecked = false;

async function loadParser(): Promise<boolean> {
	if (_parserChecked) return parseTextToStory !== null;
	_parserChecked = true;
	try {
		const parserModule = '@seed-test/ai-parser';
		const mod = await import(/* webpackIgnore: true */ parserModule);
		parseTextToStory = mod.parseTextToStory;
		logger.info('AI Parser (@seed-test/ai-parser) loaded successfully.');
		return true;
	} catch {
		logger.info('AI Parser (@seed-test/ai-parser) not available. AI features disabled.');
		return false;
	}
}

export async function isAiParserAvailable(): Promise<boolean> {
	return loadParser();
}

export function _resetParserStateForTesting(): void {
	_parserChecked = false;
	parseTextToStory = null;
}

// Create a single queue and emitter for the AI service
export const aiJobQueue = new JobQueue();
export const aiJobEmitter = new EventEmitter();

/**
 * Orchestrates the AI scenario generation process for a specific story.
 * Fetches story, decrypts API key, calls parser, and saves result as a suggestion.
 * This function is intended to be called by the JobQueue.
 * @param storyId The ID of the story to process.
 * @param aiConfig The AI configuration (will be modified with decrypted keys).
 * @param repoId The ID of the repository for fetching encrypted keys.
 */
async function generateAiScenariosForStory(storyId: string, aiConfig: any, repoId: string): Promise<void> {
	try {
		await loadParser();
		if (!parseTextToStory) 
			throw new Error('AI Parser is not installed. Install @seed-test/ai-parser to use AI features.');
        

		const story = await storyService.getOneStory(storyId);
		if (!story) 
			throw new Error('Story not found');
        

		// Use story body as input
		const inputText = `${story.body || ''}`.trim();
		if (inputText.length === 0) 
			throw new Error('No input from story description found');
        

		// Decrypt API keys if cloud provider is used
		if (aiConfig.textPreparation?.name === 'cloud' || aiConfig.jsonConversion?.name === 'cloud') {
			const project = await repositoryService.getOneRepositoryById(repoId);
			if (!project?.aiConfig) 
				throw new Error('Cloud provider is configured, but no AI config was found for this project.');
            
            
			const encryptedTextApiKey = project.aiConfig.textPreparation?.apiKey;
			const encryptedJsonApiKey = project.aiConfig.jsonConversion?.apiKey;
            
			// Decrypt text key
			if (aiConfig.textPreparation?.name === 'cloud') {
				if (!encryptedTextApiKey) throw new Error('Text preparation provider is cloud, but no API key was found.');
				const decryptedApiKey = decrypt(encryptedTextApiKey);
				if (!decryptedApiKey) throw new Error('Text API key decryption failed.');
				aiConfig.textPreparation.apiKey = decryptedApiKey;
			}
            
			// Decrypt json key
			if (aiConfig.jsonConversion?.name === 'cloud') {
				if (!encryptedJsonApiKey) throw new Error('JSON conversion provider is cloud, but no API key was found.');
				const decryptedApiKey = decrypt(encryptedJsonApiKey);
				if (!decryptedApiKey) throw new Error('JSON API key decryption failed.');
				aiConfig.jsonConversion.apiKey = decryptedApiKey;
			}
		}

		logger.info(`Starting AI parser for Story ${story.title} with ID: ${storyId}`);
        
		// Call the AI parser
		const parsedStory = await parseTextToStory({
			inputText: inputText,
			config: aiConfig // Pass the full, potentially decrypted config
		});

		if (!parsedStory || !parsedStory.scenarios || parsedStory.scenarios.length === 0) 
			throw new Error('AI-Parser did not generate any valid scenarios.');
        

		logger.info(`AI results for story ${storyId} are ready. Saving as suggestion.`);
        
		// Save the AI-generated result as a suggestion on the story object
		story.aiSuggestion = {
			scenarios: parsedStory.scenarios,
			background: parsedStory.background,
			metadata: {
				generationTimestamp: new Date(),
				modelsUsed: {
					textModel: aiConfig.textPreparation?.modelName,
					jsonModel: aiConfig.jsonConversion?.modelName
				}
			}
		};
        
		// Update the story in the database
		await storyService.updateStory(story);

		// Notify listeners (SSE client) that the job is done
		aiJobEmitter.emit(`job-done-${storyId}`, { 
			status: 'suggestion-ready', 
			storyId: storyId 
		});

	} catch (error: any) {
		logger.error(`Error in generateAiScenariosForStory for storyId ${storyId}: ${error}`);
		// Notify listeners (SSE client) about the error
		aiJobEmitter.emit(`job-done-${storyId}`, { status: 'error', error: error.message });
	}
}

/**
 * Adds an AI scenario generation task to the job queue.
 * @param storyId The ID of the story.
 * @param aiConfig The AI configuration from the request.
 * @param repoId The ID of the repository.
 */
export function queueAiScenarioGeneration(storyId: string, aiConfig: any, repoId: string): void {
	const task = () => generateAiScenariosForStory(storyId, aiConfig, repoId);
	aiJobQueue.add(task);
	logger.info(`AI Job for story ${storyId} has been added to the queue.`);
}