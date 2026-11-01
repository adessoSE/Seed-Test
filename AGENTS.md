# Seed-Test — Agent Instructions

Monorepo (npm workspaces): `backend/` (Express 5, TypeScript, raw MongoDB driver), `frontend/` (Angular, zoneless), `shared/` (Zod schemas and TypeScript models, imported as `@seed-test/shared/...`). Root `package.json` has no scripts; run commands inside the package directory.

## Reference by trigger
- `CONTEXT.md`: domain terms (`storySource`, `issue_number`, reorder). Read before changing story numbering or source logic.
- `docs/adr/`: recorded decisions. Read before changing a rule an ADR covers.
- `backend/AGENTS.md`: editing `backend/`. Layering, Zod validation, rate limits, test runners.
- `frontend/AGENTS.md`: editing `frontend/`. Signals, zoneless change detection, lint.
- `docs/api-reference.md`: adding, changing, or calling an `/api` route.
- `docs/shared-models.md`: changing a model or schema in `shared/`.
- `docs/testing.md`: writing tests for Seed-Test itself, or Playwright MCP browser checks (`#playwright-mcp--browser-based-e2e-testing-via-agent`).
- `docs/test-execution.md`: changing the product test engine in `backend/src/testing/`.
- `tasks/README.md`: only when the user names a task file.

## Find code with the graph first
- Definitions, callers, data flow, change impact: codebase-memory-mcp, project `SeedTest`. Run `search_graph`, then `trace_path` or `get_code_snippet`. Load deferred tools with ToolSearch query `+codebase-memory`. Grep for a symbol misses callers across `backend`, `frontend`, and `shared`.
- Before deleting "dead" code, also grep the symbol name: `trace_path` does not resolve namespace-import calls (`userService.fn()`, `this.apiService.fn()`) or HTTP routes, so zero graph callers is not proof.
- Literal text, config, and non-code files: Grep and Glob.
- Angular work: angular-cli MCP. Run `list_projects`, then `get_best_practices`, then `search_documentation`.
- Third-party library APIs: Context7 (`resolve-library-id`, then `query-docs`).
- Pass these rules to any subagent you spawn.

## Workflow and orchestration
- Bugs: `tdd` skill (failing regression spec first, then the fix). Reviews: `code-review` skill, run the Standards and Spec axes separately. Writing agent documents (this file, skills): `writing-for-agents` skill.
- Opus orchestrates and dispatches; Haiku workers do the scoped work. Each worker gets an explicit file scope and must not touch files outside it.

## Commands
| Goal | Command |
|---|---|
| Install all workspaces | `npm install` at repo root |
| Build shared (before tsc, start, or frontend build) | `cd shared && npm run build` |
| Backend unit tests | `cd backend && npm test` |
| One backend spec | `cd backend && npx vitest run src/services/repository.service.spec.ts` |
| Backend integration (container runtime must run, see Environment) | `cd backend && npm run test:integration` |
| Backend lint / typecheck | `cd backend && npm run lint` / `npm run tsc` |
| Create collections and stepTypes (needs backend/.env) | `cd backend && npm run database` |
| Run backend | `cd backend && npm start` |
| Frontend unit tests | `cd frontend && npm test -- --watch=false` |
| One frontend spec | `cd frontend && npx ng test --include "src/app/login/login.component.spec.ts" --watch=false` |
| Frontend lint / production build | `cd frontend && npm run lint` / `npm run build` |
| Run frontend | `cd frontend && npm run build && node server.js` (serves `dist/cucumber-frontend/browser`, no hot reload) |
| Product Cucumber run | `cd backend && npm run exec-test` |

Gotchas:
- `backend/tsconfig.json` and `frontend/tsconfig.json` map `@seed-test/shared` to `shared/dist`. Build shared after any change under `shared/src`. Vitest maps to `shared/src` and needs no build.
- Frontend specs run through `ng test`, not `vitest` directly. Direct vitest lacks the Angular test globals.
- Backend `npm install` runs `playwright install --with-deps` (postinstall). The server only checks browsers at startup and never installs them; the backend image installs them at build time.

