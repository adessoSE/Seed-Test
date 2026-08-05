# Repository Quality Assurance — Tests

Seed-Test is a low-code web app for generating browser automation tests. This page documents how **the tool itself** is tested.

## Running tests

```bash
# Backend — Vitest unit tests
cd backend && npm test              # all tests
npm run test-coverage               # with coverage report

# Backend — integration tests (requires running MongoDB)
cd backend && npm run test:integration

# Frontend — Vitest unit tests (via Angular CLI)
cd frontend && npm test             # all tests
npm run test-coverage               # with coverage report

# Single file:
npx vitest run src/services/story.service.spec.ts
```

## Backend (Vitest)

- **689 tests** in **45 spec files** (as of August 2026)
- `*.spec.ts` files sit **next to the tested logic** (`services/`, `controllers/`, `helpers/`, `middleware/`, `utils/`, `testing/`, `schemas/`)
- Vitest `v4.1` with `@shared` path alias (`vitest.config.ts`)
- Target: `node` (no DOM)
- Mock pattern: `vi.hoisted()` + `vi.mock()` for all DB and service mocks (avoids TDZ errors with ESM)

### Test inventory

#### Controllers (16 files, 288 tests)

| File | Tests | Coverage |
|-------|------:|-----------|
| `story.controller.spec.ts` | 78 | CRUD, Scenarios, OneDriver, Backgrounds, SpecialCommands |
| `user.controller.spec.ts` | 29 | Login, Register, Forgot/Reset PW, GitHub-Merge, Update |
| `group.controller.spec.ts` | 20 | CRUD, Add/Remove Stories, Reorder |
| `testExecution.controller.spec.ts` | 20 | Feature/Scenario/TempGroup Runs, Report Resolution |
| `jira.controller.spec.ts` | 18 | Login, Credentials, Xray-Status, Disconnect |
| `workgroup.controller.spec.ts` | 17 | Add/Update/Remove Member |
| `block.controller.spec.ts` | 15 | CRUD with IDOR protection |
| `repository.controller.spec.ts` | 13 | CRUD, Settings, Owner-Transfer |
| `sanity.controller.spec.ts` | 13 | Run, Report-Mismatch-Fix, Cleanup |
| `script.controller.spec.ts` | 13 | Group/Feature Script Runs |
| `github.controller.spec.ts` | 11 | Issues, Repos, Sync |
| `report.controller.spec.ts` | 11 | CRUD, Upload, HTML-Report |
| `file.controller.spec.ts` | 11 | Upload, List, Delete with IDOR |
| `background.controller.spec.ts` | 8 | GET/PUT |
| `logging.controller.spec.ts` | 6 | Log-Messages |
| `playwright.controller.spec.ts` | 5 | Test-Status SSE |

#### Services (14 files, 171 tests)

| File | Tests | Coverage |
|-------|------:|-----------|
| `repository.service.spec.ts` | 48 | All 27 functions: CRUD, Groups, Source-Repos, Owner-Transfer |
| `report.service.spec.ts` | 31 | CRUD, Status-Updates, HTML generation, Scheduled Deletion |
| `import-export.service.spec.ts` | 12 | Export ZIP, Import (new/existing), conflict modes |
| `externalAccount.service.spec.ts` | 14 | Auth strings, encryption, GitHub format, Jira Credentials |
| `block.service.spec.ts` | 10 | CRUD with Mongo sanitize and IDOR |
| `workgroup.service.spec.ts` | 10 | Get/Add/Remove Members |
| `ai.service.spec.ts` | 8 | Parser-Availability, Local/Cloud Provider, Error Handling |
| `user.service.spec.ts` | 7 | Register, Login, Find, Delete |
| `xray.service.spec.ts` | 7 | Delete Steps, Handle Test Issues |
| `file.service.spec.ts` | 5 | Delete/List with IDOR |
| `feature-file.service.spec.ts` | 4 | Generate/Update Feature Files |
| `step-type.service.spec.ts` | 2 | Show StepTypes |
| `externalSync.service.spec.ts` | 2 | Jira Step-Merge |

#### Test Runners (1 file, 22 tests)

| File | Tests | Coverage |
|-------|------:|-----------|
| `test-runner.service.spec.ts` | 22 | Feature/Scenario/Group Mode, Cucumber Config, Global Settings, Playwright/Selenium |

#### Middleware (3 files, 25 tests)

| File | Tests | Coverage |
|-------|------:|-----------|
| `authorize.spec.ts` | 16 | canEdit, canCreate, canRun — Owner/Member/Denied |
| `validate.spec.ts` | 7 | Zod-Validation Middleware, Strip Unknown, Field Errors |
| `authenticate.spec.ts` | 2 | isAuthenticated Pass/Fail |

#### Helpers (5 files, 83 tests)

| File | Tests | Coverage |
|-------|------:|-----------|
| `sanitize.spec.ts` | 16 | HTML/XSS Sanitization |
| `specialCommandParser.spec.ts` | 45 | Resolve Special Commands in Steps |
| `AppError.spec.ts` | 10 | Constructor, Factory Methods, instanceof |
| `cryptoHelper.spec.ts` | 8 | AES-256-GCM Encrypt/Decrypt Round-Trip |
| `jobQueue.spec.ts` | 4 | Sequential Processing, Error Recovery |

#### Utils & Schemas (3 files, 44 tests)

| File | Tests | Coverage |
|-------|------:|-----------|
| `validation.spec.ts` | 22 | ObjectId/Email/RepoName Validators |
| `user.schemas.spec.ts` | 16 | Zod-Schema-Validierung (Login, Register, etc.) |
| `mongo-sanitize.spec.ts` | 6 | NoSQL-Injection-Schutz: $-Key Stripping |

### Mock conventions

