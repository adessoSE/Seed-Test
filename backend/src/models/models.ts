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
    settings?: {reportComment: boolean, overwrite: boolean}

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

export {
    ScenarioStatus,
    ExecutionMode,
    GenericReport,
    GroupReport,
    StoryReport,
    ScenarioReport,
    PassedCount,
    StepStatus
};