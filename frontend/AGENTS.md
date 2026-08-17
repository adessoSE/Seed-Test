# Seed-Test frontend — Agent Instructions

Angular 22. Project-wide rules live in the repo root `AGENTS.md`; this file covers frontend-only conventions.

## Angular Signals + Zoneless
The frontend runs **zoneless** (`provideZonelessChangeDetection()` in `app.module.ts`, `zone.js` fully removed). All state management uses Angular Signals:

- **Service state**: `signal()` — no EventEmitters or BehaviorSubjects. Action triggers use `signal(0)` with `.update(n => n + 1)`.
- **Derived state**: `computed()` for read-only derivations, `linkedSignal()` for writable derived signals that reset when source changes.
- **Side effects**: `effect()` for reacting to signal changes. Use `untracked()` for async work inside effects.
- **RxJS bridge**: `toSignal()` from `@angular/core/rxjs-interop` for route params and FormControl.valueChanges. HTTP calls remain as Observables with `firstValueFrom()` for one-shot reads.
- **No subscribe for state**: Components never `.subscribe()` to set state — use `signal.set()` within `effect()` or `firstValueFrom()` async handlers.
- **No ngOnDestroy for cleanup**: Signals and effects auto-clean on component destroy — no manual `Subscription.unsubscribe()` needed.
- **Templates**: Signal reads use function call syntax: `isDark()`, `stories()`, `blocks()`.

Shared models are imported via the `@seed-test/shared` aliases.
