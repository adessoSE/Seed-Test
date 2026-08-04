# Backend Architecture

## Scope

This document describes the Seed-Test API backend after the Strict-Typing Initiative (August 2026).

For project overview, CI, Docker, setup, commands, code comments, and ESLint rules see `root/AGENTS.md`.
For layering, input validation, rate limiting, and test runners in brief see `backend/AGENTS.md`.

## Design Principles

Three rules govern every change to the backend:

1. **Requests flow through exactly one path**: `route → validate → controller → service → DB`. No shortcuts. No business logic in routes or controllers.
2. **All external input is untrusted** — every mutating request is validated against a Zod schema that strips unknown keys. Every query parameter is checked for MongoDB operator injection.
3. **Types are first-class** — zero `any` in the entire production codebase. Domain types are collected in `src/types/` by responsibility.

## Request Pipeline

### Global Middleware Stack

Every request to `/api/*` passes through this fixed sequence in `server.ts`:

```
helmet()
  → cors()
  → express.json({ limit: '500kb' })
  → express.urlencoded({ limit: '500kb', extended: true })
  → sanitize(req.body, req.params) + reject dangerous query params
  → session (MongoStore)
  → passport.initialize()
  → passport.session()
  → httpLog (Winston)
  → globalLimiter (100 req/min per IP on all /api/*)
  → router dispatch
```

The global middleware chain then hands off to registered routers. Per-router auth and input validation is applied after the global chain.

### Per-Route Stack Pattern

Every private endpoint follows this pattern:

```
route → isAuthenticated → [rateLimiter] → validate(schema) → controller → [authorize*]
```

`validate()` is a factory function that wraps a Zod schema. On success it **replaces** `req.body` with the parsed result (strip-unknown-keys semantics). On failure it returns 400 with field-level error details. Controllers and services always receive a safely-typed body — `any` never escapes the schema layer.

### Authorization Patterns

Authorization is not baked into `isAuthenticated` (which only checks session validity). Instead, the `authorize.ts` module provides composable guards that resolve a resource to its repository and check ownership or workgroup membership:

| Guard | Resolution Path | Purpose |
|-------|-----------------|---------|
| `authorizeRepo(id, opts)` | URL param → repository | Read/write ownership + workgroup membership |
| `authorizeByStory(id, opts)` | Story ID → parent repository | Same, but resource is identified indirectly |
| `authorizeByReport(id, opts)` | Report doc → storyId → repository | Report-level access (handles 3 report types) |
| `authorizeByIssueKey(id)` | Jira/GitHub issue key → story → repository | External system lookup |

All guards share the same logic: owner → always allowed; workgroup member → allowed with optional `requireEdit` flag; non-member → 403.

### Rate Limiting Strategy

- **Global**: 100 req/min per IP on all `/api/*` routes (anti-abuse)
- **Auth routes** (`login`, `register`, `resetpassword`, `reset`): 20 req/15min per IP (brute-force protection)
- **Log endpoint** (`/api/log`): 60 req/min per IP (prevent log flooding)

Auth rate limiters are defined **inside** `user.routes.ts` and applied per-route — not globally — because only specific routes need strict limiting.

## Layered Structure

The backend enforces a strict 4-layer separation. Dependencies only flow inward: `routes → controllers → services → database`.

### `routes/` — URL registration only

Express Router instances. Their sole responsibility is: register routes, wire middleware in declaration order, export a single `default` router. Zero business logic. They import controllers and middleware by reference — never by calling service functions directly.

There are 16 domain routes (`background`, `block`, `file`, `github`, `group`, `jira`, `logging`, `playwright`, `report`, `repository`, `sanity`, `script`, `story`, `testExecution`, `user`, `workgroup`) plus the monolithic `sanity` route. All mounted under `/api/` in `server.ts`.

### `controllers/` — HTTP request/response

Thin handlers. They receive typed request objects (body already parsed by `validate()`), call exactly one service function, and return a JSON response with the correct status code. Controllers never query MongoDB directly. They forward all errors to Express's error handler via `next(error)`.

### `services/` — business logic

The only layer that queries MongoDB directly via `DbConnector.getConnection()`. This layer contains all domain logic: repository CRUD, story management, encryption/decryption, feature-file generation, external API calls (Jira, XRay, GitHub), and test execution orchestration.

Services never receive Express `Request`/`Response` objects. They receive plain data and return plain data. This makes them fully testable without mocking HTTP — or the database.

### `schemas/` — input contracts

Zod v4 object schemas that serve as the single source of truth for input validation. Each schema file corresponds to a domain feature (e.g. `story.schemas.ts`). Shared domain schemas (`StepType`, `StepDefinition`, `MultipleScenario`) live in `shared.schemas.ts`.

Schemas follow a naming convention: `createXxxSchema`, `updateXxxSchema`, `xxxIdSchema`. Named exports only — no default exports. The `validate()` middleware factory is consumed by routes, not services.

