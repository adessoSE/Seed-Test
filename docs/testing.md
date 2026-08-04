# Repo-Qualitätssicherung — Tests

Seed-Test ist eine Low-Code-WebApp zum Generieren von Browser-Automation-Tests. Diese Seite dokumentiert, wie **das Tool selbst** getestet wird.

## Tests ausführen

```bash
# Backend — Vitest Unit-Tests
cd backend && npm test              # alle Tests
npm run test-coverage               # mit Coverage-Report

# Backend — Integrationstests (benötigt laufende MongoDB)
cd backend && npm run test:integration

# Frontend — Vitest Unit-Tests (via Angular CLI)
cd frontend && npm test             # alle Tests
npm run test-coverage               # mit Coverage-Report

# Einzelne Datei:
npx vitest run src/services/story.service.spec.ts
```

## Backend (Vitest)

- **689 Tests** in **45 Spec-Dateien** (Stand: August 2026)
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

#### Services (14 Dateien, 171 Tests)

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

#### Helpers (5 Dateien, 83 Tests)

| Datei | Tests | Abdeckung |
|-------|------:|-----------|
| `sanitize.spec.ts` | 16 | HTML/XSS Sanitization |
| `specialCommandParser.spec.ts` | 45 | Resolve Special Commands in Steps |
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

## Integrationstests (gegen echte MongoDB)

Seit August 2026 gibt es eine Integrationstest-Schicht, die gegen eine **lokale MongoDB** testet — nicht gegen gemockte Datenbankverbindungen.

### Motivation

Die 689 Unit-Tests mocken `DbConnector.getConnection()` via `vi.hoisted()` + `vi.mock()`. Dadurch werden **Query-Shape-Fehler, ObjectId-Koerzionsfehler, Index-Nutzung und Cascade-Verhalten** nie getestet. Integrationstests schließen diese Lücke.

### WARNUNG: Die Suite LEERT Collections

Integrationstests schreiben Testdaten und leeren Collections (`deleteMany({})`). Sie **dürfen niemals gegen eine geteilte oder Produktions-Datenbank laufen**. Ein Host-Guard in `setup.ts` verhindert das:

- Die Suite liest **`INTEGRATION_DATABASE_URI`** (nicht `DATABASE_URI`)
- Der Host wird **vor** `MongoClient.connect()` gegen eine Whitelist geprüft
- Erlaubte Hosts: `localhost`, `127.0.0.1`, `::1`, `mongodb`, `seedmongodb`, `host.docker.internal`
- Bei einem Remote-Host (Atlas, CI, Produktion) failt die Suite SOFORT mit einer Fehlermeldung — kein Skip, kein Connect
- Fehlt die Variable, greift der Default `mongodb://SeedAdmin:SeedTest@localhost:27017`

Parallel laufende Integrationstests mehrerer Entwickler auf derselben Datenbank zerstören sich gegenseitig — jeder Entwickler braucht seine eigene lokale MongoDB.

### Warum die existierende Docker-MongoDB statt mongodb-memory-server?

`mongodb-memory-server` wurde explizit **abgelehnt**, weil:

- `docker-compose.yml` und `docker-test.yml` starten bereits `mongo:latest` mit Healthcheck
- `mongodb-memory-server` lädt ein ~80MB MongoDB-Binary herunter, was hinter Corporate-Proxies scheitert
- Es würde einen **zweiten, parallelen** MongoDB-Instanz neben der bereits laufenden bedeuten

Stattdessen verwenden die Integrationstests `INTEGRATION_DATABASE_URI` und schreiben in eine **dedizierte Datenbank `Seed_itest`** (nicht die Produktionsdatenbank `Seed`).

### Ausführen

```bash
# INTEGRATION_DATABASE_URI setzen (optional — Default greift auf localhost)
export INTEGRATION_DATABASE_URI=mongodb://SeedAdmin:SeedTest@localhost:27017

# MongoDB muss laufen (Docker oder lokal):
docker compose up -d seedmongodb

# Integrationstests starten:
cd backend && npm run test:integration
```

Falls keine lokale MongoDB erreichbar ist, skippt die Suite mit:
```
Integration tests require a running MongoDB — run 'docker compose up -d seedmongodb'
```

