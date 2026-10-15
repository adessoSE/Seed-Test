# Repository Quality Assurance — Tests

Seed-Test is a low-code web app for generating browser automation tests. This page documents how **the tool itself** is tested. Test counts and file inventories are not kept here; list them with `npx vitest list` in the package directory.

## Running tests

```bash
# Backend — Vitest unit tests
cd backend && npm test
cd backend && npm run test-coverage
cd backend && npx vitest run src/services/repository.service.spec.ts   # single file

# Backend — integration tests (Testcontainers; a Docker-API-compatible runtime must be running)
cd backend && npm run test:integration

# Frontend — Angular unit-test builder (Vitest underneath)
cd frontend && npm test -- --watch=false
cd frontend && npx ng test --include "src/app/Services/api.service.spec.ts" --watch=false
```

## Backend (Vitest)

- `*.spec.ts` files sit next to the code they test (`services/`, `controllers/`, `helpers/`, `middleware/`, `utils/`, `testing/`, `schemas/`).
- Config: `backend/vitest.config.ts`. Globals are on, `fileParallelism` is off, and `@seed-test/shared` resolves to `shared/src`.
- Target: `node` (no DOM).
- Mock pattern: `vi.hoisted()` + `vi.mock()` for all database and service mocks. Plain hoisting breaks on ESM with TDZ errors.

```typescript
// Standard pattern: vi.hoisted() + vi.mock() for ESM-compatible mocks
const { mockDb, mockedService } = vi.hoisted(() => ({
  mockDb: { collection: vi.fn() },
  mockedService: { someMethod: vi.fn() }
}));

vi.mock('../database/DbConnector.js', () => ({
  getConnection: vi.fn(() => mockDb)
}));

import * as myService from './my.service.js';

// Controller test helpers: createReq() / createRes()
function createReq(overrides = {}) {
  return { body: {}, params: {}, user: { _id: 'userId' }, ...overrides };
}
```

## Frontend (Vitest via Angular)

- Runner: the `test` target of `frontend/angular.json` (`@angular/build:unit-test`). There is no separate Vitest config file.
- Always run specs through `ng test` (or `npm test`), never `npx vitest` directly. The Angular wrapper injects the globals and test setup; plain Vitest fails with `describe is not defined`.
- Watch mode: `npm run test-watch`.

## Integration tests (Testcontainers)

Integration tests run against an isolated MongoDB in a container instead of the mocked `DbConnector`. Unit tests cannot catch query-shape errors, ObjectId coercion errors, index usage, or cascade behavior, so these tests cover that gap.

- Files: `backend/src/integration/*.itest.ts`. Shared setup is in `backend/src/integration/setup.ts`. Config: `backend/vitest.integration.config.ts` (`fileParallelism: false`, so each file gets its own container).
- Each file starts a `mongo:8` container running as a replica set (`rs0`), so MongoDB transactions work. The container uses a random host port and is removed by the Testcontainers Ryuk sidecar. No `docker compose up` is needed.
- Prerequisite: a running Docker-API-compatible runtime; setup is in the root `AGENTS.md` Environment section. Without a running daemon the suite skips with a message saying so.
- Isolation: `beforeAll` starts the container and client, `afterAll` stops them, and `beforeEach` clears the collections the file touches. `DbConnector.ts` is not changed for this layer; each test file creates its own `MongoClient`.
- Fixture rule: the owner is never in a workgroup's `Members`. `transferOwnership()` and `promoteNewOwner()` remove the new owner from `Members`, and `addMember()` rejects duplicates. Seed realistic ownership-transfer fixtures with a real second member.

## Lint

Backend and frontend must finish with 0 errors and 0 warnings. The backend ESLint config relaxes some `no-unsafe-*` rules for `src/testing/test-runners/**/*.ts`; the rationale is in `backend/eslint.config.mjs`.

## Playwright MCP — Browser-based E2E testing via Agent

The Playwright MCP (`@playwright/mcp`) is configured in the local, gitignored `opencode.jsonc` and lets agent sessions control a real Chromium browser. This is **not** a test framework; it is a tool for agents to verify UI changes interactively.

### How agents use Playwright MCP

Agents automatically have `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_screenshot` etc. available whenever the MCP server is running. No special import is needed; describe what to do.

### Typical testing workflow

```
1. Start stack:  docker compose up -d (or podman equivalent)
2. In agent prompt: "Use Playwright MCP to open http://localhost:4200/login,
   log in with seed@test.de / seedtest, and verify X"
3. Agent navigates, fills forms, clicks, takes screenshots
4. Agent reports what worked/didn't
```

`seed@test.de` / `seedtest` is the demo login of the demo image and compose stack.

### Known working patterns

| Action | How agents did it | Notes |
|---|---|---|
| Login | `browser_navigate` → fill email+password → click submit → wait for redirect | Works reliably |
| Story numbering | Open project → read story titles → check numbers are unique | Check numbering after reorder |
| Group creation | Click groups tab → create group → verify in UI | Verify the group appears after reload |
| Screenshots | `browser_screenshot` | Saves to MCP temp directory |

### When Playwright MCP fails

- **Container runtime not running**: start it as described in the root `AGENTS.md` Environment section.
- **App not compiled**: Run `npm run build` in `frontend/` and restart the server, or wait for the Docker rebuild.
- **MCP not configured**: Must be listed in the `mcp` section of `opencode.jsonc`.

### Limitations

- No `@playwright/test` assertion library — agents assert manually via DOM inspection.
- Headless by default — agents can set `headless: false` for debugging.
- One browser session per MCP connection; state (cookies, localStorage) persists until disconnect.

### Agent discipline — port hygiene

If an agent starts a local dev server (`ng serve`, `npm run dev`, etc.) for testing, it **must shut it down** afterwards. Never leave a process occupying ports 4200 or 8080; those belong to the user's running instance. Stop only the process you started (by PID), never every `node` process.

## Agent operational notes

### Frontend rebuild cycle

`node server.js` (in `frontend/`) serves the last built bundle from `dist/cucumber-frontend/browser` and does not hot-reload. After any Angular source change: `npm run build`, restart `server.js`, then test.

### Running frontend tests — use `ng test`, NOT `vitest` directly

```bash
# CORRECT — the Angular CLI wrapper sets up globals and the JSDOM-based test environment
cd frontend && npx ng test --include "src/app/login/login.component.spec.ts" --watch=false

# WRONG — fails with "describe is not defined" because vitest globals are not injected
cd frontend && npx vitest run src/app/login/login.component.spec.ts
```

### CI

The test pipeline is `.github/workflows/CI_Tests_and_Report.yaml`; read it there rather than copying its steps here.