## Shared Models & Type System

The `@shared` package (aliased via `@shared` in `tsconfig.json`) contains domain models shared between frontend and backend: `Story`, `Block`, `Scenario`, `StepType`, `Repository`, `User`, etc. Backend services import these — never define their own — ensuring frontend and backend always agree on the domain shape.

MongoDB-specific types (`.Doc` variants with `ObjectId`) live in `src/types/mongo.types.ts` as a separate layer. `oid()` in `utils/validation.ts` converts string IDs to `ObjectId` safely.

## Encryption Architecture

Two distinct encryption schemes serve different purposes:

### AES-256-GCM (cryptoHelper.ts)

Used by `ai.service.ts` to encrypt/decrypt API keys stored in repository documents. GCM mode provides both confidentiality and integrity (authentication tag). Output format is `nonce:encrypted:authTag` (all hex). `decrypt()` returns `null` on tampered data — never throws.

Derived from `ENCRYPTION_SECRET` (64-char hex, validated at startup by `config.ts`).

### AES-256-CCM (externalAccount.service.ts)

Used by Jira integration. Key derived via `scrypt()` from `JIRA_SECRET` + `JIRA_SALT` (both validated at startup). Used in `externalSync.service.ts` and `xray.service.ts` to decrypt user credentials before API calls.

### Configuration Validation

`config.ts` uses a Zod schema to validate every environment variable at startup. It aggregates **all** validation errors — not just the first — producing a clear startup error message. Missing required variables cause `process.exit(1)`. `SESSION_SECRET` is only required in production (`NODE_ENV=production`).

All validated config values are cached in `validatedConfig.value` on first access. Dependent modules (`cryptoHelper`, `externalAccount`) access it via a lazy getter — reading the value triggers automatic validation if it hasn't run yet.

### Key Dependency Chain

```
config.ts validateConfig()
  → validatedConfig.value
    → cryptoHelper.ts → ENCRYPTION_SECRET
    → externalAccount.service.ts → JIRA_SECRET, JIRA_SALT
      → xray.service.ts, externalSync.service.ts
```

## Database Access Pattern

### Connection Management

`DbConnector.ts` implements a module-level singleton. `establishConnection()` creates a `MongoClient` with `maxPoolSize: 20` and stores both the `Db` instance and the raw `client` for lifecycle management (graceful shutdown in `server.ts`).

Services access the database via `getConnection()`, which returns the singleton `Db` instance. Every service call is synchronous — `getConnection()` is a simple getter. Async work happens in the calling service function.

### Transactions

Used in `import-export.service.ts` (re-import) and `block.service.ts` (atomic creation). Requires the database to be a ReplicaSet (rs0). Integration tests use Testcontainers with `mongo:8` configured as rs0 for full transaction support.

Collections are hardcoded as string literals in service files (e.g. `const customBlocksCollection = 'CustomBlocks'`). No centralized collection registry — but consistency is maintained via the `COLLECTIONS` const in integration test setup.

## Domain Services

Services added after the `serverRouter/` removal are grouped by their external integration surface:

### Test Execution Domain

**`test-runner.service.ts`** (in `testing/`): Orchestrates Cucumber-based test execution. Accepts a feature file path, browser preference, and mode (scenario/feature/group), then spawns Cucumber with the appropriate world (Playwright or Selenium). Produces JSON reports consumed by `report.service.ts`.

**`feature-file.service.ts`**: Generates Gherkin feature files from story/block data structures. Also parses feature file ZIPs for import. Uses `AdmZip` for archive operations.

**`report.service.ts`**: Manages test reports. Creates HTML reports via `cucumber-html-reporter`. Enforces `MAX_SAVED_REPORTS` and `REPORT_DELETATION_TIME` limits. Stores reports in MongoDB, handles three report types (StoryReport, ScenarioReport, GroupReport).

### External Integration Domain

**`externalSync.service.ts`**: Bidirectional sync between Jira, XRay, GitHub, and the database. Resolves external issue keys to internal story IDs, creates stories from external metadata, pushes feature files to Jira XRay.

**`xray.service.ts`**: XRay REST API client (`/rest/raven/1.0/api/`). Creates/deletes test steps, records test runs, fetches run summaries.

**`ai.service.ts`**: AI-driven test scenario generation. Dynamically imports `@seed-test/ai-parser` (optional module). Uses `JobQueue` for async processing. Decrypts stored API keys from repository documents, calls the parser, persists suggestions as story-level data.

### Collaboration Domain

**`workgroup.service.ts`**: Repository-level collaboration. Defines workgroups with an owner and members (with `canEdit` flag). Integrates tightly with `authorizeRepo()` middleware for granular access control.

**`import-export.service.ts`**: Full project export (ZIP of stories, blocks, groups, repository) and re-import with transactional ID-mapping to preserve cross-references.

