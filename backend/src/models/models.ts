
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

export {
    scenarioStatus,
    executionMode,
    groupReport,
    storyReport,
    scenarioReport,
    passedCount,
    stepStatus
};