## Environment
- Node: `^22.22.3 || ^24.15.0 || ^26.0.0` (backend and frontend `engines`). All Dockerfiles use Node 22.
- `backend/.env` (gitignored; template `backend/.env.example`). Validated by `backend/src/config.ts`. Required: `DATABASE_URI`, `ENCRYPTION_SECRET` (64 hex chars), `JIRA_SECRET`, `JIRA_SALT`. `SESSION_SECRET` is required unless `NODE_ENV` is `development` or `test` (an unset `NODE_ENV` counts as production). The backend image sets `NODE_ENV=production`; the compose files set `COOKIE_SECURE=false` and `TRUST_PROXY=false` because they serve plain HTTP without a reverse proxy.
- `frontend/.env` (gitignored; template `frontend/.env.example`). Key: `API_SERVER`, default `http://localhost:8080/api`.
- `docker-compose.yml` starts MongoDB under host `seedmongodb`, which resolves only inside the compose network. All compose files run MongoDB as a single-node replica set `rs0` (keyFile generated at container start, `rs.initiate` in the healthcheck), so transactions work; the backend URI carries `?replicaSet=rs0`. From the host, connect with `?directConnection=true`. The backend still falls back to non-transactional writes on a standalone server. Its secrets are demo values; never reuse them. The backend service needs `ENCRYPTION_SECRET`, which compose reads from the root `.env`.
- Container runtime: integration tests and `docker compose` need a Docker-API-compatible runtime. The team uses Podman: run `podman machine start`. `docker` and `docker compose` commands also work through Podman (`podman` and `podman compose`). Gotcha: if `podman machine start` reports that API forwarding failed (win-sshproxy), run `podman machine stop`, delete `%TEMP%\podman\podman-machine-default-api.sock`, then start the machine again.
- Dev ports: frontend 4200, backend 8080.

## Code comments (required)
- Keep every existing comment when editing code. Do not remove comments.
- Comment business-logic branches (prefix each with `// CASE 1: ...`), async flow control (effects, signal chains, `firstValueFrom`), non-obvious constraints and their consequences, workarounds, and integration points (Jira, Xray, MongoDB).
- JSDoc every exported function, class, and interface: purpose, parameters, return value, side effects. Omit types TypeScript already states.
- Explain WHY, not WHAT. Warn about consequences: `// Irreversible — deletes all associated reports`.
- Place single-line `//` comments above the line they describe.
- Use `// TODO:` for planned work and `// FIXME:` for known breakage.
- Write English only for comments, JSDoc, `.md` files, and commit messages.
- Do not leave commented-out code, changelog comments (`// added 2026-…`), or comments that restate code (`// increment counter`).

## Conventions tooling does not enforce
- Backend mocks: `vi.hoisted()` plus `vi.mock()`. ESM-safe; avoids TDZ errors. Controller tests use `createReq()` and `createRes()`.
- Every new mutating route gets a Zod schema in `shared/src/schemas/` and the `validate()` middleware from `backend/src/middleware/validate.ts`.
- Database access uses the raw `mongodb` driver through `db.collection<T>(name)`, with collection names as constants.
- Controllers are async `(req, res, next)` and forward errors with `next(error)`.
- Lint must finish with 0 errors and 0 warnings in both packages.

## Git and files
- Commit only source, tests, and docs. Check the staged diff for secrets before every commit. Never commit `.env` or tokens.
- Write scratch output (logs, screenshots, scripts, temp dumps) to `workers/scratch/`. `workers/` and `tasks/` are gitignored local tracking.
- Feature branches target `dev`. Docker images build when a GitHub release named `Seed-Test_v*` is published (`.github/workflows/Build_and_Publish_Images.yaml`).
- Commit messages follow the existing style in `git log` (Conventional Commits, English).

## Ports
- Stop any dev server you started on ports 4200 or 8080 before finishing. Those ports belong to the user's running instance.