### Host-Guard im Detail

Die Funktion `assertLocalHost()` in `src/integration/setup.ts`:

1. Extrahiert den Host aus der URI (unterstützt `mongodb://` und `mongodb+srv://`)
2. Vergleicht gegen die Whitelist lokaler Adressen
3. Bei Treffer: Verbindung wird zugelassen
4. Bei Nichttreffer: **sofortiger Abbruch vor `MongoClient.connect()`**

Die Whitelist enthält `localhost`, `127.0.0.1`, `::1`, `mongodb`, `seedmongodb` und `host.docker.internal`. Ein Atlas-Cluster (`mongodb+srv://...mongodb.net`) wird zuverlässig abgewiesen.

### Datenbank-Wahl: Option A

Die Integrationstests verwenden **Option A**: Sie erzeugen einen eigenen `MongoClient` und wählen `Seed_itest` explizit aus, ohne `DbConnector` zu nutzen. Begründung:

1. **Keine Änderung an `DbConnector.ts`** — Null-Risiko für die 689 bestehenden Unit-Tests, die `getConnection()` mocken
2. `DbConnector.establishConnection()` wird von Produktionscode-Pfaden genutzt (z.B. `import-export.service.ts`) — ein optionaler Parameter dort würde die Mock-Oberfläche für alle existierenden Tests ändern
3. Integrationstests unterscheiden sich inhärent von Unit-Tests — sie verwalten ihren eigenen Connection-Lifecycle und sollten keinen Singleton-State mit der App teilen

### Test-Dateien und Coverage

| Datei | Tests | Abdeckung |
|-------|------:|-----------|
| `cascade-delete.itest.ts` | 8 | Delete-Story-Cascade (Repo, Groups), Delete-Repository-Cascade (Stories, Blocks, Workgroups), Delete-Group (Stories überleben), Delete-Report |
| `authorize.itest.ts` | 25 | authorizeRepo (10), authorizeByStory (6), authorizeByReport (5), authorizeByIssueKey (3) — je Owner/Member/Nicht-Mitglied/nicht existent |

### Test-Isolation

- **Per File**: `beforeAll`/`afterAll` erzeugen/schließen den Client
- **Per Test**: `beforeEach` leert alle Collections, die das File berührt
- Keine geteilten Fixtures zwischen Files — die Suite ist order-agnostisch

### Bekanntes Issue: Transaktionen

`src/services/import-export.service.ts` (Zeilen 66–96) verwendet `client.startSession()` + `session.withTransaction()`. MongoDB-Transaktionen **erfordern einen Replica Set**, aber weder `docker-compose.yml` noch `docker-test.yml` starten Mongo mit `--replSet`.

**Dies ist ein offenes Issue** — der Import/Export-Transaktionspfad kann nicht gegen einen Standalone-MongoDB funktionieren und könnte ein echter Produktions-Bug sein. Eine separate Untersuchung ist erforderlich.

### Gefundene Bugs

Bei den Cascade-Tests wurde folgendes Verhalten dokumentiert (aber nicht gefixt — die Tests spiegeln den aktuellen Code):

1. **deleteRepository mit nur Owner als Workgroup-Member**: Der Code prüft `workgroup.Members.length > 0` und tritt in den Transfer-Zweig ein, selbst wenn der Owner das einzige Mitglied ist. Die Übertragung an den aktuellen Owner ist sinnlos — hier sollte auf Members ohne Owner-Email geprüft werden. Siehe `cascade-delete.itest.ts` Test `deleteRepository with only the owner as workgroup member fully purges (no transfer target)`.

## CI-Tests

GitHub Actions CI (`CI_Tests_and_Report.yaml`) läuft:
1. Docker Stack Build mit `docker-test.yml` (Node 22/24/26 Matrix)
2. `docker exec Seed-backend npm test`
3. `docker exec Seed-frontend npm test`
4. Sanity Check: POST login → `/api/sanity/test/$REPO_ID/$GROUP_ID`
5. Teams-Report via Microsoft Teams Webhook

## SonarCloud

- Frontend-Only: Project key `adessoAG_Seed-Test`
- Test Inclusions: `**/*.spec.ts`
- Report: `frontend/coverage/lcov.info`
