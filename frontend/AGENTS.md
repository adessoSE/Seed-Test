# Seed-Test frontend — Agent Instructions

Angular. Project-wide rules live in the repo root `AGENTS.md`; this file covers frontend-only conventions.

## Angular Signals + Zoneless
The frontend runs **zoneless**: `provideZonelessChangeDetection()` in `app.module.ts`, and zone.js is not loaded. All state management uses Angular Signals:

- **Service state**: `signal()` — no EventEmitters or BehaviorSubjects.
- **User actions and commands** (run, save, rename, delete, add): the service owns a `new ActionTrigger<T>()` (`Services/action-trigger.ts`) and calls `.emit(payload)`. The consumer registers `private x = onActionTrigger(service.xTrigger, payload => ...)` as a field initializer (injection context). Every emitted payload is handled once: repeated or back-to-back actions are not merged, and a consumer created later gets no replay.
- **Pure "something changed" notifications** (no payload): a `signal(0)` counter bumped with `.update(n => n + 1)`. Never keep a payload in a signal that stays set after the action: it re-fires its effect on every later state change, which can delete or re-run data.
- **Derived state**: `computed()` for read-only derivations, `linkedSignal()` for writable derived signals that reset when source changes.
- **Side effects**: `effect()` for reacting to signal changes. Use `untracked()` for async work inside effects.
- **RxJS bridge**: `toSignal()` from `@angular/core/rxjs-interop` for route params and FormControl.valueChanges. HTTP calls remain as Observables with `firstValueFrom()` for one-shot reads.
- **No subscribe for state**: Components never `.subscribe()` to set state — use `signal.set()` within `effect()` or `firstValueFrom()` async handlers.
- **No ngOnDestroy for cleanup**: Signals and effects auto-clean on component destroy — no manual `Subscription.unsubscribe()` needed.
- **Templates**: Signal reads use function call syntax: `isDark()`, `stories()`, `blocks()`.

## Style conventions
`eslint.config.mjs` — Angular ESLint with strict TypeScript rules:
- **0 errors, 0 warnings** enforced
- All components use `ChangeDetectionStrategy.OnPush`
- Directives use the `app` prefix

## SonarCloud
Config: `.sonarcloud.properties` at the repo root (project key `adessoAG_Seed-Test`, test inclusions `**/*.spec.ts`, report `frontend/coverage/lcov.info`). The workflow `.github/workflows/SonarCloud-PR.yaml` runs no tests, so the lcov report exists only when `npm run test-coverage` ran locally before the scan.
