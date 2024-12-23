const stepDefs = require('../../src/database/stepTypes');

/**
 * Fetches all necessary data for a given test issue, including test runs and test steps.
 * 
 * @param {Object} issue - The test issue object containing the key.
 * @param {Object} options - The options object for making the fetch requests (e.g., headers).
 * @param {string} Host - The hostname or base URL for the API requests.
 * @returns {Promise<Object>} An object containing scenarioList and testStepDescription.
 */
async function handleTestIssue(issue, options, Host) {
    // Fetch all test runs for the given issue
    const testrunResponse = await fetch(`https://${Host}/rest/raven/2.0/api/test/${issue.key}/testruns`, options);
    const testRuns = await testrunResponse.json();

    // Fetch details for all test runs
    const testRunDetailsPromises = testRuns.map((testRun) => fetch(`https://${Host}/rest/raven/2.0/api/testrun/${testRun.id}`, options).then(response => response.json()));
    const resolvedTestRuns = await Promise.all(testRunDetailsPromises);

    // Fetch all test steps defined for the given issue
    const testStepsResponse = await fetch(`https://${Host}/rest/raven/2.0/api/test/${issue.key}/steps`, options);
    const testSteps = await testStepsResponse.json();

    // Process the test steps with corresponding testrun and scenario details
    const { scenarioList, testStepDescription } = processTestSteps(testSteps.steps, resolvedTestRuns, issue.key);

    return { scenarioList, testStepDescription };
}

/**
 * Creates scenarios and description given xray test steps and resolved xray test runs.
 * 
 * @param {Array} steps - An array of test steps for the given issue.
 * @param {Array} resolvedTestRuns - An array of resolved test runs containing details of each run.
 * @param {string} issueKey - The key of the issue being processed.
 * @returns {Object} An object containing the scenarioList and testStepDescription.
 */
function processTestSteps(steps, resolvedTestRuns, issueKey) {
    const scenarioList = [];

    let testStepDescription = '\n\nTest-Steps:\n';

    // Iterate through steps and add step description
    steps.forEach((step) => {
        if (!step.fields) {
            console.log(`Fields missing for step ${step.id}`);
            return;
        }

        const { fields } = step;

        // Check if xray step is identical to one step from the step definitions
        const identicalMatches = checkIdenticalSteps(fields);

        // Create scenario steps from identical matches
        const { givenSteps, whenSteps, thenSteps } = createScenarioSteps(identicalMatches);

        // Create scenario object
        const stepInfo = [`\n----- Scenario ${step.index} -----\n`];
        stepInfo.push(fields.Given ? `(GIVEN): ${fields.Given.value}\n` : '(GIVEN): Not used\n');
        stepInfo.push(fields.Action && fields.Action.value.raw ? `(WHEN): ${fields.Action.value.raw}\n` : '(WHEN): Not steps used\n');
        stepInfo.push(fields['Expected Result'] && fields['Expected Result'].value.raw ? `(THEN): ${fields['Expected Result'].value.raw}\n` : '(THEN): No steps used\n');
        testStepDescription += stepInfo.join('');

        const matchingSteps = [];
        // Iterate through all resolved test runs
        resolvedTestRuns.forEach((testRunDetails) => {
            if (!testRunDetails.steps) {
                return;
            }
            // Map test steps to testrun steps
            testRunDetails.steps.forEach((testRunStep) => {
                const stepGiven = fields.Given ? fields.Given.value : '';
                const stepAction = fields.Action ? fields.Action.value.raw : '';
                const stepExpected = fields['Expected Result'] ? fields['Expected Result'].value.raw : '';
                const testRunGiven = testRunStep.fields.Given ? extractRaw(testRunStep.fields.Given.value) : '';
                const testRunAction = testRunStep.fields.Action ? testRunStep.fields.Action.value.raw : '';
                const testRunExpected = testRunStep.fields['Expected Result'] ? testRunStep.fields['Expected Result'].value.raw : '';

                if (stepGiven === testRunGiven && stepAction === testRunAction && stepExpected === testRunExpected) {
                    matchingSteps.push({
                        testRunId: testRunDetails.id,
                        testRunStepId: testRunStep.id,
                        testExecKey: testRunDetails.testExecKey
                    });
                }
            });
        });

        const scenario = {
            scenario_id: step.id,
            name: `${step.id}`,
            stepDefinitions: {
                given: givenSteps || [],
                when: whenSteps || [],
                then: thenSteps || [],
                example: []
            },
            testRunSteps: matchingSteps,
            testKey: issueKey
        };

        scenarioList.push(scenario);
    });

    return { scenarioList, testStepDescription };
}

/**
 * Checks if the given xray step is identical to one of the step definitions.
 * 
 * @param {Object} step - The xray step containing sections of given, actiona and expected result.
 * @returns {Array} An array of matching step definitions.
 */
