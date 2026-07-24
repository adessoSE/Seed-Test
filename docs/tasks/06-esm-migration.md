# Paket 6: Full ESM Migration

**Status:** Offen
**Abhaengigkeiten:** Pakete 1-5 muessen abgeschlossen sein
**Branch:** `AI-integration-prototype`

---

## Ziel

Backend auf native ES Modules umstellen. `"type": "module"` in `package.json`.

## Voraussetzungen

- ESLint Flat Config ist bereits ESM (`eslint.config.mjs`)
- TypeScript strict mode ist aktiv (verhindert Laufzeitfehler durch fehlende Typen)
- Dependencies sind modernisiert (keine CJS-only Packages)

## Aenderungen

| Aenderung | Details |
|---|---|
| `"type": "module"` | In Backend `package.json` |
| `require()` → `import` | Nur 1 bekannte Stelle: `seleniumWebdriverWorld.ts` |
| `__dirname` ersetzen | → `import.meta.dirname` (Node 21.2+) oder `fileURLToPath(import.meta.url)` |
| `node:` Prefix | Standardisieren: `import fs from 'node:fs'` statt `import fs from 'fs'` (aktuell inkonsistent) |
| `tsconfig.json` | `module: "NodeNext"` bleibt (funktioniert mit ESM) |
| Vitest Config | Pruefen ob ESM-Modus Aenderungen braucht |
| Dynamic Imports | `require()` in Conditional-Blocks → `await import()` |

## Risiken

- **Mittel:** Manche npm-Packages haben CJS/ESM-Kompatibilitaetsprobleme
- `mongodb` Driver, `express`, `cucumber` etc. muessen auf ESM-Kompatibilitaet geprueft werden
- Ausfuehrlich testen!

## Verifizierung

- [ ] `npm run lint` — keine Fehler
- [ ] `npm test` — alle Tests gruen
- [ ] `npx tsc --noEmit` — keine TS-Fehler
- [ ] `npm start` — Server startet fehlerfrei
- [ ] Manuell: Login-Flow + Repo-CRUD + Test-Execution testen
- [ ] Docker-Build: `docker build` funktioniert
