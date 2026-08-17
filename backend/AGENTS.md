# Seed-Test backend — Agent Instructions

Express/TypeScript. Project-wide rules live in the repo root `AGENTS.md`; this file covers backend-only conventions.

## Layering
Strict `routes/` → `controllers/` → `services/` separation, with Zod schemas in `schemas/`. No business logic in routes or controllers.

## Input validation
All mutating routes use Zod schemas in `schemas/*.ts` via `validate()` middleware (`middleware/validate.ts`). The middleware validates `req.body`, replaces it with parsed output (stripping unknown keys), and returns 400 with field-level errors on failure. Shared domain schemas (`StepType`, `StepDefinition`, `MultipleScenario`) are in `schemas/shared.schemas.ts`. When adding new endpoints, always create a matching schema.

## Rate limiting
Global limiter (100 req/min/IP) on all `/api` routes. Auth routes (`login`, `register`, `resetpassword`, `reset`) have a stricter limiter (20 req/15min). Log endpoint has its own limiter (60 req/min).

## Test runners
Playwright (`@playwright/test`) and Selenium-Webdriver are both available in `src/test-runners/`. Mode is selected via a request parameter.

Shared models are imported via the `@seed-test/shared` aliases.
