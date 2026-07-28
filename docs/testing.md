# Repo-Qualitätssicherung — Tests

Seed-Test ist eine Low-Code-WebApp zum Generieren von Browser-Automation-Tests. Diese Seite dokumentiert, wie **das Tool selbst** getestet wird.

## Tests ausführen

```bash
# Backend — Vitest Unit-Tests
cd backend && npm test              # alle Tests
npm run test-coverage               # mit Coverage-Report

# Frontend — Vitest Unit-Tests (via Angular CLI)
cd frontend && npm test             # alle Tests
npm run test-coverage               # mit Coverage-Report

# Einzelne Datei:
npx vitest run src/services/story.service.spec.ts
```

## Backend (Vitest)

- **599 Tests** in **42 Spec-Dateien** (Stand: Juli 2026)
- `*.spec.ts` Dateien liegen **neben der zu testenden Logik** (`services/`, `controllers/`, `helpers/`, `middleware/`, `utils/`, `testing/`, `schemas/`)
- Vitest `v4.1` mit `@shared` Path-Alias (`vitest.config.ts`)
- Target: `node` (kein DOM)
- Mock-Pattern: `vi.hoisted()` + `vi.mock()` für alle DB- und Service-Mocks (vermeidet TDZ-Fehler bei ESM)

### Testinventar

#### Controllers (16 Dateien, 288 Tests)

| Datei | Tests | Abdeckung |
|-------|------:|-----------|
| `story.controller.spec.ts` | 78 | CRUD, Scenarios, OneDriver, Backgrounds, SpecialCommands |
| `user.controller.spec.ts` | 29 | Login, Register, Forgot/Reset PW, GitHub-Merge, Update |
| `group.controller.spec.ts` | 20 | CRUD, Add/Remove Stories, Reorder |
| `testExecution.controller.spec.ts` | 20 | Feature/Scenario/TempGroup Runs, Report Resolution |
| `jira.controller.spec.ts` | 18 | Login, Credentials, Xray-Status, Disconnect |
| `workgroup.controller.spec.ts` | 17 | Add/Update/Remove Member |
| `block.controller.spec.ts` | 15 | CRUD mit IDOR-Schutz |
| `repository.controller.spec.ts` | 13 | CRUD, Settings, Owner-Transfer |
| `sanity.controller.spec.ts` | 13 | Run, Report-Mismatch-Fix, Cleanup |
| `script.controller.spec.ts` | 13 | Group/Feature Script Runs |
| `github.controller.spec.ts` | 11 | Issues, Repos, Sync |
| `report.controller.spec.ts` | 11 | CRUD, Upload, HTML-Report |
| `file.controller.spec.ts` | 11 | Upload, List, Delete mit IDOR |
| `background.controller.spec.ts` | 8 | GET/PUT |
| `logging.controller.spec.ts` | 6 | Log-Messages |
| `playwright.controller.spec.ts` | 5 | Test-Status SSE |

#### Services (14 Dateien, 193 Tests)

| Datei | Tests | Abdeckung |
|-------|------:|-----------|
| `repository.service.spec.ts` | 48 | Alle 27 Funktionen: CRUD, Groups, Source-Repos, Owner-Transfer |
| `report.service.spec.ts` | 31 | CRUD, Status-Updates, HTML-Generierung, Scheduled Deletion |
| `import-export.service.spec.ts` | 12 | Export ZIP, Import (neu/bestehend), Konfliktmodi |
| `externalAccount.service.spec.ts` | 14 | Auth-Strings, Verschlüsselung, GitHub-Format, Jira Credentials |
| `story.service.spec.ts` | 11 | Create Story/Scenario, OneDriver, Delete |
| `block.service.spec.ts` | 10 | CRUD mit Mongo-Sanitize und IDOR |
| `workgroup.service.spec.ts` | 10 | Get/Add/Remove Members |
| `ai.service.spec.ts` | 8 | Parser-Availability, Local/Cloud Provider, Error Handling |
| `user.service.spec.ts` | 7 | Register, Login, Find, Delete |
| `xray.service.spec.ts` | 7 | Delete Steps, Handle Test Issues |
| `file.service.spec.ts` | 5 | Delete/List mit IDOR |
| `feature-file.service.spec.ts` | 4 | Generate/Update Feature Files |
| `step-type.service.spec.ts` | 2 | Show StepTypes |
| `externalSync.service.spec.ts` | 2 | Jira Step-Merge |

