# Seed-Test — Agent Instructions

## Repo context
GitHub: `adessoSE/Seed-Test` (wiki/docs at `adessoAG/Seed-Test`). Open-source BDD UI-testing platform. Released v1.8.1 on `master`, dev branch targets v2.0.0.

**API reference**: `docs/api-reference.md` (complete endpoint inventory)
**Shared models**: `docs/shared-models.md` (all schema types + frontend copies)
**Repo testing**: `docs/testing.md` (Vitest — backend + frontend)
**Test execution engine**: `docs/test-execution.md` (Cucumber/Playwright/Selenium product feature)
**Playwright MCP testing**: `docs/testing.md#playwright-mcp--browser-based-e2e-testing-via-agent` (agent-driven browser tests)

## Agent Tooling
- **Codebase Memory (required first step for code discovery)**: Finding a definition, its callers, data flow, or the impact of a change MUST start with the `codebase-memory-mcp` graph (project `SeedTest`): `search_graph` → `trace_path` / `get_code_snippet`. Grep/Glob are for literal text, configs, and non-code files only — grepping for a symbol misses callers across `backend`/`frontend`/`shared`. If the tools appear only as deferred names, load them via ToolSearch (`+codebase-memory`) rather than falling back to Grep. Pass this instruction on to subagents you spawn.
- **Angular CLI MCP**: For Angular work, call `list_projects` first, `get_best_practices` before implementation, and use `search_documentation` for Angular APIs. Verify with the Angular build/test target when available.
- **Context7**: Use for current third-party library documentation and APIs.

Package-specific conventions: `backend/AGENTS.md` (layering, Zod validation, rate limiting, test runners) and `frontend/AGENTS.md` (Signals/zoneless, lint, SonarCloud) — each loads automatically when working in that package. Shared models are imported via the `@seed-test/shared` aliases.

- **Database**: MongoDB. Default connection in `docker-compose.yml`: `mongodb://SeedAdmin:SeedTest@seedmongodb:27017`
- **Frontend dev**: `http://localhost:4200/login`
- **Backend API**: `http://localhost:8080/api`

## Quick setup
```bash
# Docker (recommended — spins up mongo, backend, frontend)
cd /c/SeedTest && docker compose up -d

# Local install (Node 22/24/26)
npm install            # root package-lock.json does nothing
cd backend && npm install
cd ../frontend && npm install
# Create .env in /backend and /frontend from their .env.example files
cd ../backend && npm run database   # creates Collections + stepTypes
```

## Docker
- **Demo image**: `docker run -p 4200:4200 -p 8080:8080 seedtest/seed-test-demo:latest`
  - Default login: `seed@test.de` / `seedtest`

## Environment & config
- Backend needs `.env` in `/backend` with at least `DATABASE_URI`, `SESSION_SECRET`, `JIRA_SECRET`, `JIRA_SALT`
  - **Also required**: `ENCRYPTION_SECRET` — 64-char hex string (used by `cryptoHelper.ts` for AES-256-GCM)
- Frontend needs `.env` in `/frontend` with `API_SERVER` (default `http://localhost:8080/api`)
- Docker compose embeds env vars directly in `docker-compose.yml`
- **Default secrets in compose are not secure**: `SESSION_SECRET=secretSessionKey`, `JIRA_SECRET=secretJiraKey`, `JIRA_SALT=BJ1yJTJ7AFql`

## Testing & branch conventions
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

### Language
- **English only** for all code comments, JSDoc, documentation files (`.md`), and commit messages
- Every long-lived `.md` file must be written in English to keep the project accessible to international contributors
- German is acceptable only for ephemeral notes (task lists, working drafts) that will be deleted once resolved

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
`backend/eslint.config.mjs` (ESLint 10, type-aware strict rules) — **0 errors, 0 warnings** required. Non-default choices: **tabs**, single quotes, `curly: multi`.

## Files/gitignore
Always gitignore: `.feature`, `reporting_*`, `dist/`, `node_modules/`, `.env`, `tsconfig.tsbuildinfo`, `coverage/`, `logs/`, `*.bat`, `*.sh`

### Ephemeral agent output → `workers/scratch/` (git-ignored, never committed)
Agents and subagents MUST keep every throwaway file out of the repo tree and out of git:
- Build/typecheck/dev-server logs (`build-output.txt`, `tsc-output.txt`, `*.log`), scratch scripts (`*.mjs`, `.py`, `.ps1`), screenshots (`*.png`), temp dumps, and in-progress notes all go under **`workers/scratch/`** (already ignored via `workers/` in `.gitignore`).
- Never `git add -f` a log/scratch/temp file; never commit ephemeral output as part of a fix.
- Clean up your own scratch files when done, and a periodic sweep of `workers/scratch/` is expected (it is disposable — git has no history of it).
- Commits contain ONLY real source + tests + docs. If a report is a genuine deliverable (e.g. an audit result the user wants to keep), place it under `docs/`, not as repo-root scratch.

**Task tracking**: `tasks/tasks.md` (live board, gitignored) — `workers/` (scopes) — `tasks/` (lifecycle). See `tasks/README.md` for lifecycle rules.
