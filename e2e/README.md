# Seed-Test E2E suite

Playwright suite that walks through the core UI of Seed-Test against a running local stack and checks the persisted state through the API.

## Prerequisites

- The stack runs locally: frontend on http://localhost:4200 (`cd frontend && npm start` or the dev server), backend on http://localhost:8080/api (`cd backend && npm start`).
- A local MongoDB replica set that the backend's `DATABASE_URI` points to. Never run the suite against MongoDB Atlas or any shared database: the suite creates and deletes users and projects.
- Chromium for Playwright: `cd e2e && npx playwright install chromium` (once).
- Install dependencies once at the repo root: `npm install`.

## Running

```
cd e2e
npm test                                  # all specs
npx playwright test specs/smoke.spec.ts   # one spec
npm run test:headed                       # watch the browser
npm run report                            # open the last HTML report
```

Environment overrides: `E2E_BASE_URL` (default http://localhost:4200), `E2E_API_URL` (default http://localhost:8080/api).

## Rate limits

Login, register, password reset and reset share the `authLimiter` in `backend/src/routes/user.routes.ts`. Global setup logs in once and stores the session in `.auth/user.json`, which is reused for six hours. Specs must not perform extra auth requests (only the auth spec may, at most six).

## How the fixtures work

Import `test` and `expect` from `fixtures.ts`:

- `api`: `APIRequestContext` with the session cookie of the shared test user, for arrange and assert calls.
- `page`: page with the backend info seeded in localStorage and `runtimeErrors` collected.
- `runtimeErrors`: messages from uncaught page errors and console errors of the app and backend origins.
- `project`: a db project created through the API, selected in the UI through localStorage, deleted after the test.

`fixtures-data/` holds the import sample (`SeedE2EImport.zip`, `apiKey` removed) and the old-format stories (`seed-stories.json`).

## Adding a spec

1. Add `specs/<area>.spec.ts` and import from `../fixtures`.
2. Arrange through `api` and the helpers in `helpers/api.ts`, act in the UI through a page object in `pages/`, and assert in the UI and through the API.
3. Clean up what the test creates; `project` already cleans up its own project.
4. Run the spec twice in a row to rule out flakiness.
