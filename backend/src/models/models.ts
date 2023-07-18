
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

class GenericReport {
    reportName: string
    reportOptions: any
    status: boolean
    scenariosTested: passedCount

    reportTime: number
    mode: executionMode
    smallReport: string

    constructor(){
        this.status = false
        this.scenariosTested = new passedCount()
    }
}

class GroupReport extends GenericReport {
    storyStatuses: Array<{storyId: string, status: boolean, scenarioStatuses: Array<scenarioStatus>, featureTestResults: stepStatus, scenariosTested: passedCount}> // different
    // different no feature/storyId
    // featureTestResults: stepStatus
    groupTestResults: stepStatus
    constructor(){
        super()
        this.storyStatuses = []
        this.scenariosTested = new passedCount()
        this.groupTestResults = new stepStatus() 
        this.mode = executionMode.GROUP
    }
}

class StoryReport extends GenericReport {
    scenarioStatuses: scenarioStatus[]
    featureId: string // different
    featureTestResults: stepStatus
    constructor(){
        super()
        this.scenarioStatuses = []
        this.featureTestResults = new stepStatus()
        this.scenariosTested = new passedCount()
        this.mode = executionMode.STORY
    }
}

class ScenarioReport extends GenericReport {
    scenarioStatuses: scenarioStatus[]
    storyId: string // different
    scenarioId: string // different
    featureTestResults: stepStatus
    constructor(){
        super()
        this.scenarioStatuses = []
        this.featureTestResults = new stepStatus()
        this.scenariosTested = new passedCount()
        this.mode = executionMode.SCENARIO
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
    reportText(){
        
    }
    abstract postComment();
}

class Jira extends IssueTracker {
    reportText() {
        throw new Error("Method not implemented.")
    }
    postComment() {
        throw new Error("Method not implemented.")
    }
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
    scenarioStatus,
    executionMode,
    GenericReport,
    GroupReport,
    StoryReport,
    ScenarioReport,
    passedCount,
    stepStatus
};