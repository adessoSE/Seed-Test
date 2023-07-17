
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