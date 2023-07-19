import Jira from './JiraTracker'

enum ExecutionMode {
    SCENARIO = 'scenario',
    STORY = 'feature',
    GROUP = 'group'
}
class PassedCount {
    passed: number
    failed: number
    constructor(){
        this.passed = 0
        this.failed = 0
    }
}

class GenericReport {
    reportName: string
    reportOptions: any
    status: boolean
    scenariosTested: PassedCount

    reportTime: number
    mode: ExecutionMode
    smallReport: string

    constructor(){
        this.status = false
        this.scenariosTested = new PassedCount()
    }
}

class GroupReport extends GenericReport {
    storyStatuses: Array<{storyId: string, status: boolean, scenarioStatuses: Array<ScenarioStatus>, featureTestResults: StepStatus, scenariosTested: PassedCount}> // different
    // different no feature/storyId
    // featureTestResults: stepStatus
    groupTestResults: StepStatus
    constructor(){
        super()
        this.storyStatuses = []
        this.scenariosTested = new PassedCount()
        this.groupTestResults = new StepStatus() 
        this.mode = ExecutionMode.GROUP
    }
}

class StoryReport extends GenericReport {
    scenarioStatuses: ScenarioStatus[]
    featureId: string // different
    featureTestResults: StepStatus
    constructor(){
        super()
        this.scenarioStatuses = []
        this.featureTestResults = new StepStatus()
        this.scenariosTested = new PassedCount()
        this.mode = ExecutionMode.STORY
    }
}

class ScenarioReport extends GenericReport {
    scenarioStatuses: ScenarioStatus[]
    storyId: string // different
    scenarioId: string // different
    featureTestResults: StepStatus
    constructor(){
        super()
        this.scenarioStatuses = []
        this.featureTestResults = new StepStatus()
        this.scenariosTested = new PassedCount()
        this.mode = ExecutionMode.SCENARIO
    }
}

class ScenarioStatus {
    scenarioId: number
    status: boolean
    stepResults: StepStatus
    constructor() {
        this.status = false
        this.stepResults = new StepStatus() // why nested?
    }
}

class StepStatus {
    passedSteps: number
    failedSteps: number
    skippedSteps: number
    constructor() {
        this.passedSteps = this.failedSteps = this.skippedSteps = 0
    }
}

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
    reportText(report: GenericReport) {
        
    }
    abstract postComment(comment: string, issueId: string, credentials: any);
}


class Github extends IssueTracker {
    reportText() {
        throw new Error("Method not implemented.")
    }
    postComment() {
        throw new Error("Method not implemented.")
    }
}

class NoTracker extends IssueTracker {
    reportText() {
        throw new Error("Method not implemented.")
    }
    postComment() {
        throw new Error("Method not implemented.")
    }
}

export {
    IssueTracker,
    ScenarioStatus,
    ExecutionMode,
    GenericReport,
    GroupReport,
    StoryReport,
    ScenarioReport,
    PassedCount,
    StepStatus
};