```typescript
// Standard pattern: vi.hoisted() + vi.mock() for ESM-compatible mocks
const { mockDb, mockedService } = vi.hoisted(() => ({
  mockDb: { collection: vi.fn() },
  mockedService: { someMethod: vi.fn() }
}));

vi.mock('../database/DbConnector', () => ({
  getConnection: vi.fn(() => mockDb)
}));

import * as myService from './my.service.js';

// Controller test helpers: createReq() / createRes()
function createReq(overrides = {}) {
  return { body: {}, params: {}, user: { _id: 'userId' }, ...overrides };
}
```

## Frontend (Vitest)

- **119 tests** (as of August 2026)
- Vitest via Angular CLI (`ng test`)
- runs in `jsdom` (not real browsers)
- Config: `frontend/vitest.config.ts`

```bash
# Single test:
npx vitest run src/app/Services/api.service.spec.ts

# Watch mode:
npx vitest --watch
```

## Integration tests (Testcontainers)

Since August 2026 an integration test layer tests against an **isolated MongoDB in a container** — not against mocked database connections.

### Motivation

The 689 unit tests mock `DbConnector.getConnection()` via `vi.hoisted()` + `vi.mock()`. This means **query-shape errors, ObjectId coercion errors, index usage, and cascade behavior** are never tested. Integration tests close this gap.

### Technology: Testcontainers

The tests use [`testcontainers`](https://testcontainers.com/) for Node.js. Each run starts a fresh `mongo:8` container:

- **Pure isolation**: The container runs on a random host port — no conflict with the production database (`Seed`) or the development container (`seedmongodb`)
- **ReplicaSet included**: The container is started with `--replSet rs0` and initialized so MongoDB transactions work
- **Automatic cleanup**: The Testcontainers Ryuk sidecar stops and removes the container after the test run
- **Security**: No host guard needed — the container is inherently local and ephemeral

### Running

```bash
# Single command — Testcontainers starts/stops MongoDB automatically
cd backend && npm run test:integration
```

**First run**: ~60s (Docker pull for `mongo:8`).  
**Subsequent runs**: ~15s (image cached, container start + replica init in <5s).

If Docker is not running, the suite skips with:
```
Integration tests require Docker (Testcontainers) — ensure Docker Desktop
or Podman Desktop (with Docker API) is running
```

### Prerequisite: Docker or Podman

**Docker Desktop**: Just let it run — Testcontainers finds the Docker socket automatically.

**Podman Desktop**: Enable the **Docker API compatibility mode** in Podman Desktop (Settings → Docker API). Testcontainers then communicates seamlessly through the Docker API emulation.

No manual `docker compose up` needed anymore.

### ESLint status

Backend and frontend: **0 errors, 0 warnings** (5 `no-unsafe-*` rules disabled in `test-runners/**/*.ts` via eslint.config.mjs with rationale comment).

### Database choice: standalone client

The integration tests create their own `MongoClient` and mock `DbConnector`, so all service calls run against the same Testcontainers instance. The container uses the database `Seed` — since the container is isolated and ephemeral, there is no risk to production. Rationale:

1. **No change to `DbConnector.ts`** — zero risk for the 689 existing unit tests that mock `getConnection()`
2. `DbConnector.establishConnection()` is used by production code paths (e.g. `import-export.service.ts`) — an optional parameter there would change the mock surface for all existing tests
3. Integration tests are inherently different from unit tests — they manage their own connection lifecycle and should not share singleton state with the app

### Test files and coverage

| File | Tests | Coverage |
|-------|------:|-----------|
| `cascade-delete.itest.ts` | 9 | Delete-Story-Cascade (Repo, Groups), Delete-Repository-Cascade, Ownership-Transfer, Delete-Group, Delete-Report — all call real services |
| `authorize.itest.ts` | 24 | authorizeRepo (10), authorizeByStory (6), authorizeByReport (5), authorizeByIssueKey (3) — per Owner/Member/Non-Member/Non-Existent |
| `import-export.itest.ts` | 5 | Import into existing project, Import as new project, Rename mode, Transaction rollback on error |

### Test isolation

- **Global**: `vitest.integration.config.ts` sets `fileParallelism: false` — each file gets its own container
- **Per file**: `beforeAll` starts the container and `MongoClient`, `afterAll` stops both
- **Per test**: `beforeEach` clears all collections that the file touches
- No shared fixtures across files — the suite is order-agnostic

### Transactions (resolved)

The earlier issue — `import-export.service.ts` needs MongoDB transactions, which require a ReplicaSet — is solved with Testcontainers: the `mongo:8` container starts as a ReplicaSet (`rs0`) by default. Transaction paths can now be tested correctly.

### Found false assumption (fixed)

The original version of the cascade tests contained a test that seeded a workgroup with the owner as the only member and assumed a bug because `deleteRepository()` entered the transfer branch (`workgroup.Members.length > 0`). Analysis of the production code revealed: **That is not a bug.** The owner is never in `Members` in the application — `transferOwnership()` and `promoteNewOwner()` remove the new owner from Members, and `addMember()` blocks duplicates. The misleading test was replaced with a realistic ownership-transfer test with a real second member.

## CI tests

GitHub Actions CI (`CI_Tests_and_Report.yaml`) runs:
1. Docker stack build with `docker-test.yml` (Node 22/24/26 matrix)
2. `docker exec Seed-backend npm test`
3. `docker exec Seed-frontend npm test`
4. Sanity check: POST login → `/api/sanity/test/$REPO_ID/$GROUP_ID`
5. Teams report via Microsoft Teams Webhook

## SonarCloud

- Frontend-Only: Project key `adessoAG_Seed-Test`
- Test Inclusions: `**/*.spec.ts`
- Report: `frontend/coverage/lcov.info`
