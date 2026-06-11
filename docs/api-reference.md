# API Endpunkte Übersicht

Alle Endpunkte sind unter `/api/` routet. Routen mit `isAuthenticated`-Middleware erfordern Login. Public (`/api/user`, `/api/playwright`, `/api/log`) sind auth-frei.

## Authentifizierung

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| POST | `/api/user/register` | `{email, password}` | `{insertedId}` | Public |
| POST | `/api/user/login` | `{email, password, stayLoggedIn?}` | `User` | Public |
| GET | `/api/user/logout` | — | `{status: 'success'}` | Public |
| POST | `/api/user/resetpassword` | `{email}` | `{message}` | Public |
| PATCH | `/api/user/reset` | `{uuid, password}` | (204) | Public |
| GET | `/api/user/` | — | `User` | Require |
| POST | `/api/user/update/:userID` | `User` (partial) | `User` | Require |
| DELETE | `/api/user/` | — | `{message}` | Require |
| GET | `/api/user/callback`?code= | — | `User` | Public |
| POST | `/api/user/mergeGithub` | `{userId, login, id}` | `{status}` | Require |

## Repositories

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| GET | `/api/repository/` | — | `RepositoryContainer[]` | Require |
| POST | `/api/repository/` | `{name}` | `{insertedId}` | Require |
| GET | `/api/repository/settings/:repo_id` | — | `settings` object | Require |
| GET | `/api/repository/aiconfig/:repo_id` | — | `AiConfig` | Require |
| PUT | `/api/repository/settings/:repo_id` | `{repoName?, settings?, aiConfig?}` | `Repository` | Require |
| PUT | `/api/repository/owner/:repo_id` | `{email}` | `{message}` | Require |
| DELETE | `/api/repository/:repo_id` | — | `Result` | Require |

## Stories

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| GET | `/api/story/` | query: `source`, `id` | `Story[]` | Require |
| POST | `/api/story/` | `{title, description, _id: repoId}` | `{_id}` | Require |
| GET | `/api/story/:_id` | — | `Story` | Require |
| PUT | `/api/story/:_id` | `Story` | `Story` | Require |
| DELETE | `/api/story/:repo_id/:_id` | — | `{message}` | Require |
| PUT | `/api/story/list/:repo_id` | `string[]` (IDs) | `{message}` | Require |
| POST | `/api/story/:story_id` | `{name}` | `Scenario` | Require |
| PUT | `/api/story/:story_id/:_id` | `Scenario` | `Scenario` | Require |
| GET | `/api/story/:story_id/:_id` | — | `Scenario` | Require |
| DELETE | `/api/scenario/:story_id/:_id` | — | `{message}` | Require |
| PATCH | `/api/story/:story_id` | `Scenario[]` | `{message}` | Require |
| GET | `/api/story/download/story/:_id` | — | Binary `.feature` | Require |
| GET | `/api/story/download/project/:repo_id` | query: `version_id` | Binary `.zip` | Require |
| GET | `/api/story/download/export/:repo_id` | — | Binary `.zip` | Require |
| POST/PUT | `/api/story/upload/import/` | multer file + query: `repo_id, projectName, importMode` | `{message}` | Require |
| POST | `/api/story/specialCommands/resolve` | `{command}` | `{resolved}` | Require |
| POST | `/api/story/oneDriver/:storyID` | `{oneDriver}` | `Result` | Require |
| GET | `/api/story/issueKey/:issue_key` | — | `Story` | Require |
| POST | `/api/story/:story_id/generate-scenarios` | `{aiConfig: AiConfig}` | `{message: 'queued'}` | Require |
| GET | `/api/story/:story_id/generate-scenarios/status` | — | SSE event stream (202) | Require |

## Groups

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| GET | `/api/group/:repo_id` | — | `Group[]` | Require |
| POST | `/api/group/:repo_id` | `{name, member_stories?, sequence?, xrayTestSet?}` | `{group_id}` | Require |
| PUT | `/api/group/:repo_id/:group_id` | `Group` | `Group` | Require |
| DELETE | `/api/group/:repo_id/:group_id` | — | `{message}` | Require |
| POST | `/api/group/:repo_id/:group_id/:story_id` | — | `{message}` | Require |
| DELETE | `/api/group/:repo_id/:group_id/:story_id` | — | `{message}` | Require |
| PUT | `/api/group/:repo_id` | `Group[]` | `{message}` | Require |

