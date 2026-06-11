# Seed-Test — Agent Instructions

## Repo context
GitHub: `adessoSE/Seed-Test` (wiki/docs at `adessoAG/Seed-Test`). Open-source BDD UI-testing platform (25★, 9↙). v1.8.1 on `master`.

**API reference**: `docs/api-reference.md` (complete endpoint inventory)
**Shared models**: `docs/shared-models.md` (all schema types + frontend copies)
**Repo testing**: `docs/testing.md` (Vitest + Jest)
**Test execution engine**: `docs/test-execution.md` (Cucumber/Playwright/Selenium product feature)

## Architecture
Monorepo with 3 packages: `backend` (Express/TS), `frontend` (Angular 20), `shared` (TS models).

Backend is TypeScript — old `serverRouter/` removed; replaced by clean 3-layer architecture.

| Shared models | — | — | imported via `@shared` alias |

- **Database**: MongoDB. Default connection in `docker-compose.yml`: `mongodb://SeedAdmin:SeedTest@seedmongodb:27017`
- **Frontend dev**: `http://localhost:4200/login`
- **Backend API**: `http://localhost:8080/api`

## Backend — routes → controllers → services
Old `serverRouter/` replaced by clean 3-layer architecture:

```
routes/*.ts        → URL routing + request parsing
controllers/*.ts   → HTTP handlers (call services, return JSON)
services/*.ts      → business logic (database ops, integrations)
```

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
npm test                     # Vitest unit tests (*.spec.ts in services/)
npm run test-coverage        # Vitest with coverage
npm run exec-test            # Cucumber E2E (runs .feature files in features/)
npm run database             # initialize MongoDB collections
npm run tsc                  # TypeScript build only

# Frontend
npm test                     # Jest unit tests
npm run test-coverage        # Jest with coverage
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
- **Primary test**: `npm test` (Vitest unit `.spec.ts` + Jest frontend) — daily use
- **Cucumber E2E**: `npm run exec-test` — `.feature` → Cucumber → Playwright/Selenium → JSON report → docs/testing.md
- **Branching**: Feature branches → `dev`; `master` reserved for official release tags (triggers Docker Hub build)

## Style conventions (backend)
`backend/.eslintrc.json` extends `airbnb-base` with these overrides:
- **Tabs** for indentation (`"indent": [2, "tab"]`)
- Single quotes, semicolons required, no `comma-dangle`
- Curly braces **always required** (`"curly": ["error", "multi"]`)
- `prefer-arrow-callback` enforced
- `no-underscore-dangle`, `no-console`, `no-plusplus` all **off**
- Lint target is **only** `src/database/` — not full backend

## Files/gitignore
Always gitignore: `.feature`, `reporting_*`, `dist/`, `node_modules/`, `.env`, `tsconfig.tsbuildinfo`, `coverage/`, `logs/`, `*.bat`, `*.sh`

## SonarCloud
Frontend-only: project key `adessoAG_Seed-Test`, test inclusions `**/*.spec.ts`, report at `frontend/coverage/lcov.info`.
