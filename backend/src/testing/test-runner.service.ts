import fs from 'fs';
import pfs from 'fs/promises';
import path from 'path';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import { User } from '@shared/models/User';
import * as repositoryService from '../services/repository.service';
import * as featureFileService from '../services/feature-file.service';
import { IConfiguration } from '@cucumber/cucumber/api';

// --- Types and Interfaces ---

type TestMode = 'scenario' | 'feature' | 'group';

interface TestParameters {
    browser: string;
    waitTime: number;
    daisyAutoLogout: boolean;
    emulator?: string;
    windowSize?: { height: number; width: number; };
    [key: string]: any; // Add index signature to make it compatible
}

interface CucumberWorldParameters {
    scenarios: TestParameters[];
    reportPath: string;
    featurePath: string;
    mode: TestMode;
    scenarioId?: string;
    [key: string]: any; // Add index signature to make it compatible
}

interface ExecuteTestRequest {
    body: {
        repositoryId?: string;
        repoId?: string; // Legacy support
        testRunner?: 'seleniumWebdriver' | 'playwright';
        name?: string; // For group directory
    };
    user?: User;
    params: {
        scenarioId?: string;
        issueID?: string;
        storySource?: string;
    };
}


// --- Cached Support Code for Cucumber ---
// This is crucial to maintain the WebDriver/Playwright session across scenarios in a single run.
const cachedSupportCode: {
    seleniumWebdriver: any | null;
    playwright: any | null;
} = {
    seleniumWebdriver: null,
    playwright: null,
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
    const repoId = req.body.repositoryId || req.body.repoId;
    if (!repoId) {
        throw new Error('Repository ID is missing from the request body.');
    }

    const testRunner = req.body.testRunner || 'seleniumWebdriver';
    const testRunnerPathName = testRunner === "seleniumWebdriver" ? "selenium-webdriver" : "playwright";
    
    const globalSettings = await repositoryService.getRepoSettingsById(repoId);
    
    let parameters: { scenarios: TestParameters[] } = { scenarios: [] };

    if (mode === 'scenario') {
        const scenario = story.scenarios.find(elem => elem.scenario_id === parseInt(req.params.scenarioId!, 10));
        if (!scenario) throw new Error(`Scenario with ID ${req.params.scenarioId} not found in story.`);
        
        const examples = scenario.stepDefinitions.example || scenario.multipleScenarios;
        const scenarioCount = Math.max(examples?.length || 0, 1);
        const additionalParams = getSettings(scenario, globalSettings);
        parameters = { scenarios: Array(scenarioCount).fill(additionalParams) };

    } else if (mode === 'feature' || mode === 'group') {
        const prep = scenarioPrep(story.scenarios, (story as any).oneDriver, globalSettings);
        parameters = prep.parameters;
    }

    const reportTime = Date.now();
    const featurePath = `./features/${featureFileService.cleanFileName(story.title + story._id)}.feature`;
    const reportName = req.user?.github ? `${req.user.github.login}_${reportTime}` : `reporting_${reportTime}`;

    // Ensure the .feature file exists before running the test
    try {
        await pfs.access(featurePath, fs.constants.F_OK);
    } catch (err) {
        await featureFileService.updateFeatureFile(story._id.toString());
    }

    const worldParameters: CucumberWorldParameters = {
        scenarios: parameters.scenarios,
        reportPath: `features/${reportName}.json`,
        featurePath,
        mode,
        scenarioId: req.params.scenarioId,
    };

    const userConfig: Partial<IConfiguration> = {
        paths: [path.normalize(featurePath)],
        require: [path.resolve(process.cwd(), `src/testing/test-runners/${testRunnerPathName}/*.js`)],
        format: [
            mode === 'group'
                ? `json:features/${req.body.name}/${reportName}.json`
                : `json:features/${reportName}.json`,
        ],
        worldParameters,
        tags: mode === 'scenario' ? `@${req.params.issueID}_${req.params.scenarioId}` : undefined,
    };
    
    try {
        const cucumberAPI = await import('@cucumber/cucumber/api');
        const { loadConfiguration, runCucumber, loadSupport } = cucumberAPI;

        const { runConfiguration } = await loadConfiguration({ provided: userConfig });

        // Load or reuse the support code library for the specified test runner
        if (!cachedSupportCode[testRunner]) {
            console.log(`Loading support code for ${testRunner} for the first time...`);
            cachedSupportCode[testRunner] = await loadSupport(runConfiguration);
        }

        console.log(`Executing test with ${testRunner} support code.`);

        const { success } = await runCucumber({ 
            ...runConfiguration, 
            support: cachedSupportCode[testRunner] 
        });

        return { success, reportTime, story, scenarioId: req.params.scenarioId, reportName };

    } catch (error) {
        console.error('Test execution failed: ', error);
        return { success: false, reportTime, story, scenarioId: req.params.scenarioId, reportName };
    }
}


// --- Helper Functions ---

function getSettings(scenario: Scenario, globalSettings: any): TestParameters {
    const finalSettings: TestParameters = {
        browser: scenario.browser || 'chromium',
        waitTime: scenario.stepWaitTime || 0,
        daisyAutoLogout: (scenario as any).daisyAutoLogout || false
    };

    if (globalSettings?.activated) {
        finalSettings.browser = globalSettings.browser || finalSettings.browser;
        finalSettings.waitTime = globalSettings.stepWaitTime || finalSettings.waitTime;
        if (globalSettings.emulator) {
            finalSettings.emulator = globalSettings.emulator;
        } else if (globalSettings.width && globalSettings.height) {
            finalSettings.windowSize = { height: Number(globalSettings.height), width: Number(globalSettings.width) };
        }
    } else {
        if (scenario.emulator) {
            finalSettings.emulator = scenario.emulator;
        } else if (scenario.width && scenario.height) {
            finalSettings.windowSize = { height: Number(scenario.height), width: Number(scenario.width) };
        }
    }
    return finalSettings;
}

function scenarioPrep(scenarios: Scenario[], oneDriver: boolean | undefined, globalSettings: any): { parameters: { scenarios: any[] } } {
    const parameters: { scenarios: any[] } = { scenarios: [] };

    scenarios.forEach((scenario) => {
        const additionalParams = getSettings(scenario, globalSettings);
        const examples = scenario.stepDefinitions.example || scenario.multipleScenarios;
        const count = Math.max(examples?.length || 0, 1);

        for (let i = 0; i < count; i++) {
            parameters.scenarios.push({
                oneDriver: oneDriver,
                ...additionalParams
            });
        }
    });

    return { parameters };
}