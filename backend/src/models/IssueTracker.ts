
import { checkValidGithub, jiraDecryptPassword } from "../helpers/userManagement";
import { ExecutionMode, GenericReport, GroupReport, ScenarioReport, StepStatus } from "./models";

enum IssueTrackerOption{
    JIRA = 'jira',
    GITHUB = 'github',
    NONE = 'db'
}

abstract class IssueTracker {

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
        let commentReportResult: StepStatus;
        if (report.mode === ExecutionMode.GROUP) {
			comment = `This Execution ist part of group execution ${report.reportName}\n`; // recheck it that is right, alternative prepend after call
            commentReportResult = (report as GroupReport).groupTestResults
		} else {
			commentReportResult = (report as ScenarioReport).featureTestResults
		}
        const testPassedIcon = report.status ? ':white_check_mark:' : ':x:';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const reportUrl = `${frontendUrl}/report/${report.reportName}`;
        if (report.mode === ExecutionMode.SCENARIO) comment = `# Test Result ${new Date(report.reportTime).toLocaleString()}\n## Tested Scenario: "${testedTitle}"\n### Test passed: ${report.status}${testPassedIcon}\nSteps passed: ${commentReportResult.passedSteps} :white_check_mark:\nSteps failed: ${commentReportResult.failedSteps} :x:\nSteps skipped: ${commentReportResult.skippedSteps} :warning:\nLink to the official report: [Report](${reportUrl})`;
        else comment = `# Test Result ${new Date(report.reportTime).toLocaleString()}\n## Tested Story: "${testedTitle}"\n### Test passed: ${report.status}${testPassedIcon}\nScenarios passed: ${report.scenariosTested.passed} :white_check_mark:\nScenarios failed: ${report.scenariosTested.failed} :x:\nLink to the official report: [Report](${reportUrl})`;
        return comment;
    }
    abstract postComment(comment: string, issueDetail: {issueId: string, repoUser?: string, repoName?: string}, credentials: any);

    protected buildAuthText(username: string, password: string, authMethod: string){
        let authString = `Bearer ${password}`
        if(authMethod === 'basic') { 
            const auth = Buffer.from(`${username}:${password}`).toString('base64');
            authString = `Basic ${auth}`;
        }
        return authString
    }
}


class Github extends IssueTracker {
    reportText(report: GenericReport, testedTitle: string) {
        return super.reportText(report, testedTitle)
    }
    postComment(comment: string, issueDetail: any, credentials: any) {
        if (!checkValidGithub(issueDetail.repoUser, issueDetail.repoName)) return;
        if (!(new RegExp(/^\d+$/)).test(issueDetail.issueId)) return;
        const link = `https://api.github.com/repos/${issueDetail.repoUser}/${issueDetail.repoName}/issues/${issueDetail.issueId}/comments`;
        const auth = this.buildAuthText(credentials.login, credentials.githubToken, 'basic')
        fetch(link, {
            method: 'post',
            body: JSON.stringify({ body: comment }),
            headers: { Authorization: auth }
        }).then( async (response) => {
            console.log(await response.json());
        })
    }

    private addLabelToIssue(githubName: string, githubRepo: string, password: string, issueNumber, label: string) {
        const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels`;
        const body = { labels: [label] };
        const auth = `Basic ${Buffer.from(`${githubName}:${password}`, 'binary').toString('base64')}`;
        fetch(link, {
            method: 'post',
            body: JSON.stringify(body),
            headers: { Authorization: auth, 'Content-Type': 'application/json' }
        })
    }
    
    private removeLabelOfIssue(githubName: string, githubRepo: string, password: string, issueNumber, label: string) {
        const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels/${label}`;
        const auth = `Basic ${Buffer.from(`${githubName}:${password}`, 'binary').toString('base64')}`;
        fetch(link, {
            method: 'post',
            headers: { Authorization: auth, 'Content-Type': 'application/json' }
        })
    }
    
    updateLabel(testStatus: boolean, issueDetail: {issueId: string, repoUser?: string, repoName?: string}, githubToken: string) {
        let removeLabel;
        let addedLabel;
        if (testStatus) {
            removeLabel = 'Seed-Test Test Fail :x:';
            addedLabel = 'Seed-Test Test Success :white_check_mark:';
        } else {
            removeLabel = 'Seed-Test Test Success :white_check_mark:';
            addedLabel = 'Seed-Test Test Fail :x:';
        }
        this.removeLabelOfIssue(issueDetail.repoUser, issueDetail.repoName, githubToken, issueDetail.issueId, removeLabel);
        this.addLabelToIssue(issueDetail.repoUser, issueDetail.repoName, githubToken, issueDetail.issueId, addedLabel);
    }
}

class NoTracker extends IssueTracker {
    reportText(report: GenericReport, testedTitle: string) {
        return super.reportText(report, testedTitle)
    }
    postComment(comment: string, issueDetail: any, credentials: any) {
        throw new Error("Method not implemented.")
    }
}

class Jira extends IssueTracker {
    reportText(report: GenericReport, testedTitle: string) {
        let comment = super.reportText(report, testedTitle)
        comment = comment.replace('#','h1. ')
        comment = comment.replace('##','h2. ')
        comment = comment.replace('###','h3. ')
        comment = comment.replaceAll(':white_check_mark:','(/)')
        comment = comment.replaceAll(':x:','(x)')
        comment = comment.replaceAll(':warning:','(!)')
        comment = comment.replace('undefined','')
        comment = comment.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "[$1|$2]");//convert link
        comment = comment.replace('Steps passed:','(+) Passed Steps:')
        comment = comment.replace('Steps failed:','(-) Failed Steps:')
        comment = comment.replace('Steps skipped:','(!) Skipped Steps:')
        return comment
    }
    postComment(comment: string, issueDetail: any, credentials: any) {
        const clearPass = this.decryptPassword(credentials)
        const authString = this.buildAuthText(credentials.AccountName, clearPass, credentials.AuthMethod)
        const link = `https://${credentials.Host}/rest/api/2/issue/${issueDetail.issueId}/comment/`;
        const body = { body: comment };
        fetch(link, {
            method: 'post',
            body: JSON.stringify(body),
            headers: { Authorization: authString, 'Content-Type': 'application/json' }
        }).then(async (response: Response) => {
            const data = await response.json();
            console.log(data);
        })
    }
    decryptPassword(credentials: any){
        const {Password, Password_Nonce, Password_Tag } = credentials;
		return jiraDecryptPassword(Password, Password_Nonce, Password_Tag);
    }
}

export {
    IssueTrackerOption,
    IssueTracker,
    Github,
    Jira
}