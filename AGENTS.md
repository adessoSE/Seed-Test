# Seed-Test — Agent Instructions

## Repo context
GitHub: `adessoSE/Seed-Test` (wiki/docs at `adessoAG/Seed-Test`). Open-source BDD UI-testing platform (25★, 9↙). Released v1.8.1 on `master`, dev branch targets v2.0.0.

**API reference**: `docs/api-reference.md` (complete endpoint inventory)
**Shared models**: `docs/shared-models.md` (all schema types + frontend copies)
**Repo testing**: `docs/testing.md` (Vitest — backend + frontend)
**Test execution engine**: `docs/test-execution.md` (Cucumber/Playwright/Selenium product feature)

## Architecture
Monorepo with 3 packages: `backend` (Express/TS), `frontend` (Angular 22), `shared` (TS models).

Backend is TypeScript — old `serverRouter/` removed; replaced by clean 3-layer architecture.

### Frontend — Angular Signals + Zoneless
The frontend runs **zoneless** (`provideZonelessChangeDetection()` in `app.module.ts`, `zone.js` fully removed). All state management uses Angular Signals:

- **Service state**: `signal()` — no EventEmitters or BehaviorSubjects. Action triggers use `signal(0)` with `.update(n => n + 1)`.
- **Derived state**: `computed()` for read-only derivations, `linkedSignal()` for writable derived signals that reset when source changes.
- **Side effects**: `effect()` for reacting to signal changes. Use `untracked()` for async work inside effects.
- **RxJS bridge**: `toSignal()` from `@angular/core/rxjs-interop` for route params and FormControl.valueChanges. HTTP calls remain as Observables with `firstValueFrom()` for one-shot reads.
- **No subscribe for state**: Components never `.subscribe()` to set state — use `signal.set()` within `effect()` or `firstValueFrom()` async handlers.
- **No ngOnDestroy for cleanup**: Signals and effects auto-clean on component destroy — no manual `Subscription.unsubscribe()` needed.
- **Templates**: Signal reads use function call syntax: `isDark()`, `stories()`, `blocks()`.

| Shared models | — | — | imported via `@shared` alias |

- **Database**: MongoDB. Default connection in `docker-compose.yml`: `mongodb://SeedAdmin:SeedTest@seedmongodb:27017`
- **Frontend dev**: `http://localhost:4200/login`
- **Backend API**: `http://localhost:8080/api`

## Backend — routes → controllers → services
Old `serverRouter/` replaced by clean 3-layer architecture:

```
routes/*.ts        → URL routing + request parsing + Zod validation middleware
controllers/*.ts   → HTTP handlers (call services, return JSON)
services/*.ts      → business logic (database ops, integrations)
schemas/*.ts       → Zod v4 input validation schemas (applied via validate() middleware)
```

**Input validation**: All mutating routes use Zod schemas in `schemas/*.ts` via `validate()` middleware (`middleware/validate.ts`). The middleware validates `req.body`, replaces it with parsed output (stripping unknown keys unless `.passthrough()` is used), and returns 400 with field-level errors on failure. When adding new endpoints, always create a matching schema.

**Open flanks**: `updateGroup`, `updateGroupsArray`, `updateStory`, `updateScenarioList` use `.passthrough()` schemas that only validate a few required fields — full domain objects pass through unvalidated. Not a blocker, but a known gap.

**New services:**
- `ai.service.ts` — AI-driven test scenario generation via `@seed-test/ai-parser`, queued via `JobQueue`
- `externalSync.service.ts` — JIRA ↔ Xray ↔ GitHub ↔ DB synchronization
- `xray.service.ts` — Xray REST API integration
- `feature-file.service.ts` — Gherkin feature file generation/parsing
- `report.service.ts` — Report management
- `test-runner.service.ts` — test execution via Cucumber
- `import-export.service.ts` — SEED import/export
- `block.service.ts`, `workgroup.service.ts` — new domain models

**Test runners:** Playwright (`@playwright/test`) and Selenium-Webdriver both available in `backend/src/test-runners/`. Mode selected via request parameter.

## Quick setup
```bash
# Docker (recommended — spins up mongo, backend, frontend)
cd /c/SeedTest && docker compose up -d

# Local install (Node 20/22/24)
npm install            # root package-lock.json does nothing
cd backend && npm install
cd ../frontend && npm install
# Create .env in /backend and /frontend from their .env.example files
cd ../backend && npm run database   # creates Collections + stepTypes
```

## Key commands
```bash
# Backend
npm test                     # Vitest unit tests (*.spec.ts across src/)
npm run test-coverage        # Vitest with coverage
npm run exec-test            # Cucumber E2E (runs .feature files in features/)
npm run database             # initialize MongoDB collections
npm run tsc                  # TypeScript build only

# Frontend
npm test                     # Vitest unit tests (via ng test)
npm run test-coverage        # Vitest with coverage
npm run build                # Angular production build
```

## Docker
- **Production compose**: `docker-compose.yml` — uses pre-built images from Docker Hub, defaults included
- **CI compose**: `docker-test.yml` — builds images from `./backend/Dockerfile` and `./frontend/Dockerfile`
- **Demo image**: `docker run -p 4200:4200 -p 8080:8080 seedtest/seed-test-demo:latest`
  - Default login: `seed@test.de` / `seedtest`