#### Test Runners (1 Datei, 22 Tests)

| Datei | Tests | Abdeckung |
|-------|------:|-----------|
| `test-runner.service.spec.ts` | 22 | Feature/Scenario/Group Mode, Cucumber Config, Global Settings, Playwright/Selenium |

#### Middleware (3 Dateien, 25 Tests)

| Datei | Tests | Abdeckung |
|-------|------:|-----------|
| `authorize.spec.ts` | 16 | canEdit, canCreate, canRun — Owner/Member/Denied |
| `validate.spec.ts` | 7 | Zod-Validation Middleware, Strip Unknown, Field Errors |
| `authenticate.spec.ts` | 2 | isAuthenticated Pass/Fail |

#### Helpers (4 Dateien, 39 Tests)

| Datei | Tests | Abdeckung |
|-------|------:|-----------|
| `sanitize.spec.ts` | 16 | HTML/XSS Sanitization |
| `specialCommandParser.spec.ts` | 11 | Resolve Special Commands in Steps |
| `AppError.spec.ts` | 10 | Constructor, Factory Methods, instanceof |
| `cryptoHelper.spec.ts` | 8 | AES-256-GCM Encrypt/Decrypt Round-Trip |
| `jobQueue.spec.ts` | 4 | Sequential Processing, Error Recovery |

#### Utils & Schemas (3 Dateien, 44 Tests)

| Datei | Tests | Abdeckung |
|-------|------:|-----------|
| `validation.spec.ts` | 22 | ObjectId/Email/RepoName Validators |
| `user.schemas.spec.ts` | 16 | Zod-Schema-Validierung (Login, Register, etc.) |
| `mongo-sanitize.spec.ts` | 6 | NoSQL-Injection-Schutz: $-Key Stripping |

### Mock-Konventionen

```typescript
// Standard-Pattern: vi.hoisted() + vi.mock() für ESM-kompatible Mocks
const { mockDb, mockedService } = vi.hoisted(() => ({
  mockDb: { collection: vi.fn() },
  mockedService: { someMethod: vi.fn() }
}));

vi.mock('../database/DbConnector', () => ({
  getConnection: vi.fn(() => mockDb)
}));

import * as myService from './my.service.js';

// Controller-Tests: createReq()/createRes() Helper
function createReq(overrides = {}) {
  return { body: {}, params: {}, user: { _id: 'userId' }, ...overrides };
}
```

## Frontend (Vitest)

- Vitest via Angular CLI (`ng test`)
- läuft in `jsdom` (nicht echte Browser)
- Konfig: `frontend/vitest.config.ts`

```bash
# Einzelner Test:
npx vitest run src/app/Services/api.service.spec.ts

# Watch mode:
npx vitest --watch
```

## CI-Tests

GitHub Actions CI (`CI_Tests_and_Report.yaml`) läuft:
1. Docker Stack Build mit `docker-test.yml` (Node 20/22/24 Matrix)
2. `docker exec Seed-backend npm test`
3. `docker exec Seed-frontend npm test`
4. Sanity Check: POST login → `/api/sanity/test/$REPO_ID/$GROUP_ID`
5. Teams-Report via Microsoft Teams Webhook

## SonarCloud

- Frontend-Only: Project key `adessoAG_Seed-Test`
- Test Inclusions: `**/*.spec.ts`
- Report: `frontend/coverage/lcov.info`
