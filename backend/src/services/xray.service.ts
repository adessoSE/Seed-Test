import { type User } from '@seed-test/shared/models/User.js';
import { logger } from '../logging.js';
import { type Scenario } from '@seed-test/shared/models/Scenario.js';
import { type StepType } from '@seed-test/shared/models/StepType.js';
import * as externalAccountService from './externalAccount.service.js';
import * as stepTypeService from './step-type.service.js';
import { AppError } from '../helpers/AppError.js';
import { requireSafeExternalHost } from '../utils/validation.js';
import { type XrayIssue, type XrayStepFields, type XrayStepMatch, type XrayTestRun, type XrayTestRunSummary, type XrayTestStep } from '../types/xray.types.js';


// --- XRay Write Operations ---

/**
 * Deletes a specific test step from an XRay test issue.
 * @param user The authenticated user object containing Jira credentials.
 * @param testKey The issue key of the XRay test (e.g., "JIRA-123").
 * @param stepId The numeric ID of the scenario step to be deleted.
 */
export async function deleteXrayStep(user: User, testKey: string, stepId: number): Promise<void> {
	if (!user.jira) 
		throw AppError.unauthorized('User has no linked Jira account.');
    
	if (!testKey) 
		throw AppError.badRequest('XRay Test Key (issue key) is required.');
    

	try {
		// 1. Get credentials and build auth header
		const { AccountName, AuthMethod, Host, Password, Password_Nonce, Password_Tag } = user.jira;
		const clearPass = externalAccountService.jiraDecryptPassword(
			Password,
			Password_Nonce,
			Password_Tag
		);
		const authString = externalAccountService.buildAuthString(AccountName, clearPass, AuthMethod);
        
		// 2. Construct XRay API URL — validate host to guard against DB-level tampering
		requireSafeExternalHost(Host);
		const url = `https://${Host}/rest/raven/1.0/api/test/${testKey}/step/${stepId}/`;

		const options = {
			method: 'DELETE',
			headers: {
				'cache-control': 'no-cache',
				'Content-Type': 'application/json',
				Authorization: authString
			}
		};

		// 3. Send DELETE request to XRay
		logger.info(`Sending XRay DELETE request to: ${url}`);
		const response = await fetch(url, options);
        
		if (!response.ok) {
			const errorBody = await response.text();
			throw AppError.badGateway(`XRay API error! Status: ${response.status} ${response.statusText}. Body: ${errorBody}`);
		}

		logger.info(`Successfully deleted XRay step ${stepId} from test ${testKey}`);

	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Error in deleteXrayStep service: ${message}`);
		throw new Error(`Failed to delete XRay step: ${message}`, { cause: error });
	}
}

// --- XRay Read Operations (Migrated from helpers/xray.ts) ---

/**
 * Fetches all necessary data for a given test issue, including test runs and test steps.
 * @param issue The test issue object containing the key.
 * @param options The options object for making the fetch requests (e.g., headers).
 * @param host The hostname or base URL for the API requests.
 * @returns An object containing scenarioList and testStepDescription.
 */
export async function handleTestIssue(issue: XrayIssue, options: RequestInit, host: string): Promise<{ scenarioList: Partial<Scenario>[], testStepDescription: string }> {
	const stepTypes = (await stepTypeService.showSteptypes()).filter(def => def.type !== 'Add Variable');

	// Fetch all test runs for the given issue
	const testrunResponse = await fetch(`https://${host}/rest/raven/2.0/api/test/${issue.key}/testruns`, options);
	const testRuns = await testrunResponse.json() as XrayTestRunSummary[];

	// Fetch details for all test runs
	const testRunDetailsPromises = testRuns.map((testRun) =>
		fetch(`https://${host}/rest/raven/2.0/api/testrun/${testRun.id}`, options).then(response => response.json() as Promise<XrayTestRun>)
	);
	const resolvedTestRuns = await Promise.all(testRunDetailsPromises);

	// Fetch all test steps defined for the given issue
	const testStepsResponse = await fetch(`https://${host}/rest/raven/2.0/api/test/${issue.key}/steps`, options);
	const testSteps = await testStepsResponse.json() as { steps: XrayTestStep[] };

	const { scenarioList, testStepDescription } = await processTestSteps(testSteps.steps, resolvedTestRuns, issue.key, stepTypes);

	return { scenarioList, testStepDescription };
}

/**
 * Creates scenarios and description given xray test steps and resolved xray test runs.
 * @param steps An array of test steps for the given issue.
 * @param resolvedTestRuns An array of resolved test runs containing details of each run.
 * @param issueKey The key of the issue being processed.
 * @returns An object containing the scenarioList and testStepDescription.
 */
async function processTestSteps(steps: XrayTestStep[], resolvedTestRuns: XrayTestRun[], issueKey: string, stepTypes: StepType[]): Promise<{ scenarioList: Partial<Scenario>[], testStepDescription: string }> {
	const scenarioList: Partial<Scenario>[] = [];
	let testStepDescription = '\n\nTest-Steps:\n';

	// Runtime guard — testSteps.steps may be undefined in test mocks or edge-case responses
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!steps)
		return { scenarioList, testStepDescription: 'No steps found.' };

	for (const step of steps) {
		if (!step.fields) {
			logger.info(`Fields missing for step ${step.id}`);
			continue;
		}

		const { fields } = step;
		const identicalMatches = await checkIdenticalSteps(fields, stepTypes);
		const { givenSteps, whenSteps, thenSteps } = createScenarioSteps(identicalMatches);

		const stepInfo = [`\n----- Scenario ${step.index} -----\n`];
		stepInfo.push(fields.Given ? `(GIVEN): ${fields.Given.value}\n` : '(GIVEN): Not used\n');
		stepInfo.push(fields.Action?.value.raw ? `(WHEN): ${fields.Action.value.raw}\n` : '(WHEN): Not step used\n');
		stepInfo.push(fields['Expected Result']?.value.raw ? `(THEN): ${fields['Expected Result'].value.raw}\n` : '(THEN): No steps used\n');
		testStepDescription += stepInfo.join('');

		const matchingSteps: { testRunId: number; testRunStepId: number, testExecKey: string }[] = [];
        
		resolvedTestRuns.forEach((testRunDetails) => {
			if (!testRunDetails.steps) return;
            
			testRunDetails.steps.forEach((testRunStep) => {
				const stepGiven = fields.Given ? fields.Given.value : '';
				const stepAction = fields.Action ? fields.Action.value.raw : '';
				const stepExpected = fields['Expected Result'] ? fields['Expected Result'].value.raw : '';
				const testRunGiven = testRunStep.fields.Given ? extractRaw(testRunStep.fields.Given.value) : '';
				const testRunAction = testRunStep.fields.Action ? testRunStep.fields.Action.value.raw : '';
				const testRunExpected = testRunStep.fields['Expected Result'] ? testRunStep.fields['Expected Result'].value.raw : '';

				if (stepGiven === testRunGiven && stepAction === testRunAction && stepExpected === testRunExpected) 
					matchingSteps.push({
						testRunId: testRunDetails.id,
						testRunStepId: testRunStep.id,
						testExecKey: testRunDetails.testExecKey
					});
                
			});
		});

		const scenario: Partial<Scenario> = {
			scenario_id: step.id,
			name: `${step.id}`, // Converted to string
			stepDefinitions: {
				given: givenSteps,
				when: whenSteps,
				then: thenSteps,
				example: []
			},
			testRunSteps: matchingSteps,
			testKey: issueKey
		};

		scenarioList.push(scenario);
	}

	return { scenarioList, testStepDescription };
}

