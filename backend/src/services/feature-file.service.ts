import pfs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../logging.js';
import AdmZip from 'adm-zip';
import { type Story } from '@seed-test/shared/models/Story.js';
import { type Background } from '@seed-test/shared/models/Background.js';
import { type Scenario } from '@seed-test/shared/models/Scenario.js';
import { type StepType } from '@seed-test/shared/models/StepType.js';
import * as storyService from './story.service.js';
import * as blockService from './block.service.js';
import { AppError } from '../helpers/AppError.js';


// --- Feature File Generation ---

// adds content of each values to output
function getValues(values: string[]): string {
	return values.slice(1).map(v => `'${v}'`).join('');
}

// Content in Background for FeatureFile
function getBackgroundSteps(steps: StepType[]): string {
	let data = '';
	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		if (step.deactivated) continue;
		data += i === 0 ? 'When ' : 'And ';
		data += `${step.pre} '${step.values[0]}' ${step.mid}${getValues(step.values)} \n`;
        
	}
	return data + '\n';
}

// Building Background-Content
function getBackgroundContent(background: Background): string {
	let data = 'Background: \n\n';
	data += getBackgroundSteps(background.stepDefinitions.when);
	return data;
}

// First letter in string to upper case
function jsUcfirst(string: string): string {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

// Building feature file step-content
function getSteps(steps: StepType[], stepType: string): string {
	let data = '';
	for (const step of steps) {
		if (step.deactivated) continue;
		data += `${jsUcfirst(stepType)} `;
		if (step.values[0] !== 'User') {
			data += `${step.pre} '${step.values[0]}' ${step.mid || ''}${step.values[1] ? `'${step.values[1]}'` : ''}`;
			if (step.post) data += ` ${step.post}${step.values[2] ? `'${step.values[2]}'` : ''}`;
		} else
			data += `${step.pre} '${step.values[0]}'`;
		data += '\n';
	}
	return data;
}

// adds content of each values to output
function getExamples(steps: StepType[]): string {
	let data = '';
	for (const step of steps) {
		// jump if disabled or no valid values
		if (step.deactivated || step.values.every(it => it.trim() === '' || it === 'value')) continue;
		data += `\n | ${step.values.join(' | ')} | `;
	}
	// if no lines other than value line, return empty
	if (data.split('\n').length > 2) 
		return `Examples:${data}\n`;
    
	return ''; // explicit return as first line (title/name/key) is always written
}

// Building feature file scenario-name-content
function getScenarioContent(scenarios: Scenario[], storyID: string | undefined): string {
	let data = '';
	for (const scenario of scenarios) {
		data += `@${storyID}_${scenario.scenario_id}\n`;
		// if there are examples
		const examples = scenario.stepDefinitions.example ?? scenario.multipleScenarios;
		if (examples && examples.length > 0) 
			data += `Scenario Outline: ${scenario.name}\n\n`;
		else 
			data += `Scenario: ${scenario.name}\n\n`;
        

		// Get Stepdefinitions
		data += `${getSteps(scenario.stepDefinitions.given, 'given')}\n`;
		data += `${getSteps(scenario.stepDefinitions.when, 'when')}\n`;
		data += `${getSteps(scenario.stepDefinitions.then, 'then')}\n`;
		if (examples && examples.length > 0) data += `${getExamples(examples as StepType[])}\n\n`;
		if (scenario.comment) 
			data += `# Comment:\n#  ${scenario.comment.replace(/\n/g, '\n#  ')}\n\n`;
        
	}
	return data;
}

// Building feature file story-name-content (feature file title)
export function getFeatureContent(story: Story): string {
	const body = story.body ? story.body.replace(/#|(\/)/g, '') : '';
	let data = `Feature: ${story.title}\n\n${body}\n\n`;

	data += getBackgroundContent(story.background);
	data += getScenarioContent(story.scenarios, story._id);
	return data;
}

export function cleanFileName(filename: string): string {
	return filename.replace(/[^a-z0-9.]/gi, '_');
}

// Creates feature file
export async function writeFile(story: Story): Promise<void> {
	const filename = story.title + story._id;
	await pfs.writeFile(
		path.join(process.cwd(), 'features', `${cleanFileName(filename)}.feature`),
		getFeatureContent(story)
	);
}

// Updates feature file based on _id
export async function updateFeatureFile(storyId: string): Promise<void> {
	const story = await storyService.getOneStory(storyId);
	if (story) {
		story.scenarios = await replaceRefBlocks(story.scenarios);
		await writeFile(story);
	}
}

export async function deleteFeatureFile(storyTitle: string, storyId: string | undefined): Promise<void> {
	const filePath = path.join(process.cwd(), 'features', `${cleanFileName(storyTitle + storyId)}.feature`);
	try {
		await pfs.unlink(filePath);
		logger.info(`FeatureFile deleted! ${storyTitle}${storyId}`);
	} catch (e: unknown) {
		if ((e as Record<string, unknown>).code === 'ENOENT') 
			logger.warn(`Feature file not found: ${filePath}`);
		else 
			logger.error(`Error deleting feature file: ${e instanceof Error ? e.message : String(e)}`);
		
	}
}

export async function replaceRefBlocks(scenarios: Scenario[]): Promise<Scenario[]> {
	if (!scenarios.some(scen => scen.hasRefBlock)) return scenarios;

	const processedScenarios = await Promise.all(scenarios.map(async (scen) => {
		// Build step definitions from expanded block references
		const newStepDefinitions: Record<string, StepType[]> = {};
		for (const stepType of ['given', 'when', 'then'] as const) {
			const steps = scen.stepDefinitions[stepType as keyof typeof scen.stepDefinitions];
			if (!steps) continue;
            
			const expandedSteps = await Promise.all(steps.map(async (step: StepType) => {
				if (!step._blockReferenceId) return [step];
				const block = await blockService.getBlock(step._blockReferenceId);
				if (!block) return [step]; // Or handle error
				return [
					...block.stepDefinitions.given,
					...block.stepDefinitions.when,
					...block.stepDefinitions.then
				];
			}));
			newStepDefinitions[stepType] = expandedSteps.flat(1);
		}
		return { ...scen, stepDefinitions: newStepDefinitions } as unknown as Scenario;
	}));
	return processedScenarios;
}


// --- Feature File Export ---

export async function exportSingleFeatureFile(storyId: string): Promise<string> {
	const story = await storyService.getOneStory(storyId);
	if (!story) 
		throw AppError.notFound('Story not found');
    
	story.scenarios = await replaceRefBlocks(story.scenarios);
	// Ensure file is written before trying to read it
	await writeFile(story);
	const filePath = path.join(process.cwd(), 'features', `${cleanFileName(story.title + story._id)}.feature`);
	return pfs.readFile(filePath, 'utf8');
}

export async function exportProjectFeatureFiles(repoId: string, versionId?: string): Promise<Buffer> {
	const stories = await storyService.getAllStoriesOfRepo(repoId);
	const zip = new AdmZip();

	await Promise.all(stories.map(async (story) => {
		const content = await exportSingleFeatureFile(story._id!.toString());
		const postfix = versionId ? `-v${versionId}` : '';
		const filename = `${cleanFileName(story.title + story._id!.toString())}${postfix}.feature`;
		zip.addFile(filename, Buffer.from(content, 'utf8'));
	}));

	return zip.toBuffer();
}
