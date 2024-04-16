import reporter from 'cucumber-html-reporter';
import pfs from 'fs/promises';
import fs  from 'fs';
import path from 'path';
const mongo = require('../../src/database/DbServices');
const testExecutor = require('../../src/serverHelper')
import {ExecutionMode, GenericReport, StoryReport, ScenarioReport, GroupReport, PassedCount, StepStatus} from '../models/models';
import { Github, IssueTracker, IssueTrackerOption } from '../models/IssueTracker';


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

async function resolveReport(reportObj: any, mode: ExecutionMode, stories: any[], req: any) {
    if (mode !== ExecutionMode.GROUP && stories.length === 0) stories.push(reportObj.story);
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
    if (mode === ExecutionMode.GROUP) reportName = `${reportResults.reportName}/${reportResults.reportName}`;
    return {reportResults, reportName};
}

function analyzeReport(grpName: string, stories: any[], mode: ExecutionMode, reportName: string, scenarioId: number) {
    let reportOptions;
    switch (mode) {
        case ExecutionMode.SCENARIO:
            reportOptions = setOptions(reportName);
            try {
                reporter.generate(reportOptions);
            } catch (e) {
                console.log(`Could not generate the html Report for ${reportName} 
                    inside analyzeReport. Error${e}`);
            }
            return analyzeScenarioReport(stories, reportName, scenarioId, reportOptions);
        case ExecutionMode.STORY:
            try {
                reportOptions = setOptions(reportName);
                reporter.generate(reportOptions);
            } catch (e) {
                console.log(`Could not generate the html Report for ${reportName} 
                    inside analyzeReport. Error${e}`);
            }
            return analyzeStoryReport(stories, reportName, reportOptions);
        case ExecutionMode.GROUP:
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
function analyzeStoryReport(stories: Array<any>, reportName: string, reportOptions: any) {
    let reportResults = new StoryReport();
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
function failedReportPromise(reportName: string) {
    return { reportName: `Failed-${reportName}`, status: false } as GenericReport;
}



function analyzeScenarioReport(stories: Array<any>, reportName: string, scenarioId: number, reportOptions: any) {
    const reportResults = new ScenarioReport();
    reportResults.reportName = reportName;
    reportResults.reportOptions = reportOptions;
    const reportPath = `./features/${reportName}.json`;

    return pfs.readFile(reportPath, 'utf8')
    .then((data) => {
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
    }).catch ((reason) => {
        console.log(`fs.readFile error for file ./features/${reportName}.json`)
        return reportResults
    });
}

function analyzeGroupReport(grpName: string, stories: any[], reportOptions: any) {
    const reportResults = new GroupReport()
    reportResults.reportOptions = reportOptions
    try {
        const reportPath = `./features/${grpName}/${grpName}.html.json`;
        console.log(`Trying to Read: ${reportPath}`);
        return pfs.readFile(reportPath, 'utf8').then(data => {
            const cucumberReport = JSON.parse(data);
            console.log(`NUMBER OF STORIES IN THE Group-Report: ${cucumberReport.length}`);
            try {
                let scenariosTested = new PassedCount()
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
    try {
        fs.writeFileSync(resolvedPath, report.jsonReport);
    } catch (error) {
        console.log('Error:', error);
    }
    
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
    const featureStatus = { storyId, status: false, scenarioStatuses: [], featureTestResults: new StepStatus(), scenariosTested: { passed: 0, failed: 0 } };

    let featurePassedSteps = 0;
    let featureFailedSteps = 0;
    let featureSkippedSteps = 0;

    // for each scenario (called element in the .json report)
    // element = scenarios and "Before" / "After" statements
    console.log(`NUMBER OF SCENARIOS IN REPORT: ${featureReport.elements.length}`);
    for (const scenReport of featureReport.elements) {
        const scenario = feature.scenarios[featureReport.elements.indexOf(scenReport)];
        if (!scenario) continue;
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

async function runReport(req, res, stories: any[], mode: ExecutionMode, parameters) {
	let reportObj;
	try {
		if (mode === ExecutionMode.GROUP) {
			req.body.name = req.body.name.replace(/ /g, '_') + Date.now();
			fs.mkdirSync(`./features/${req.body.name}`);
			if (parameters.isSequential == undefined || !parameters.isSequential)
				reportObj = await Promise.all(stories.map((story) => testExecutor.executeTest(req, mode, story))).then((valueArr)=>valueArr.pop());
			else {
				for (const story of stories) {
					reportObj = await testExecutor.executeTest(req, mode, story);
				}
			}
		} else {
			const story = await mongo.getOneStory(req.params.issueID, req.params.storySource);
			reportObj = await testExecutor.executeTest(req, mode, story).catch((reason) =>{console.log('crashed in execute test');res.send(reason).status(500)});
		}
	} catch (error) {
		res.status(404).send(error);
		return;
	}

	const { reportResults, reportName } = await resolveReport(reportObj, mode, stories, req);
	// generate HTML Report
	console.log(`reportName in callback of resolveReport: ${reportName}`);
	console.log(`reportResults in callback of resolveReport: ${reportResults}`);
	// upload report to DB
	const uploadedReport = await mongo.uploadReport(reportResults)
		.catch((error) => {
			console.log(`Could not UploadReport :  ./features/${reportName}.json
				Rejection: ${error}`);
			res.json({ htmlFile: `Could not UploadReport :  ./features/${reportName}.json` });
		});
	// read html Report and add it top response
	fs.readFile(`./features/${reportName}.html`, 'utf8', (err, data) => {
		res.json({ htmlFile: data, reportId: uploadedReport._id , report: reportResults});
	});
	testExecutor.updateLatestTestStatus(uploadedReport, mode);

	// delete Group folder
	const deletionTime = reportDeletionTime * 60000;
	if (mode === ExecutionMode.GROUP) setTimeout(deleteReport, deletionTime, `${reportResults.reportName}`);
	else {
		// delete reports in filesystem after a while
		setTimeout(deleteReport, deletionTime, `${reportName}.json`);
		setTimeout(deleteReport, deletionTime, `${reportName}.html`);
	}

	// if possible separate function
	for (const story of stories) {
        const issueTracker = IssueTracker.getIssueTracker(story.storySource)
        const comment = issueTracker.reportText(reportResults, story.title)
		if (story.storySource === IssueTrackerOption.GITHUB && req.user.github) {
			const githubValue = parameters.repository.split('/');
			// eslint-disable-next-line no-continue
			if (githubValue == null) { continue; }
			const githubName = githubValue[0];
			const githubRepo = githubValue[1];

			issueTracker.postComment(comment, {issueId: story.issue_number, repoUser: githubName, repoName: githubRepo}, req.user.github)
			if (mode === ExecutionMode.STORY) (issueTracker as Github).updateLabel(reportResults.status, {issueId: story.issue_number, repoUser: githubName, repoName: githubRepo}, req.user.github.githubToken);
		}
		if (story.storySource === IssueTrackerOption.JIRA  && req.user.jira) {
            issueTracker.postComment(comment, {issueId: story.issue_number}, req.user.jira)
		}
	}
}

async function runSanityReport(req, res, stories: any[], mode: ExecutionMode, parameters) {
	let reportObj;
	try {
		if (mode === ExecutionMode.GROUP) {
			req.body.name = req.body.name.replace(/ /g, '_') + Date.now();
			fs.mkdirSync(`./features/${req.body.name}`);
			if (parameters.isSequential == undefined || !parameters.isSequential)
				reportObj = await Promise.all(stories.map((story) => testExecutor.executeTest(req, mode, story))).then((valueArr)=>valueArr.pop());
			else {
				for (const story of stories) {
					reportObj = await testExecutor.executeTest(req, mode, story);
				}
			}
		} else {
			const story = await mongo.getOneStory(req.params.issueID, req.params.storySource);
			reportObj = await testExecutor.executeTest(req, mode, story).catch((reason) =>{console.log('crashed in execute test');res.send(reason).status(500)});
		}
	} catch (error) {
		res.status(404).send(error);
		return;
	}

	const { reportResults, reportName } = await resolveReport(reportObj, mode, stories, req);
	// generate HTML Report
	console.log(`reportName in callback of resolveReport: ${reportName}`);
	console.log(`reportResults in callback of resolveReport: ${reportResults}`);
	// upload report to DB
	const uploadedReport = await mongo.uploadReport(reportResults)
		.catch((error) => {
			console.log(`Could not UploadReport :  ./features/${reportName}.json
				Rejection: ${error}`);
			res.json({ htmlFile: `Could not UploadReport :  ./features/${reportName}.json` });
		});

    function formatNotification(json) {
        const { scenarios, steps } = json;
      
        const notificationText = `
          Scenarios: ${scenarios.failed} failed, ${scenarios.passed} passed, ${scenarios.passed+scenarios.failed} total
          Steps: ${steps.failedSteps} failed, ${steps.passedSteps} passed, ${steps.skippedSteps} skipped, ${steps.passedSteps+steps.failedSteps+steps.skippedSteps} total    
        `;
      
        return notificationText;
    }

	fs.readFile(`./features/${reportName}.html`, 'utf8', (err, data) => {
		res.status(200).send(formatNotification({"scenarios": reportResults.scenariosTested, "steps": (reportResults as GroupReport).groupTestResults}));
	});
	testExecutor.updateLatestTestStatus(uploadedReport, mode);
}


export {
    createReport,
    resolveReport,
    deleteGroupDir,
    reportDeletionTime, // Delete when not used
    deleteReport,
    runReport,
    runSanityReport
};