/**
 * Checks if the given xray step is identical to one of the step definitions.
 * @param step The xray step containing sections of given, actiona and expected result.
 * @returns An array of matching step definitions.
 */
// eslint-disable-next-line @typescript-eslint/require-await
async function checkIdenticalSteps(step: XrayStepFields, stepTypes: StepType[]): Promise<XrayStepMatch[]> {
	const matches: XrayStepMatch[] = [];
	let context: string;

	for (const section of ['Given', 'Action', 'Expected Result'] as const)
		if (step[section]?.value) {
			let texts: string[];
			if (section === 'Given') {
				texts = step[section].value.split('\n');
				context = 'given';
			} else if (section === 'Action') {
				texts = step[section].value.raw.split('\n');
				context = 'when';
			} else {
				texts = step[section].value.raw.split('\n');
				context = 'then';
			}
            
			for (const text of texts) 
				if (text.trim()) {
					const match = analyzeText(text.trim(), context, stepTypes);
					if (match) 
						matches.push(match);
                    
				}
            
		}
    
	return matches;
}

/**
 * Analyzes text to match with step definitions.
 * @param text The text to analyze.
 * @param context The context (given, when, then) of the step.
 * @returns The matching step definition or null if no match found.
 */
function analyzeText(text: string, context: string, stepTypes: StepType[]): XrayStepMatch | null {
	for (const stepType of stepTypes) 
		if (stepType.stepType === context) {
			// Create a pattern based on the pre, mid, and post values of the step definition
			// Store the strings after the pre, mid, and post values by (.*) in the pattern
			let pattern = `${String(escapeRegExp(stepType.pre))}(.*)${stepType.mid ? String(escapeRegExp(stepType.mid)) + '(.*)' : ''}`;
			if (stepType.post) 
				pattern += `${String(escapeRegExp(stepType.post))}(.*)`;

            
			const regex = new RegExp(pattern, 'i');
			const match = text.match(regex);
			if (match) {
				const values = match.slice(1).map(value => cleanValue(value.trim().replace(/\.$/, ''))).filter(v => v);
				if (stepType.type === 'Screenshot' && values.length === 0) 
					values.push('');
                
				return {
					type: stepType.type,
					values: values,
					pre: stepType.pre,
					mid: stepType.mid ? stepType.mid : '',
					post: stepType.post ?? undefined,
					context: context,
					origin: 'congruent'
				};
			}
		}
    
	return null;
}

