# Shared Models (TypeScript)

Die Modelle in `shared/src/models/` werden vom Backend und Frontend genutzt via `import { Foo } from '@shared/models/Foo'`.

## Core Domain Models

### `Story`
```typescript
interface Story {
    _id?: any;
    issue_number?: number | string;
    story_id: number;
    storySource: string;
    background: Background;
    scenarios: Scenario[];
    oneDriver?: boolean;
    title: string;
    body: string;
    sourceSteps?: string;
    repo_type: string;
    state: string;
    assignee: string;
    assignee_avatar_url: string;
    lastTestPassed?: boolean;
    preConditions?: { preConditionKey: string; preConditionName: string; testSet: string[] }[];
    host?: string;
    aiSuggestion?: object;
}
```

### `Scenario`
```typescript
interface Scenario {
    scenario_id: number;
    name: string;
    stepDefinitions: StepDefinition;
    comment: string;
    lastTestPassed?: boolean;
    saved?: boolean;
    stepWaitTime?: number;
    browser?: string;
    emulator?: string;
    hasRefBlock?: boolean;
    width?: number;
    height?: number;
    testRunSteps?: { testRunId: number; testRunStepId: number; testExecKey: string }[];
    testKey?: string;
    multipleScenarios?: MultipleScenario[];
}
```

### `Background`
```typescript
interface Background {
    name?: string;
    stepDefinitions: StepDefinitionBackground;
    saved?: boolean;
}
```

### `Group`
```typescript
interface Group {
    _id?: any;
    name: string;
    member_stories: any[];
    isSequential: boolean;
    xrayTestSet?: boolean;
}
```

### `Block`
```typescript
interface Block {
    _id?: any;
    owner?: any;
    name?: string;
    stepDefinitions: StepDefinition;
    repositoryId?: any;
    repository?: string;
    source?: string;
    isBackground?: boolean;
    usedAsReference?: boolean;
}
```

### `StepDefinition`
```typescript
interface StepDefinition {
    given: StepType[];
    when: StepType[];
    then: StepType[];
    example?: StepType[];
}
```

### `StepType`
```typescript
interface StepType {
    _blockReferenceId?: string;
    _id?: string;
    id: number;
    pre: string;
    mid: string;
    post?: string;
    selection?: string[];
    selectionValue?: number;
    stepType: string;
    type: string;
    values: string[];
    isExample?: boolean[];
    outdated?: boolean;
    checked?: boolean;
    deactivated?: boolean;
    blockStepExpanded?: boolean;
    origin?: string;
}
```

### `FileElement`
```typescript
class FileElement {
    _id?: any;
    uploadDate?: string | Date;
    filename?: string;
}
```

### `MultipleScenario`
```typescript
interface MultipleScenario {
    values: string[];
    checked?: boolean;
    deactivated?: boolean;
}
```

## Aggregation / Container Models

### `Repository`
```typescript
interface Repository {
    _id?: any;
    owner: any;
    repoName: string;
    stories: any[];
    repoType: 'db' | 'github' | 'jira';
    customBlocks?: any[];
    groups: Group[];
    settings?: { stepWaitTime?: number; reportComment?: boolean; browser?: string; testRunner?: string; emulator?: string; width?: number; height?: number; activated?: boolean };
    aiConfig?: AiConfig;
    gitOwner?: string;
}
```

### `AiConfig`
```typescript
interface AiConfig {
    textPreparation: AiProviderConfig;
    jsonConversion: AiProviderConfig;
}

interface AiProviderConfig {
    provider: 'custom';
    name: 'local' | 'cloud';
    modelName: string;
    baseURL: string;
    apiKey?: string;
}
```

### `User`
```typescript
interface User {
    _id?: any;
    email: string;
    password?: string;
    transitioned?: boolean;
    github: { githubToken: string; login: string; id: number; githubRepo?: string };
    jira?: { AccountName: string; Password: { $binary: { base64: string; subType: string } }; Password_Nonce: { $binary: { base64: string; subType: string } }; Password_Tag: { $binary: { base64: string; subType: string } }; Host: string; AuthMethod: string };
}
```

## Report / Status Models

### `ReportContainer`
```typescript
interface ReportContainer {
    storyReports: StoryReport[];
    scenarioReports: ScenarioReport[];
    groupReports: GroupReport[];
}
```

### `StoryReport`
```typescript
interface StoryReport {
    _id: any;
    reportName: string;
    reportTime: number;
    reportOptions: any;
    storyId: any;
    mode: string;
    scenarioId?: any;
    isSaved?: boolean;
    overallTestStatus: boolean;
    storyStepResults: StepResults;
    scenarioStatuses: ScenarioStatus[];
}
```

### `ScenarioReport`
```typescript
interface ScenarioReport {
    _id?: any;
    reportName: string;
    reportTime: number;
    reportOptions: any;
    storyId: any;
    mode: string;
    scenarioId: any;
    overallTestStatus: boolean;
    isSaved?: boolean;
    scenarioStatuses: ScenarioStatus;
}
```

### `GroupReport`
```typescript
interface GroupReport {
    _id?: any;
    reportName: string;
    reportTime: number;
    reportOptions: any;
    mode: string;
    isSaved?: boolean;
    overallTestStatus: boolean;
    storyStatuses: StoryStatus[];
    groupStepResults: StepResults;
}
```

### `StepResults`
```typescript
interface StepResults {
    passedSteps: number;
    failedSteps: number;
    skippedSteps: number;
}
```

### `ScenarioStatus`
```typescript
interface ScenarioStatus {
    scenarioId: any;
    status: boolean;
    stepResults: StepResults;
}
```

### `StoryStatus`
```typescript
interface StoryStatus {
    storyId: any;
    status: boolean;
    storyStepResults: StepResults;
    scenarioStatuses: ScenarioStatus[];
}
```

## Frontend-local models

Im Frontend (`frontend/src/app/model/`) gibt es **dieselben Models** als lokale Kopien (nicht referenziell identisch zu `shared/`). Sie werden direkt in Template-Typen verwendet. Die Felder decken sich mit den shared-Modellen.