### Core Domain

**`story.service.ts`, `repository.service.ts`, `block.service.ts`, `user.service.ts`**: Core CRUD operations for the primary domain entities. These services grew organically from the old `serverRouter/` architecture and follow the same pattern: each function performs a single MongoDB operation or composes a small number of operations.

**`step-type.service.ts`**: Fetches step type definitions from the database. Only one function (`showSteptypes`) — reflects the domain's simplicity. StepTypes are seeded via `database/stepTypes.ts` and managed by the frontend.

**`file.service.ts`**: Handles file uploads and storage. Uses MongoDB GridFS for binary data. Provides download endpoints for test assets.

**`sanity.service.ts` / `sanity.controller.ts`**: Health and sanity check endpoints. Used by CI pipeline to verify system readiness. The `/api/sanity/test/$REPO_ID/$GROUP_ID` endpoint executes a minimal story against a repository to confirm the system is operational.

**`github.service.ts` / `jira.service.ts`**: Controller layers for GitHub and Jira integration. Defer to `externalSync.service.ts` and `xray.service.ts` for actual API calls. Handle OAuth callback routing and credential storage.

## Testing Strategy

### Unit Tests (Vitest)

689 tests across 45 spec files in the backend. Every service, controller, middleware, helper, schema, and utility has a colocated `.spec.ts` file.

**Mocking Pattern**: `vi.hoisted()` + `vi.mock()` for ESM-safe mocking. The database (`DbConnector.js`) is the primary mock target — services are tested with a mock `Db` returning predictable documents. Controllers are tested with `createReq()`/`createRes()` helpers rather than full supertest fixtures.

Service unit tests mock `DbConnector.getConnection()` to return a pre-configured mock DB. This keeps tests fast (no Docker required) while exercising actual service logic.

### Integration Tests (Testcontainers)

Three integration test files in `src/integration/` that run against a real MongoDB instance started by Testcontainers.

**Setup Pattern**: Each test file calls `createClient()` (or `tryCreateClient()` for graceful skip) in its own `beforeAll`, then uses the returned `{client, db, container}` to seed test data and exercise the middleware chain against real databases.

The critical redirect trick: `vi.mock('../database/DbConnector.js')` in each test file returns the Testcontainers database handle from `getConnection()`. Since all production services call `getConnection()` internally (never receive a `Db` directly), this single mock redirects the entire application to the test database without touching production code.

**MongoDB Container**: Runs `mongo:8` on a random mapped host port. Configured as ReplicaSet (rs0) to enable transactions. Database name is `'Seed'` — the only concern: if a test accidentally uses `MongoClient.connect()` directly instead of `getConnection()`, it could connect to the real database. However, `createClient()` uses `directConnection=true` with an explicit host:port, making accidental overlap impossible.

**Skip Strategy**: `tryCreateClient()` wraps `createClient()` in try/catch. Returns `null` if Docker is unavailable. Tests check for null and skip early (via `it.skip` or guard clause in `beforeAll`). A clear `SKIP_MESSAGE` explains the requirement.

### End-to-End Tests (Cucumber)

`npm run exec-test` runs `.feature` files through Cucumber with Playwright or Selenium step definitions. Produces structured JSON reports. Used for CI verification and manual test execution. The runner service (`testing/test-runner.service.ts`) manages browser selection, window size, and emulator configuration.

## Adding a New Endpoint (Workflow)

The pattern for adding a new API endpoint follows the layer discipline:

1. **Schema** in `schemas/`: Define the Zod schema (e.g. `createItemSchema`, `updateItemSchema`). Use named exports.
2. **Service** in `services/`: Implement the business logic. Receive plain data, return plain data. Use `AppError` for domain errors.
3. **Controller** in `controllers/`: Thin wrapper — call service, set status code, return JSON.
4. **Route** in `routes/`: Register the route with middleware chain: `isAuthenticated → validate(schema) → controller`. Add per-route rate limiter if auth-sensitive.
5. **Unit test**: Colocated `.spec.ts` with `vi.hoisted()` + `vi.mock()` in a `vi.hoisted()` block.
6. **Integration test**: `*.itest.ts` in `integration/` — seed data via `setup.ts` helpers, `tryCreateClient()`, mock `DbConnector`.

## Strict-Typing Results

- **0 ESLint errors** across all `src/` files
- **~306 warnings** — all in `src/testing/` (Selenium WebDriver and Cucumber lack TypeScript declarations)
- `no-unsafe-*` rules are all `error` level except `no-unsafe-member-access` (`warn`, ~122 warnings in untyped testing files)
- Zero `any` types in production code (`services/`, `controllers/`, `routes/`, `middleware/`)
- Type domains are organized in `src/types/` by concern: XRay API types, Cucumber report types, Jira/GitHub sync types, database `.Doc` types, and vendor declarations