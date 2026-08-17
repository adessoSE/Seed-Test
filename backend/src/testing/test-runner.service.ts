import fs from 'node:fs';
import pfs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../logging.js';
import { type Story } from '@seed-test/shared/models/Story.js';
import { type Scenario } from '@seed-test/shared/models/Scenario.js';
import { type Repository } from '@seed-test/shared/models/Repository.js';
import { type User } from '@seed-test/shared/models/User.js';
import * as repositoryService from '../services/repository.service.js';
import * as featureFileService from '../services/feature-file.service.js';
import { type IConfiguration, type ISupportCodeCoordinatesOrLibrary } from '@cucumber/cucumber/api';

// --- Types and Interfaces ---

type TestMode = 'scenario' | 'feature' | 'group';

interface TestParameters {
	browser: string;
	waitTime: number;
	daisyAutoLogout: boolean;
	emulator?: string;
	windowSize?: { height: number; width: number; };
	oneDriver?: boolean;
}

interface CucumberWorldParameters {
	scenarios: TestParameters[];
	reportPath: string;
	featurePath: string;
	mode: TestMode;
	scenarioId?: string;
	// JSON-serializable index for Cucumber's IConfiguration.worldParameters
	[key: string]: unknown;
}

/** Per-run execution settings extracted from the request body. */
interface RequestSettings {
	browser?: string;
	emulator?: string;
	width?: number;
	height?: number;
	stepWaitTime?: number;
}

export interface ExecuteTestRequest {
	body: {
		repositoryId?: string;
		repoId?: string;
		testRunner?: 'seleniumWebdriver' | 'playwright';
		name?: string;
		browser?: string;
		emulator?: string;
		width?: number;
		height?: number;
		stepWaitTime?: number;
	};
	user?: User;
	params: {
		scenarioId?: string;
		issueID?: string;
		storySource?: string;
	};
}

/** Shape of the object returned by executeTest(). */
export interface TestExecutionResult {
	success: boolean;
	reportTime: number;
	story: Story;
	scenarioId?: string | undefined;
	reportName: string;
}


// --- Cached Support Code for Cucumber ---
// This is crucial to maintain the WebDriver/Playwright session across scenarios in a single run.
const cachedSupportCode: {
	seleniumWebdriver: ISupportCodeCoordinatesOrLibrary | null;
	playwright: ISupportCodeCoordinatesOrLibrary | null;
} = {
	seleniumWebdriver: null,
	playwright: null
};


// --- Main Test Execution Function ---

/**
 * Configures and executes a Cucumber test run for a given story and mode.
 * @param req - The Express request object, containing parameters and user data.
 * @param mode - The execution mode ('scenario', 'feature', or 'group').
 * @param story - The story object to be tested.
 * @returns An object containing the results and metadata of the test run.
 */
export async function executeTest(req: ExecuteTestRequest, mode: TestMode, story: Story) {
	const repoId = req.body.repositoryId ?? req.body.repoId;
	if (!repoId) 
		throw new Error('Repository ID is missing from the request body.');
    

	const testRunner = req.body.testRunner ?? 'seleniumWebdriver';
	const testRunnerPathName = testRunner === 'seleniumWebdriver' ? 'selenium-webdriver' : 'playwright';
    
	const globalSettings = await repositoryService.getRepoSettingsById(repoId);
    
	let parameters: { scenarios: TestParameters[] };

	// Extract per-run settings from the request body (browser, emulator, window size, wait time)
	const requestSettings: RequestSettings = {
		browser: req.body.browser ?? undefined,
		emulator: req.body.emulator ?? undefined,
		width: req.body.width ? Number(req.body.width) : undefined,
		height: req.body.height ? Number(req.body.height) : undefined,
		stepWaitTime: req.body.stepWaitTime ?? undefined
	};

	if (mode === 'scenario') {
		// Scenario mode: request settings override DB values (user explicitly chose for this run)
		const scenario = story.scenarios.find(elem => elem.scenario_id === parseInt(req.params.scenarioId!, 10));
		if (!scenario) throw new Error(`Scenario with ID ${req.params.scenarioId} not found in story.`);

		const examples = scenario.stepDefinitions.example ?? scenario.multipleScenarios;
		const scenarioCount = Math.max(examples?.length ?? 0, 1);
		const additionalParams = getSettings(scenario, globalSettings, requestSettings);
		parameters = { scenarios: Array(scenarioCount).fill(additionalParams) as TestParameters[] };

	} else {
	// mode is 'feature' or 'group' (scenario case handled above)
		// Feature/group mode: each scenario uses its own saved DB settings, no request overrides
		const prep = scenarioPrep(story.scenarios, story.oneDriver, globalSettings);
		parameters = prep.parameters;
	}

	const reportTime = Date.now();
	const featurePath = `./features/${featureFileService.cleanFileName(story.title + story._id)}.feature`;
	// Include story._id to avoid report file collisions when stories run in parallel
	const reportName = req.user?.github
		? `${req.user.github.login}_${story._id}_${reportTime}`
		: `reporting_${story._id}_${reportTime}`;

	// Ensure the .feature file exists before running the test
	try {
		await pfs.access(featurePath, fs.constants.F_OK);
	} catch (_err) {
		await featureFileService.updateFeatureFile(story._id!.toString());
	}

	const worldParameters: CucumberWorldParameters = {
		scenarios: parameters.scenarios,
		reportPath: `features/${reportName}.json`,
		featurePath,
		mode,
		scenarioId: req.params.scenarioId
	};

	const userConfig = {
		paths: [path.normalize(featurePath)],
		require: [path.resolve(process.cwd(), `dist/testing/test-runners/${testRunnerPathName}/*.js`)],
		format: [
			mode === 'group'
				? `json:features/${req.body.name}/${reportName}.json`
				: `json:features/${reportName}.json`
		],
		worldParameters: worldParameters as unknown as Record<string, unknown>,
		tags: mode === 'scenario' ? `@${req.params.issueID}_${req.params.scenarioId}` : undefined
	};
    
	try {
		const cucumberAPI = await import('@cucumber/cucumber/api');
		const { loadConfiguration, runCucumber, loadSupport } = cucumberAPI;

		const { runConfiguration } = await loadConfiguration({ provided: userConfig as unknown as Partial<IConfiguration> });

		cachedSupportCode[testRunner] ??= await loadSupport(runConfiguration);
        

		const { success } = await runCucumber({
			...runConfiguration,
			support: cachedSupportCode[testRunner]
		});

		return { success, reportTime, story, scenarioId: req.params.scenarioId, reportName };

	} catch (error: unknown) {
		logger.error(`Test execution failed: ${error instanceof Error ? error.message : String(error)}`);
		return { success: false, reportTime, story, scenarioId: req.params.scenarioId, reportName };
	}
}