## CI (GitHub Actions)
PR → `.github/workflows/CI_Tests_and_Report.yaml`:
1. Builds Docker stack with `docker-test.yml` (Node 20/22/24 matrix)
2. Runs `docker exec Seed-backend npm test` and `docker exec Seed-frontend npm test`
3. Sanity check: POST login to backend → call `/api/sanity/test/$REPO_ID/$GROUP_ID`
4. Sends Microsoft Teams report via `actions/fullReport`

Release publish → `Build_and_Publish_Images.yaml`: publishes to Docker Hub.

## Environment & config
- Backend needs `.env` in `/backend` with at least `DATABASE_URI`, `SESSION_SECRET`, `JIRA_SECRET`, `JIRA_SALT`
  - **Also required**: `ENCRYPTION_SECRET` — 64-char hex string (used by `cryptoHelper.ts` for AES-256-GCM)
- Frontend needs `.env` in `/frontend` with `API_SERVER` (default `http://localhost:8080/api`)
- Docker compose embeds env vars directly in `docker-compose.yml`
- **Default secrets in compose are not secure**: `SESSION_SECRET=secretSessionKey`, `JIRA_SECRET=secretJiraKey`, `JIRA_SALT=BJ1yJTJ7AFql`

## Testing & branch conventions
- **Backend tests**: 599 tests in 42 spec files — controllers, services, helpers, middleware, utils, schemas (see `docs/testing.md` for full inventory)
- **Primary test**: `npm test` (Vitest unit `.spec.ts` in both backend and frontend) — daily use
- **Mock pattern**: `vi.hoisted()` + `vi.mock()` for ESM-safe mocking; `createReq()`/`createRes()` helpers in controller tests
- **Cucumber E2E**: `npm run exec-test` — `.feature` → Cucumber → Playwright/Selenium → JSON report
- **Branching**: Feature branches → `dev`; `master` reserved for official release tags (triggers Docker Hub build)

## Code comments

Comments are a required part of this codebase. Do NOT remove existing comments when editing code. When writing new code, follow these conventions:

### When to comment
- **Always comment:** Business logic branches, async flow control paths (effects/signal chains/firstValueFrom), non-obvious constraints or consequences, workarounds, and integration points with external systems (Jira, Xray, MongoDB)
- **Always JSDoc:** All exported functions, classes, and interfaces — describe purpose, parameters, return values, and side effects
- **Skip comments for:** Self-explanatory one-liners where naming makes intent obvious

### What to write
- **Explain WHY** (intent, business reason, consequence) — not WHAT (the code already shows what)
- **Warn of consequences:** `// Irreversible — deletes all associated reports`, `// Order matters: groups reference story IDs created above`
- **Label code paths:** In branching logic, prefix each branch with a short description: `// CASE 1: Single scenario`, `// CASE 2: Story with pre-conditions`
- **Document constraints:** `// Must be called after loadParser() — returns null if parser unavailable`

### Format
- `/** JSDoc */` for public API (exported functions, classes, interfaces). Omit `@param`/`@return` types already expressed by TypeScript — only add them when the name alone is ambiguous
- `// single-line` for implementation notes. Place above the subject line, not at end of line
- `// TODO:` for planned improvements, `// FIXME:` for known broken things
- Never leave commented-out code — delete it; git remembers

### Anti-patterns
- Restating code: `// increment counter` above `counter++`
- Changelog comments: `// Added 2026-07-24 by SM` — that's git's job
- Closing-brace labels: `} // end if` — if the block is too long to follow, extract a function

### Examples from this codebase
```typescript
// Good: explains WHY (business rule + consequence)
// Toggle oneDriver — when active, all scenarios share a single browser session
const oneDriver = !currentOneDriver;

// Good: labels a code path with context
// CASE 2: Story has pre-conditions — run as temporary group (pre-condition stories + this story)

// Good: JSDoc for exported function
/**
 * Fetches a single story by its MongoDB ObjectId or its numeric story_id.
 * Returns null if not found.
 */
export async function getOneStory(storyId: string | number): Promise<Story | null> {

// Bad: restates code
// Set testRunning to true
this.testRunning = true;

// Bad: no intent
// Call updateOne
await db.collection(storiesCollection).updateOne(...);
```

## Style conventions (backend)
`backend/eslint.config.mjs` — ESLint 10 flat config with `typescript-eslint` + `@stylistic/eslint-plugin`:
- **Tabs** for indentation (`@stylistic/indent: tab`)
- Single quotes, semicolons required, no `comma-dangle`
- Curly braces **always required** (`"curly": ["error", "multi"]`)
- `prefer-arrow-callback` enforced, `no-console` off
- `@typescript-eslint/no-floating-promises: error`
- `no-explicit-any: warn` (off in `*.spec.ts`)
- Lint target: all `src/**/*.ts`

## Files/gitignore
Always gitignore: `.feature`, `reporting_*`, `dist/`, `node_modules/`, `.env`, `tsconfig.tsbuildinfo`, `coverage/`, `logs/`, `*.bat`, `*.sh`

## SonarCloud
Frontend-only: project key `adessoAG_Seed-Test`, test inclusions `**/*.spec.ts`, report at `frontend/coverage/lcov.info`.
