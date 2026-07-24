# Paket 2: TypeScript Strict Mode (Backend + Frontend)

**Status:** Offen
**Abhaengigkeiten:** Paket 1 (ESLint) muss abgeschlossen sein
**Branch:** `AI-integration-prototype`

---

## Ziel

Schrittweise `strict: true` in `tsconfig.json` aktivieren. AI-Agents (Claude, Copilot) generieren mit `strict: true` signifikant besseren Code.

## Ist-Zustand

- **Backend** `tsconfig.json`: `strict` nicht gesetzt (= `false`), `target: "es2024"`, `module: "NodeNext"`
- **Frontend** `tsconfig.json`: `strict` nicht gesetzt (= `false`)
- **Shared** `tsconfig.json`: `strict: true` (bereits aktiviert)

### Backend-Zahlen (Stand Juli 2026)
| Pattern | Anzahl | Kategorie |
|---|---|---|
| `as any` Casts | 101 | ~50% MongoDB-Operators, ~25% Property-Patches, ~25% Test-Fixtures |
| `: any` Annotationen | 179 | 72x catch-Blocks, Rest verteilt |
| `as unknown as` | 27 | DB→Domain Mapping (architektonisch bedingt) |
| `!` Non-Null | 17 | Meist Tests + `_id`-Zugriffe |

## Stufenplan Backend

### Stufe 1: `catch (e: unknown)` (mechanisch, 72 Stellen)
```typescript
// Vorher
catch (e: any) {
  console.error(e.message);
}

// Nachher
catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error(message);
}
```

### Stufe 2: `strictNullChecks: true`
- Deckt die meisten echten Bugs auf
- Hauptarbeit: `findOne()` Rueckgabewerte (nullable) korrekt pruefen
- MongoDB: `Collection.findOne()` gibt `T | null` zurueck — viele Stellen casten das weg

### Stufe 3: `noImplicitAny: true`
- Die 179 `: any` Stellen typisieren (groesster Aufwand)
- Prioritaet: Service-Funktionen → Controller → Helpers → Tests

### Stufe 4: MongoDB `as any` Casts
- `UpdateFilter<T>` Generics statt `as any` bei Update-Operationen
- `$set`, `$push`, `$pull` etc. korrekt typisieren

### Stufe 5: `as unknown as` Bridge-Pattern
- 27 Stellen wo DB-Dokumente zu Shared-Models gemappt werden
- Option A: Generische `toModel<T>()` Utility-Funktion
- Option B: Branded Types fuer ObjectId vs String

### Stufe 6: Volle `strict: true`
- `strictBindCallApply`, `strictFunctionTypes`, `strictPropertyInitialization`
- Restliche Flags aktivieren und fixen

## Stufenplan Frontend

Separat evaluieren — Angular-spezifische Patterns:
- Decorator-Properties (`@Input()`, `@Output()`) und `strictPropertyInitialization`
- Template-Type-Checking (`strictTemplates` in `angularCompilerOptions`)
- DI-Injection mit `inject()` vs Constructor-Injection

## Verifizierung pro Stufe

- [ ] `npx tsc --noEmit` — keine Fehler
- [ ] `npm run lint` — keine neuen Lint-Fehler
- [ ] `npm test` — alle Tests gruen
- [ ] Commit pro Stufe (revertierbar)

## Hinweise

- Jede Stufe einzeln committen — so kann man bei Problemen gezielt zurueckrollen
- `strictNullChecks` ist die wichtigste einzelne Flag — sie findet echte Bugs
- Bei MongoDB-Casts: `UpdateFilter<DocType>` aus `mongodb` Package nutzen, nicht `as any`
- Tests: `as any` in Test-Fixtures ist akzeptabel wenn der Typ fuer den Test irrelevant ist
