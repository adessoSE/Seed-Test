# Paket 5: Dependency-Cleanup + Modernisierung

**Status:** Offen
**Abhaengigkeiten:** Paket 4 (Error Handling) muss abgeschlossen sein
**Branch:** `AI-integration-prototype`

---

## Ziel

Dead Code entfernen, veraltete Packages durch moderne Alternativen oder Node.js built-ins ersetzen.

## Aenderungen

| Aenderung | Details | Aufwand |
|---|---|---|
| `express-flash` entfernen | Dead code, Package unmaintained seit 2014, nicht importiert | Trivial |
| `@types/handlebars` entfernen | Handlebars nicht verwendet | Trivial |
| `body-parser` → Express built-in | `express.json()` / `express.urlencoded()` — Express 5 hat diese built-in | Niedrig |
| `moment` → `date-fns` | Nur in `specialCommandParser.ts` verwendet. `moment` ist unmaintained, 300kB. `date-fns` ist tree-shakeable. | Niedrig |
| `stream-to-string` / `string-to-stream` → Node.js | `Readable.toArray()` + `Buffer.concat()` oder `stream.Readable.from()` | Niedrig |
| `rimraf` → `fs.rm()` | `fs.rm(path, { recursive: true, force: true })` — Node.js built-in seit v14 | Niedrig |
| `cucumber-html-reporter` | Hat npm Security-Override. Alternative evaluieren oder auf neuere Version pruefen | Mittel |
| `dotenv` evaluieren | Node 20.6+ hat `--env-file` Flag. Aber `dotenv` hat `.env.example` Validierung etc. — evaluieren ob Wechsel sinnvoll | Niedrig |

## Verifizierung

- [ ] `npm run lint` — keine Fehler
- [ ] `npm test` — alle Tests gruen
- [ ] `npm audit` — weniger Vulnerabilities als vorher
- [ ] `npx tsc --noEmit` — keine TS-Fehler
- [ ] Manuell: Features die betroffene Packages nutzen testen
