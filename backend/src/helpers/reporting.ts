const reporter = require('cucumber-html-reporter');
const pfs = require('fs/promises')
const fs = require('fs')
const path = require('path');

// this is needed for the html report
const options = {
    theme: 'bootstrap',
    jsonFile: 'features/reporting.json',
    output: 'features/reporting_html.html',
    reportSuiteAsScenarios: true,
    launchReport: false,
    storeScreenshots: false,
    screenshotsDirectory: 'features/screenshots/',
    metadata: {
        'App Version': '0.3.2',
        'Test Environment': 'STAGING',
        GoogleChromeShiv: process.env.GOOGLE_CHROME_SHIM,
        Parallel: 'Scenarios',
        Executed: 'Remote'
    }
};

// Time after which the report is deleted in minutes
const reportDeletionTime: number = parseInt(process.env.REPORT_DELETION_TIME) || 5;

const reportPath = path.normalize('features/');

function setOptions(reportName: string, reportPath = 'features/') {
    const myOptions = JSON.parse(JSON.stringify(options));
    myOptions.metadata.Platform = process.platform;
    myOptions.name = `Seed-Test Report: ${reportName}`;
    if (reportPath !== 'features/') {
        myOptions.jsonDir = `${reportPath}`;
        myOptions.jsonFile = null;
    } else myOptions.jsonFile = `${reportPath}${reportName}.json`;
    myOptions.output = `${reportPath}${reportName}.html`;
    return myOptions;
}

async function resolveReport(reportObj: any, mode: executionMode, stories: any[], req: any) {
    if ((mode === 'feature' || mode === 'scenario') && stories.length === 0) stories.push(reportObj.story);
    let scenarioId;
    if (req.params.scenarioId !== undefined) {
        scenarioId = req.params.scenarioId;
    }
    let { reportName } = reportObj;

    // analyze Report:
    const reportResults = await analyzeReport(req.body.name, stories, mode, reportName, scenarioId)
    reportResults.reportTime = reportObj.reportTime;
    reportResults.mode = mode;

    // Group needs an adjusted Path to Report
    if (mode === 'group') reportName = `${reportResults.reportName}/${reportResults.reportName}`;
    return {reportResults, reportName};
}

function analyzeReport(grpName: string, stories: any[], mode: executionMode, reportName: string, scenarioId: number) {
    let reportOptions;
    switch (mode) {
        case 'scenario':
            reportOptions = setOptions(reportName);
            try {
                reporter.generate(reportOptions);
            } catch (e) {
                console.log(`Could not generate the html Report for ${reportName} 
                    inside analyzeReport. Error${e}`);
            }
            return analyzeScenarioReport(stories, reportName, scenarioId, reportOptions);
        case 'feature':
            try {
                reportOptions = setOptions(reportName);
                reporter.generate(reportOptions);
            } catch (e) {
                console.log(`Could not generate the html Report for ${reportName} 
                    inside analyzeReport. Error${e}`);
            }
            return analyzeStoryReport(stories, reportName, reportOptions);
        case 'group':
            reportOptions = setOptions(grpName, `features/${grpName}/`);
            try {
                /* after the last story in a group we need to generate the hmtl report
                        // which also generates the .json report for all stories (group report)
                        then the actual group report can be analyzed. */
                reporter.generate(reportOptions);
            } catch (e) {
                console.log(`Could not generate the html Report for ${grpName}/${reportName} 
                    inside analyzeReport. Error${e}`);
            }
            return analyzeGroupReport(grpName, stories, reportOptions);
        default:
            console.log('Error: No mode provided in analyzeReport');
            return failedReportPromise(reportName);
    }
}