// --- Helper Functions ---

/**
 * Merges scenario settings from DB, global settings, and optional request overrides.
 * Priority: global settings (when activated) > request overrides > DB scenario values > defaults.
 * Request overrides are only passed for scenario mode — feature/group mode calls this without them,
 * so each scenario uses its own saved DB values.
 */
function getSettings(scenario: Scenario, globalSettings: Repository['settings'] | null, requestOverrides?: RequestSettings): TestParameters {
	// daisyAutoLogout is a dynamic DB property not present on the Scenario model
	const daisyAutoLogout = (scenario as unknown as Record<string, unknown>).daisyAutoLogout === true;
	const finalSettings: TestParameters = {
		browser: scenario.browser ?? 'chromium',
		waitTime: scenario.stepWaitTime ?? 0,
		daisyAutoLogout
	};

	if (globalSettings?.activated) {
		// Global settings override everything when activated
		finalSettings.browser = globalSettings.browser ?? finalSettings.browser;
		finalSettings.waitTime = globalSettings.stepWaitTime ?? finalSettings.waitTime;
		if (globalSettings.emulator) 
			finalSettings.emulator = globalSettings.emulator;
		else if (globalSettings.width && globalSettings.height) 
			finalSettings.windowSize = { height: Number(globalSettings.height), width: Number(globalSettings.width) };
        
	} else {
		// Use request overrides if provided (scenario mode), fall back to DB scenario values
		const browser = requestOverrides?.browser ?? scenario.browser;
		if (browser) finalSettings.browser = browser;

		finalSettings.waitTime = requestOverrides?.stepWaitTime ?? scenario.stepWaitTime ?? 0;

		const emulator = requestOverrides?.emulator ?? scenario.emulator;
		const width = requestOverrides?.width ?? scenario.width;
		const height = requestOverrides?.height ?? scenario.height;

		if (emulator) 
			finalSettings.emulator = emulator;
		else if (width && height) 
			finalSettings.windowSize = { height: Number(height), width: Number(width) };
        
	}
	return finalSettings;
}

function scenarioPrep(scenarios: Scenario[], oneDriver: boolean | undefined, globalSettings: Repository['settings'] | null): { parameters: { scenarios: TestParameters[] } } {
	const parameters: { scenarios: TestParameters[] } = { scenarios: [] };

	scenarios.forEach((scenario) => {
		// Each scenario uses its own saved DB settings — no request overrides in feature/group mode
		const additionalParams = getSettings(scenario, globalSettings);
		const examples = scenario.stepDefinitions.example ?? scenario.multipleScenarios;
		const count = Math.max(examples?.length ?? 0, 1);

		for (let i = 0; i < count; i++) 
			parameters.scenarios.push({
				oneDriver: oneDriver,
				...additionalParams
			});
        
	});

	return { parameters };
}