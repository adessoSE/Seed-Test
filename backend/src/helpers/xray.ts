const stepDefs = require('../../src/database/stepTypes')

// Fetches all necessary data for a given test issue
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

// Create scenarios and description given the test steps and resolved test runs
function processTestSteps(steps, resolvedTestRuns, issueKey) {
    const scenarioList = [];

    let testStepDescription = '\n\nTest-Steps:\n';

    // iterate through steps and add step description
    steps.forEach((step) => {
        if (!step.fields) {
            console.log(`Fields missing for step ${step.id}`);
            return;
        }

        const { fields } = step;

        // check if xray step is identical to one step from the step definitions
        const identicalMatches = checkIdenticalSteps(fields);

        // create scenario steps from identical matches
        const { givenSteps, whenSteps, thenSteps } = createScenarioSteps(identicalMatches);

        // create scenario object
        const stepInfo = [`\n----- Scenario ${step.index} -----\n`];
        stepInfo.push(fields.Given ? `(GIVEN): ${fields.Given.value}\n` : '(GIVEN): Not used\n');
        stepInfo.push(fields.Action && fields.Action.value.raw ? `(WHEN): ${fields.Action.value.raw}\n` : '(WHEN): Not steps used\n');
        stepInfo.push(fields['Expected Result'] && fields['Expected Result'].value.raw ? `(THEN): ${fields['Expected Result'].value.raw}\n` : '(THEN): No steps used\n');
        testStepDescription += stepInfo.join('');

        const matchingSteps = [];
        // iterate through all resolved test runs
        resolvedTestRuns.forEach((testRunDetails) => {
            if (!testRunDetails.steps) {
                return;
            }
            // map test steps to testrun steps
            testRunDetails.steps.forEach((testRunStep) => {
                const stepGiven = fields.Given ? fields.Given.value : '';
                const stepAction = fields.Action ? fields.Action.value.raw : '';
                const stepExpected = fields['Expected Result'] ? fields['Expected Result'].value.raw : '';
                const testRunGiven = testRunStep.fields.Given ? extractRaw(testRunStep.fields.Given.value) : '';
                const testRunAction = testRunStep.fields.Action ? testRunStep.fields.Action.value.raw : '';
                const testRunExpected = testRunStep.fields['Expected Result'] ? testRunStep.fields['Expected Result'].value.raw : '';

                if (stepGiven === testRunGiven && stepAction === testRunAction
                    && stepExpected === testRunExpected) {
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

// Checks if the given step is identical to one of the step definitions
function checkIdenticalSteps(stepInput) {
    const matches = [];
    let context;
    // Separate the given, action, and expected result sections and select the relevant text
    // Split the text by new line
    ['Given', 'Action', 'Expected Result'].forEach(section => {
        if (stepInput[section] && stepInput[section].value) {
            let texts;
            if (section === 'Given') {
                texts = stepInput[section].value.split('\n');
                context = 'given';
            } else if (section === 'Action') {
                texts = stepInput[section].value.raw.split('\n');
                context = 'when';
            } else if (section === 'Expected Result') {
                texts = stepInput[section].value.raw.split('\n');
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

// Function to analyze text and match with step definitions
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

// Replace special characters in a string with escape characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Clean value and extract email or link
// e.g. 
// [http://www.google.com] -> http://www.google.com
// "test" -> test
// [mailto:test@test.de] -> test@test.de
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

// Create scenario steps for identical steps
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

// Helper function to extract raw data of given field in xray test execution field
function extractRaw(givenField) {
    try {
        const givenData = JSON.parse(givenField);
        if (givenData && givenData.raw) {
            // return normalizeText(givenData.raw);
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