/**
 * Replaces special characters in a string with escape characters.
 * @param str The string to escape.
 * @returns The escaped string.
 */
function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cleans value and extracts email or link.
 * @param value The value to clean.
 * @returns The cleaned value.
 */
function cleanValue(value: string): string {
	const linkPattern = /^\[http:\/\/[^\]]+\]$/;
	const emailPattern = /^\[([^\]]+@[^\]]+)\|mailto:[^\]]+\]$/;
	const quotesPattern = /^"(.*)"$/;

	if (quotesPattern.test(value)) 
		value = value.match(quotesPattern)![1]; // remove quotes
    
	if (linkPattern.test(value)) 
		return value.slice(1, -1); // remove square brackets for links
	else if (emailPattern.test(value)) 
		return value.match(emailPattern)![1]; // extract the email
    
	return value;
}

/**
 * Creates scenario steps for identical steps.
 * @param matchingSteps An array of matching steps.
 * @returns An object containing scenario steps for given, when, and then.
 */
function createScenarioSteps(matchingSteps: XrayStepMatch[]): { givenSteps: StepType[], whenSteps: StepType[], thenSteps: StepType[] } {
	const givenSteps: StepType[] = [];
	const whenSteps: StepType[] = [];
	const thenSteps: StepType[] = [];
	let id = 0;

	for (const scenarioStep of matchingSteps) {
		const newStep: StepType = {
			id: id++,
			type: scenarioStep.type,
			stepType: scenarioStep.context,
			deactivated: false,
			origin: scenarioStep.origin,
			pre: scenarioStep.pre, // Can be undefined, which is fine for StepType
			mid: scenarioStep.mid, // Can be undefined
			post: scenarioStep.post, // Can be undefined
			values: scenarioStep.values
		};

		if (scenarioStep.context === 'given') 
			givenSteps.push(newStep);
		else if (scenarioStep.context === 'when') 
			whenSteps.push(newStep);
		else if (scenarioStep.context === 'then') 
			thenSteps.push(newStep);
        
	}
	return { givenSteps, whenSteps, thenSteps };
}

/**
 * Helper function to extract the raw data of "given" section in xray steps
 * @param givenField The given field containing raw data.
 * @returns The extracted raw data.
 */
function extractRaw(givenField: string): string {
	try {
		// First, check if it's a JSON string
		const givenData = JSON.parse(givenField) as Record<string, unknown>;
		if (givenData.raw) 
			return givenData.raw as string;
        
	} catch (e) {
		// If parsing fails, it's likely plain text.
		if (typeof givenField === 'string') 
			return givenField;
         
		logger.error(`Error while parsing Given field of xRay execution step: ${String(e)}`);
	}
	return ''; // Fallback

}