// param: stories should only contain one Story
function analyzeStoryReport(stories, reportName, reportOptions) {
    let reportResults = new storyReport();
    try {
        const reportPath = `./features/${reportName}.json`;
        return pfs.readFile(reportPath, 'utf8').then((data) => {
            const cucumberReport = JSON.parse(data);
            console.log(`NUMBER OF STORIES IN THE REPORT (must be 1): ${cucumberReport.length}`);// Assert?
            try {
                // for each story
                const storyReport = cucumberReport[0];
                const story = stories[0];

                const result = featureResult(storyReport, story)
                reportResults = { ...reportResults, ...result }// sync reportResult with result
                reportResults.reportName = reportName
                reportResults.reportOptions = reportOptions
                reportResults.featureId = stories[0]._id
                return reportResults

            } catch (error) {
                reportResults.status = false;
                console.log('iterating through report Json failed in serverHelper/runReport. '
                    + 'Setting testStatus of Report to false.', error);
            }
        })
    } catch (error) {
        console.log(`fs.readFile error for file ./features/${reportName}.json`);
    }
}
function failedReportPromise(reportName) {
    return { reportName: `Failed-${reportName}`, status: false };
}

enum executionMode{
    SCENARIO = 'scenario',
    STORY = 'feature',
    GROUP = 'group'
}
class passedCount{
    passed: number
    failed: number
    constructor(){
        this.passed = 0
        this.failed = 0
    }
}

class groupReport{
    reportName: string
    reportOptions: any
    status: boolean // different
    storyStatuses: Array<{storyId: string, status: boolean, scenarioStatuses: Array<scenarioStatus>, featureTestResults: stepStatus, scenariosTested: passedCount}> // different
    // different no feature/storyId
    // featureTestResults: stepStatus
    scenariosTested: { passed: number, failed: number }
    groupTestResults: stepStatus
    reportTime: number
    mode: executionMode.GROUP
    smallReport: string
    constructor(){
        this.status = false
        this.storyStatuses = []
        this.scenariosTested = new passedCount()
        this.groupTestResults = new stepStatus() 
    }
}

class storyReport{
    reportName: string
    reportOptions: any
    status: boolean
    scenarioStatuses: scenarioStatus[]
    featureId: string // different
    featureTestResults: stepStatus
    scenariosTested: passedCount
    reportTime: number
    mode: executionMode.STORY
    smallReport: string
    constructor(){
        this.status = false
        this.scenarioStatuses = []
        this.featureTestResults = new stepStatus()
        this.scenariosTested = new passedCount()
    }
}

class scenarioReport {
    reportName: string
    reportOptions: any
    status: boolean
    scenarioStatuses: scenarioStatus[]
    storyId: string // different
    scenarioId: string // different
    featureTestResults: stepStatus
    scenariosTested: passedCount
    reportTime: number
    mode: executionMode.SCENARIO
    smallReport: string
    constructor(){
        this.status = false
        this.scenarioStatuses = []
        this.featureTestResults = new stepStatus()
        this.scenariosTested = new passedCount()
    }
}

class scenarioStatus{
    scenarioId: number
    status: boolean
    stepResults: stepStatus
    constructor() {
        this.status = false
        this.stepResults = new stepStatus() // why nested?
    }
}

class stepStatus {
    passedSteps: number
    failedSteps: number
    skippedSteps: number
    constructor() {
        this.passedSteps = this.failedSteps = this.skippedSteps = 0
    }
}

