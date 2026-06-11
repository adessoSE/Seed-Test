# Repo-Qualitätssicherung — Tests

Seed-Test ist eine Low-Code-WebApp zum Generieren von Browser-Automation-Tests. Diese Seite dokumentiert, wie **das Tool selbst** getestet wird.

## Tests ausführen

```bash
# Backend — Vitest Unit-Tests
cd backend && npm test              # alle Tests
npm run test-coverage               # mit Coverage-Report

# Frontend — Jest Unit-Tests
cd frontend && npm test             # alle Tests
npm run test-coverage               # mit Coverage-Report

# Zusammen (wird auch in CI verwendet):
npm test (in backend/ und frontend/ einzeln)
```

## Backend (Vitest)

- `*.spec.ts` Dateien liegen **neben der zu testenden Logik** in `backend/src/services/`
- Vitest ist global konfiguriert: `describe`, `it`, `expect` benötigen keine Imports
- `@shared` alias → `backend/src/shared/src/` (konfiguriert in `vitest.config.ts`)
- Target ist `node`, nicht DOM
- Konfig: `backend/vitest.config.ts` mit `@shared` Path-Alias

```typescript
// Beispiel: backend/src/services/*.spec.ts
import { describe, it, expect } from 'vitest';
import { someService } from './some.service';

describe('Service', () => {
  it('sollte X tun', () => {
    expect(someService()).toBe(expected);
  });
});
```

## Frontend (Jest)

- Jest mit `jest-preset-angular` für Angular 20
- läuft in `jsdom` (nicht echte Browser)
- Benötigt `jest-canvas-mock` Polyfill
- Konfig: `frontend/jest.config.ts`

```bash
# Einzelen Test:
npm test -- --testPathPattern=service-name.spec.ts

# Watch mode:
npm test -- --watch
```

## CI-Tests

GitHub Actions CI (`CI_Tests_and_Report.yaml`) läuft:
1. Docker Stack Build mit `docker-test.yml` (Node 20/22/24 Matrix)
2. `docker exec Seed-backend npm test`
3. `docker exec Seed-frontend npm test`
4. Sanity Check: POST login → `/api/sanity/test/$REPO_ID/$GROUP_ID`
5. Teams-Report via Microsoft Teams Webhook

## SonarCloud

- Frontend-Only: Project key `adessoAG_Seed-Test`
- Test Inclusions: `**/*.spec.ts`
- Report: `frontend/coverage/lcov.info`