function checkIdenticalSteps(step) {
    const matches = [];
    let context;
    // Separate the given, action, and expected result sections and select the relevant text
    ['Given', 'Action', 'Expected Result'].forEach(section => {
        if (step[section] && step[section].value) {
            let texts;
            if (section === 'Given') {
                texts = step[section].value.split('\n');
                context = 'given';
            } else if (section === 'Action') {
                texts = step[section].value.raw.split('\n');
                context = 'when';
            } else if (section === 'Expected Result') {
                texts = step[section].value.raw.split('\n');
                context = 'then';

            }
            // Analyze each separated text against patterns
            texts.forEach(text => {
                if (text.trim()) {
                    const match = analyzeText(text.trim(), context);
                    if (match) {
                        matches.push(match);
                    }
                }
            });
        }
    });
    return matches;
}

/**
 * Analyzes text to match with step definitions.
 * 
 * @param {string} text - The text to analyze.
 * @param {string} context - The context (given, when, then) of the step.
 * @returns {Object|null} The matching step definition or null if no match found.
 */
function analyzeText(text, context) {
    // Get all step types except 'Add Variable' as it is not relevant for the test steps
    const stepTypes = stepDefs().filter(def => def.type !== 'Add Variable');

    for (let stepType of stepTypes) {
        if (stepType.stepType === context) {
            // Create a pattern based on the pre, mid, and post values of the step definition
            // Store the strings after the pre, mid, and post values by (.*) in the pattern
            let pattern = `${escapeRegExp(stepType.pre)}(.*)${stepType.mid ? escapeRegExp(stepType.mid) + '(.*)' : ''}`;
            if (stepType.post) {
                pattern += `${escapeRegExp(stepType.post)}(.*)`;
            }
            const regex = new RegExp(pattern, 'i');
            const match = text.match(regex);
            if (match) {
                const values = match.slice(1).map(value => cleanValue(value.trim().replace(/\.$/, ''))).filter(v => v);
                if (stepType.type === "Screenshot" && values.length === 0) {
                    values.push('');
                }
                return {
                    type: stepType.type,
                    values: values,
                    pre: stepType.pre,
                    mid: stepType.mid ? stepType.mid : '',
                    post: stepType.post ? stepType.post : undefined,
                    context: context,
                    origin: "congruent"
                };
            }
        }
    }
    return null;
}

/**
 * Replaces special characters in a string with escape characters.
 * 
 * @param {string} string - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cleans value and extracts email or link.
 * 
 * @param {string} value - The value to clean.
 * @returns {string} The cleaned value.
 */
function cleanValue(value) {
    const linkPattern = /^\[http:\/\/[^\]]+\]$/;
    const emailPattern = /^\[([^\]]+@[^\]]+)\|mailto:[^\]]+\]$/;
    const quotesPattern = /^"(.*)"$/;

    if (quotesPattern.test(value)) {
        value = value.match(quotesPattern)[1]; // remove quotes
    }
    if (linkPattern.test(value)) {
        return value.slice(1, -1); // remove square brackets for links
    } else if (emailPattern.test(value)) {
        return value.match(emailPattern)[1]; // extract the email
    }
    return value;
}

/**
 * Creates scenario steps for identical steps.
 * 
 * @param {Array} matchingSteps - An array of matching steps.
 * @returns {Object} An object containing scenario steps for given, when, and then.
 */
function createScenarioSteps(matchingSteps) {
    let givenSteps = []
    let whenSteps = []
    let thenSteps = []

    let id = 0;

    for (let scenarioStep of matchingSteps) {

        let newStep = {
            id: id++,
            stepType: scenarioStep.context,
            deactivated: false,
            origin: scenarioStep.origin,
            pre: undefined,
            mid: undefined,
            post: undefined,
            values: undefined
        };

        if (scenarioStep.pre !== undefined) {
            newStep.pre = scenarioStep.pre;
        }
        if (scenarioStep.mid !== undefined) {
            newStep.mid = scenarioStep.mid;
        }
        if (scenarioStep.post !== undefined) {
            newStep.post = scenarioStep.post;
        }
        if (scenarioStep.values !== undefined) {
            newStep.values = scenarioStep.values;
        }

        if (scenarioStep.context === 'given') {
            givenSteps.push(newStep)
        }
        else if (scenarioStep.context === 'when') {
            whenSteps.push(newStep)
        }
        else if (scenarioStep.context === 'then') {
            thenSteps.push(newStep)
        }
    }

    return { givenSteps, whenSteps, thenSteps }
}

/**
 * Helper function to extract the raw data of "given" section in xray steps
 * 
 * @param {string} givenField - The given field containing raw data.
 * @returns {string} The extracted raw data.
 */
function extractRaw(givenField) {
    try {
        const givenData = JSON.parse(givenField);
        if (givenData && givenData.raw) {
            return givenData.raw;
        }
    } catch (e) {
        console.error('Error while parsing Given field of xRay execution step', e);
    }
    return '';
}

module.exports = {
    handleTestIssue,
};