function analyzeScenarioReport(stories: Array<any>, reportName: string, scenarioId: number, reportOptions: any) {
    const reportResults = new scenarioReport();
    reportResults.reportName = reportName;
    reportResults.reportOptions = reportOptions;
    try {
        const reportPath = `./features/${reportName}.json`;
        return pfs.readFile(reportPath, 'utf8').then((data) => {
            const cucumberReport = JSON.parse(data);
            console.log(`NUMBER OF STORIES IN THE REPORT (must be 1): ${cucumberReport.length}`);
            try {
                const storyReport = cucumberReport[0];
                console.log(`NUMBER OF SCENARIOS IN THE REPORT (must be 1): ${storyReport.elements.length}`);
                const story = stories[0];
                console.log(`Story ID: ${story._id}`);
                console.log(story);
                reportResults.storyId = story._id;
                const scenarioReport = storyReport.elements[0]

                const scenario = story.scenarios.find(scen => scen.scenario_id == scenarioId)
                let result = scenarioResult(scenarioReport, scenario)
                reportResults.scenarioId = result.scenarioId
                reportResults.featureTestResults = result.stepResults
                reportResults.scenariosTested = { passed: +result.status, failed: +!result.status }
                reportResults.status = result.status
                reportResults.scenarioStatuses.push(result)
                return reportResults
            } catch (error) {
                reportResults.status = false;
                console.log('iterating through report Json failed in serverHelper/runReport. '
                    + 'Setting testStatus of Report to false.', error);
            }
        })
    } catch (error) {
        console.log(`fs.readFile error for file ./features/${reportName}.json`);
    }
    console.log('Report Results in analyzeScenarioReport: ');
    console.log(reportResults);
    return reportResults;
}

function analyzeGroupReport(grpName: string, stories: any[], reportOptions: any) {
    const reportResults = new groupReport()
    reportResults.reportOptions = reportOptions
    try {
        const reportPath = `./features/${grpName}/${grpName}.html.json`;
        console.log(`Trying to Read: ${reportPath}`);
        return pfs.readFile(reportPath, 'utf8').then(data => {
            const cucumberReport = JSON.parse(data);
            console.log(`NUMBER OF STORIES IN THE Group-Report: ${cucumberReport.length}`);
            try {
                let scenariosTested = new passedCount()
                let overallPassedSteps = 0;
                let overallFailedSteps = 0;
                let overallSkippedSteps = 0;

                // for each story
                for (const storyReport of cucumberReport) {
                    const story = stories[cucumberReport.indexOf(storyReport)];
                    const result = featureResult(storyReport, story)

                    overallPassedSteps += result.featureTestResults.passedSteps
                    overallFailedSteps += result.featureTestResults.failedSteps
                    overallSkippedSteps += result.featureTestResults.skippedSteps
                    // after all Scenarios and Steps:
                    scenariosTested.passed += result.scenariosTested.passed
                    scenariosTested.failed += result.scenariosTested.failed

                    reportResults.storyStatuses.push(result);
                }
                // end of for each story
                reportResults.status = testPassed(overallPassedSteps, overallFailedSteps);
                reportResults.groupTestResults = { passedSteps: overallPassedSteps, failedSteps: overallFailedSteps, skippedSteps: overallSkippedSteps };
                reportResults.scenariosTested = scenariosTested;
                reportResults.reportName = grpName;
                return reportResults
            } catch (error) {
                reportResults.status = false;
                console.log('iterating through report Json failed in analyzeGroupReport.'
                    + 'Setting testStatus of Report to false.', error);
            }
        });
    } catch (error) {
        console.log(`fs.readFile error for file /features/${grpName}/${grpName}.json`);
    }
}

function deleteGroupDir(dirName: string) {
    const dirPath = path.normalize(`${reportPath}${dirName}`);
    fs.rmdir(dirPath, { recursive: true }, (err) => {
        if (err) console.log(err);
        else console.log(`${dirPath} Folder deleted.`);
    });
}

// returns true if failed = 0 and passed > 1
function testPassed(failed: number, passed: number) {
    return failed <= 0 && passed >= 1;
}

async function deleteOldReports(reports: any[]) {
    const keepReportAmount = parseInt(process.env.MAX_SAVED_REPORTS);
    // sort Reports by timestamp
    reports.sort((a, b) => b.reportTime - a.reportTime);
    // exclude saved / favorite Reports from deleting
    const reportsToDelete = reports.filter((elem) => !elem.isSaved);
    // exclude the a given amount fo the last run reports
    reportsToDelete.splice(0, keepReportAmount);
    // then delete the remaining old reports:
    reportsToDelete.forEach((element) => {
        reports.splice(reports.indexOf(element), 1);
        mongo.deleteReport(element._id);
    });
    return reports;
}

