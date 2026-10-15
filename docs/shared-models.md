# Shared Models (TypeScript)

Models in `shared/src/models/*.ts` are used by backend and frontend. Import them as `@seed-test/shared/models/<Name>`, for example `import type { User } from '@seed-test/shared/models/User'`. Zod schemas that validate request bodies live in `shared/src/schemas/` (see the last section). The `@shared/...` alias does not exist.

## Core Domain Models

### `Story`
```typescript
interface Story {
    _id?: string;
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
    _id?: string;
    name: string;
    member_stories: string[];
    isSequential: boolean;
    xrayTestSet?: boolean;
}
```

### `Block`
```typescript
interface Block {
    _id?: string;
    owner?: string;
    name?: string;
    stepDefinitions: StepDefinition;
    repositoryId?: string;
    repository?: string;
    source?: string;
    isBackground?: boolean;
    usedAsReference?: boolean;
    multipleScenarios?: MultipleScenario[];
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

### `StepDefinitionBackground`
```typescript
interface StepDefinitionBackground {
    when: StepType[];
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
    _id?: string;
    uploadDate?: string | Date;
    filename?: string;
}
```

### `MultipleScenario` (file `shared/src/models/MuiltipleScenario.ts`, spelling as in the file name)
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
    _id?: string;
    owner: string;
    repoName: string;
    stories: string[];
    repoType: 'db' | 'github' | 'jira';
    customBlocks?: string[];
    groups: Group[];
    settings?: { stepWaitTime?: number; reportComment?: boolean; browser?: string; testRunner?: string; emulator?: string; width?: number; height?: number; activated?: boolean };
    aiConfig?: AiConfig;
    gitOwner?: string;
}
```

### `RepositoryContainer`
```typescript
interface RepositoryContainer {
    _id?: string;
    repoName: string;
    source: string;
    canEdit?: boolean;
    settings?: {
        stepWaitTime?: number;
        reportComment?: boolean;
        browser?: string;
        testRunner?: string;
        emulator?: string;
        width?: number;
        height?: number;
        activated?: boolean;
    };
    aiConfig?: AiConfig;
}
```

### `AiConfig` (defined in `RepositoryContainer.ts`, imported by `Repository.ts`)
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
    _id?: string;
    email: string;
    password?: string;
    transitioned?: boolean;
    github?: { githubToken: string; login: string; id: number; githubRepo?: string };
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
    _id: string;
    reportName: string;
    reportTime: number;
    reportOptions: Record<string, unknown>;
    storyId: string;
    mode: string;
    scenarioId?: string;
    isSaved?: boolean;
    overallTestStatus: boolean;
    storyStepResults: StepResults;
    scenarioStatuses: ScenarioStatus[];
}
```

### `ScenarioReport`
```typescript
interface ScenarioReport {
    _id?: string;
    reportName: string;
    reportTime: number;
    reportOptions: Record<string, unknown>;
    storyId: string;
    mode: string;
    scenarioId: string;
    overallTestStatus: boolean;
    isSaved?: boolean;
    scenarioStatuses: ScenarioStatus;
}
```

### `GroupReport`
```typescript
interface GroupReport {
    _id?: string;
    reportName: string;
    reportTime: number;
    reportOptions: Record<string, unknown>;
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
    scenarioId: string;
    status: boolean;
    stepResults: StepResults;
}
```

### `StoryStatus`
```typescript
interface StoryStatus {
    storyId: string;
    status: boolean;
    storyStepResults: StepResults;
    scenarioStatuses: ScenarioStatus[];
}
```

## Frontend-local models

`frontend/src/app/model/` holds one local copy, `Group.ts`, which duplicates the shared `Group` model. All other frontend code imports from `@seed-test/shared/models/*`. Prefer the shared import; delete the copy when touching it.

## Zod schemas (`shared/src/schemas/`)

The request validation schemas are exported through the package root, `import { ... } from '@seed-test/shared'`. The backend applies them with `validate()`. One file per feature:

| File | Exports (examples) | Used for |
|---|---|---|
| `shared.schemas.ts` | `stepTypeSchema`, `stepDefinitionSchema`, `stepDefinitionBackgroundSchema`, `multipleScenarioSchema` | Domain shapes reused by other schemas |
| `background.schemas.ts` | `updateBackgroundSchema` | Background PUT |
| `block.schemas.ts` | `saveBlockSchema`, `updateBlockSchema` | Block create and update |
| `github.schemas.ts` | `submitIssueSchema` | GitHub issue submission |
| `group.schemas.ts` | `createGroupSchema` | Group create |
| `jira.schemas.ts` | `linkJiraSchema`, `jiraLoginSchema`, `updateXrayStatusSchema` | Jira link, login, Xray status |
| `logging.schemas.ts` | `logMessageSchema` | Frontend log endpoint |
| `repository.schemas.ts` | `createRepositorySchema`, `updateSettingsSchema`, `transferOwnerSchema` | Repository create, settings, owner transfer |
| `sanity.schemas.ts` | `sanityTestSchema` | Sanity test route |
| `script.schemas.ts` | `scriptGroupSchema`, `scriptFeatureSchema` | Script runs |
| `story.schemas.ts` | `createStorySchema`, `createScenarioSchema`, `setOneDriverSchema`, `updateStoryOrderSchema`, `resolveCommandSchema` | Story and scenario routes |
| `testExecution.schemas.ts` | `runTestSchema`, `runTempGroupSchema` | Test execution routes |
| `user.schemas.ts` | `loginSchema`, `registerSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `mergeGithubSchema`, `initiateMergeGithubSchema`, `updateUserSchema` | User routes |
| `workgroup.schemas.ts` | `addMemberSchema`, `updateMemberSchema`, `removeMemberSchema` | Workgroup member routes |

The directory listing is the source of truth for the exact set of files.
