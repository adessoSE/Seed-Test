
import { ExecutionMode, GenericReport, GroupReport, ScenarioReport, StepStatus } from "./models";

enum IssueTrackerOption{
    JIRA = 'jira',
    GITHUB = 'github',
    NONE = 'db'
}

abstract class IssueTracker {

    constructor () {

    }

    static getIssueTracker(tracker: IssueTrackerOption): IssueTracker {
        switch (tracker) {
            case IssueTrackerOption.JIRA:
                return new Jira();
            case IssueTrackerOption.GITHUB:
                return new Github();
            case IssueTrackerOption.NONE:
                return new NoTracker();
            default:
                throw new Error('Invalid IssueTracker')
        }
    }
    reportText(report: GenericReport, testedTitle: string) {
        let comment = '';
        let commentReportResult: StepStatus, commentReportname: string;
        if (report.mode === ExecutionMode.GROUP) {
			comment = `This Execution ist part of group execution ${report.reportName}\n`; // recheck it that is right alternative prepend after call
            commentReportResult = (report as GroupReport).groupTestResults
            commentReportname = report.reportName.split('/')[0]
		} else {
			commentReportResult = (report as ScenarioReport).featureTestResults
            commentReportname = report.reportName
		}
        const testPassedIcon = report.status ? ':white_check_mark:' : ':x:';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const reportUrl = `${frontendUrl}/report/${report.reportName}`;
        if (report.mode === ExecutionMode.SCENARIO) comment = `# Test Result ${new Date(report.reportTime).toLocaleString()}\n## Tested Scenario: "${testedTitle}"\n### Test passed: ${report.status}${testPassedIcon}\nSteps passed: ${commentReportResult.passedSteps} :white_check_mark:\nSteps failed: ${commentReportResult.failedSteps} :x:\nSteps skipped: ${commentReportResult.skippedSteps} :warning:\nLink to the official report: [Report](${reportUrl})`;
        else comment = `# Test Result ${new Date(report.reportTime).toLocaleString()}\n## Tested Story: "${testedTitle}"\n### Test passed: ${report.status}${testPassedIcon}\nScenarios passed: ${report.scenariosTested.passed} :white_check_mark:\nScenarios failed: ${report.scenariosTested.failed} :x:\nLink to the official report: [Report](${reportUrl})`;
        return comment;
    }
    abstract postComment(comment: string, issueId: string, credentials: any);
}


class Github extends IssueTracker {
    reportText(report: GenericReport, testedTitle: string) {
        return super.reportText(report, testedTitle)
    }
    postComment() {
        throw new Error("Method not implemented.")
    }
}

class NoTracker extends IssueTracker {
    reportText(report: GenericReport, testedTitle: string) {
        return super.reportText(report, testedTitle)
    }
    postComment() {
        throw new Error("Method not implemented.")
    }
}

class Jira extends IssueTracker {
    constructor () {
        super()
    }
    reportText(report: GenericReport, testedTitle: string) {
        return super.reportText(report, testedTitle)
    }
    postComment(comment: string, issueId: string, credentials: any) {
        const link = `https://${credentials.host}/rest/api/2/issue/${issueId}/comment/`;
        const auth = `Basic ${Buffer.from(`${credentials.jiraUser}:${credentials.jiraPassword}`, 'binary').toString('base64')}`;
        const body = { body: comment };
        fetch(link, {
            method: 'post',
            body: JSON.stringify(body),
            headers: { Authorization: auth, 'Content-Type': 'application/json' }
        }).then(async (response: Response) => {
            const data = await response.json();
            console.log(data);
        })
    }
}

export {
    IssueTrackerOption,
    Jira
}