async function createReport(res, reportName: string) {//TODO remove res here push earlier
    const report = await mongo.getReportByName(reportName);
    const resolvedPath = path.resolve(`features/${reportName}.json`);
    fs.writeFileSync(resolvedPath, report.jsonReport, (err) => { console.log('Error:', err); });
    reporter.generate(setOptions(reportName));
    setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.json`);
    setTimeout(deleteReport, reportDeletionTime * 60000, `${reportName}.html`);

    const htmlPath = `features/${reportName}.html`;
    const resolvedHtmlPath = path.resolve(htmlPath);
    fs.readFile(resolvedHtmlPath, 'utf8', (_err, data) => {
        res.json({ htmlFile: data, reportId: report._id });
    });
}

/**
 * returns the results of all steps in one story/feature
 * @param scenarioReports
 */
function featureResult(featureReport: any, feature: any) {
    const storyId = feature._id
    console.log(` Story ID: ${storyId}`);
    const featureStatus = { storyId, status: false, scenarioStatuses: [], featureTestResults: new stepStatus(), scenariosTested: { passed: 0, failed: 0 } };

    let featurePassedSteps = 0;
    let featureFailedSteps = 0;
    let featureSkippedSteps = 0;

    // for each scenario (called element in the .json report)
    // element = scenarios and "Before" / "After" statements
    console.log(`NUMBER OF SCENARIOS IN REPORT: ${featureReport.elements.length}`);
    for (const scenReport of featureReport.elements) {
        const scenario = feature.scenarios[featureReport.elements.indexOf(scenReport)];
        let result = scenarioResult(scenReport, scenario)

        //increment FeatureSteps
        featurePassedSteps += result.stepResults.passedSteps
        featureFailedSteps += result.stepResults.failedSteps
        featureSkippedSteps += result.stepResults.skippedSteps

        featureStatus.scenarioStatuses.push(result)

        // count number of passed and failed Scenarios:
        if (result.status) featureStatus.scenariosTested.passed += 1;
        else featureStatus.scenariosTested.failed += 1;
    }
    featureStatus.featureTestResults = { passedSteps: featurePassedSteps, failedSteps: featureFailedSteps, skippedSteps: featureSkippedSteps }
    featureStatus.status = testPassed(featureFailedSteps, featurePassedSteps)
    return featureStatus

}

/**
 * returns the result of all steps in one scenario
 * @param scenarioReport
 */
function scenarioResult(scenarioReport: any, scenario: any) {
    const scenarioId = scenario.scenario_id;
    let scenarioPassedSteps = 0;
    let scenarioFailedSteps = 0;
    let scenarioSkippedSteps = 0;
    console.log(`scenario ID: ${scenarioId}`);

    // for each step inside a scenario
    for (const step of scenarioReport.steps) {
        switch (step.result.status) {
            case 'passed':
                scenarioPassedSteps++;
                break;
            case 'failed':
                scenarioFailedSteps++;
                break;
            case 'skipped':
                scenarioSkippedSteps++;
                break;
            default:
                console.log(`Status default: ${step.result.status}`);
        }
    }
    // set scenario status (for GitHub/Jira reporting comment)
    const scenStatus = testPassed(scenarioFailedSteps, scenarioPassedSteps);
    return {
        scenarioId,
        status: scenStatus,
        stepResults: { passedSteps: scenarioPassedSteps, failedSteps: scenarioFailedSteps, skippedSteps: scenarioSkippedSteps }
  };
}

function deleteReport(jsonReport: string) {
    const report = path.normalize(`${reportPath}${jsonReport}`);
    fs.unlink(report, (err) => {
        if (err) console.log(err);
        else console.log(`${report} deleted.`);
    });
}

module.exports = {
    createReport,
    resolveReport,
    deleteGroupDir,
    reportDeletionTime, // Delete when not used
    deleteReport,
};