## Blocks

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| POST | `/api/block/` | `Block` | `{insertedId}` | Require |
| GET | `/api/block/getBlocks/:repoId` | — | `Block[]` | Require |
| PUT | `/api/block/:blockId` | `Block` | `Block` | Require |
| DELETE | `/api/block/:blockId` | — | `{message}` or 404 | Require |

## Background

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| PUT | `/api/background/:storyID` | `Background` | `{Background}` | Require |
| DELETE | `/api/background/:storyID` | — | `{}` | Require |

## Workgroups (Team-Mitglieder)

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| GET | `/api/workgroup/:id/members` | — | `{owner, members}` | Require |
| POST | `/api/workgroup/:id/members` | `{email, canEdit?}` | `{message}` | Require |
| PUT | `/api/workgroup/:id/members` | `{email, canEdit}` | `{message}` | Require |
| DELETE | `/api/workgroup/:id/members` | `{email}` | `{message}` | Require |

## Files (Upload)

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| POST | `/api/files/:repoId` | multer file (binary) | `FileElement` | Require |
| GET | `/api/files/:repoId` | — | `FileElement[]` | Require |
| DELETE | `/api/files/:fileId` | — | `{message}` | Require |

## Reports

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| GET | `/api/report/:reportId` | — | `Report` doc | Require |
| GET | `/api/report/regenerate/:reportName` | — | `{htmlFile, reportId}` | Require |
| GET | `/api/report/history/:storyId` | — | `ReportContainer` | Require |
| DELETE | `/api/report/:reportId` | — | `{message}` | Require |
| PUT | `/api/report/save/:reportId` | — | `{message}` | Require |
| PUT | `/api/report/unsave/:reportId` | — | `{message}` | Require |

## Test Execution

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| POST | `/api/execute/Feature/:issueID` | `{repositoryId}` | `{htmlFile, reportId, report}` | Require |
| POST | `/api/execute/Scenario/:issueID/:scenarioId` | `{repositoryId}` | `{htmlFile, reportId, report}` | Require |
| POST | `/api/execute/Group/:repoID/:groupID` | `{repositoryId, repository}` | `{htmlFile, reportId, report}` | Require |
| POST | `/api/execute/TempGroup` | `{group, repositoryId}` | `{htmlFile, reportId, report}` | Require |

### Test Execution Request Body

```typescript
interface ExecuteTestRequest {
    repositoryId?: string;
    repoId?: string;       // legacy
    testRunner?: 'seleniumWebdriver' | 'playwright';  // mode selector
    name?: string;         // for group directory
    body: {
        browser: string;
        waitTime: number;
        daisyAutoLogout: boolean;
        emulator?: string;
        windowSize?: { height: number; width: number };
        [key: string]: any;
    };
    user?: User;
}
```

## Script (automatisierte Ausführung ohne Browser)

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| POST | `/api/script/Group` | `{repoID, groupID, repository?, stayLoggedIn?, email, password}` | `handleReportResult` JSON | Passport+Body |
| POST | `/api/script/Feature/:issueID` | `{issueID, repositoryId, stayLoggedIn?, email, password}` | `handleReportResult` JSON | Passport+Body |

> `script` Route verwendet eigenes Auth-Middleware (`authenticateAndProceed`) — Body enthält Login-Credentials direkt.

## External Integrations

### Jira

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| POST | `/api/jira/link` | `{jiraAccountName, jiraPassword, jiraHost, jiraAuthMethod?}` | `{message}` | Require |
| DELETE | `/api/jira/disconnect` | — | `{message}` | Require |
| POST | `/api/jira/login` | `{jiraAccountName, jiraPassword, jiraServer, AuthMethod}` | `{sessionCookie}` | Require |
| PUT | `/api/jira/xray-status` | `{testRunId, stepId, status}` | Xray API response | Require |

### GitHub

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| POST | `/api/github/submitIssue` | `{title, body, ...}` | GitHub Issue JSON | Require |
| DELETE | `/api/github/disconnectGithub` | — | `{message}` | Require |

## System

| | Endpoint | Body | Response | Auth |
|---|---------|------|----------|------|
| GET | `/api/health` | — | `OK` | Public |
| GET | `/api` | — | HTML page | Public |
| POST | `/api/log` | `{message, additional?}` | `{message: 'logged'}` | Public |
| GET | `/api/playwright/devices` | — | `PlaywrightDevices` | Public |
| GET | `/api/playwright/device-names` | — | `string[]` | Public |
| GET | `/api/stepTypes` | — | `StepType[]` | Require |
| POST | `/api/sanity/test/:repoID/:groupID` | — | Text notification | Require |
