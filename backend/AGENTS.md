# Seed-Test backend — Agent Instructions

Express 5 / TypeScript. Project-wide rules live in the repo root `AGENTS.md`; this file covers backend-only conventions.

## Layering
Strict `routes/` → `controllers/` → `services/` separation. Routes declare middleware and validation only; controllers translate HTTP to service calls; services hold business logic and database access. No business logic in routes or controllers.

## Input validation
Zod schemas live in `shared/src/schemas/*.schemas.ts` (not in the backend). Every mutating route applies `validate()` (`middleware/validate.ts`) with a schema from there. The middleware replaces `req.body` with the parsed output (unknown keys stripped) and returns 400 with field-level errors on failure. Domain schemas shared across features (`stepTypeSchema`, `stepDefinitionSchema`, `multipleScenarioSchema`) are in `shared/src/schemas/shared.schemas.ts`. When adding an endpoint, add its schema in the same change.

## Rate limiting
Limiter definitions are the source of truth; do not copy their numbers into docs.
- `globalLimiter` on all `/api` routes: `backend/src/server.ts`.
- `logLimiter` on `/api/log`: `backend/src/server.ts`.
- `authLimiter` on `login`, `register`, `resetpassword`, `reset`: `backend/src/routes/user.routes.ts`. Any new authentication route uses `authLimiter` too.
- Routes that verify a password (for example `POST /api/user/update/:userID`) should get their own limiter. The global limiter alone is too loose to stop password guessing.

## Test runners
`backend/src/testing/test-runners/{playwright,selenium-webdriver}`. The runner is chosen by the request body field `testRunner`; `seleniumWebdriver` is the default (`backend/src/testing/test-runner.service.ts`). Engine details: `docs/test-execution.md`.

## Shared imports
Import shared code as `@seed-test/shared` (schemas, `z`) or `@seed-test/shared/models/<Name>` (TypeScript models). The compiled `shared/dist` is what `tsc` resolves; Vitest resolves to `shared/src`. Build shared before `npm run tsc` or `npm start`.
