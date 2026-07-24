# Paket 4: Error Handling modernisieren

**Status:** Offen
**Abhaengigkeiten:** Paket 3 (Sicherheit) muss abgeschlossen sein
**Branch:** `AI-integration-prototype`

---

## Ziel

Zentralen Error Handler auf Best-Practice-Niveau bringen. Einheitliches Error-Format, strukturiertes Logging, korrekte Fehler-Propagation.

## Aenderungen

### 1. AppError-Klasse (Aufwand: Niedrig)
- Neues `helpers/AppError.ts`
- Properties: `statusCode`, `isOperational` (erwarteter vs. unerwarteter Fehler), `code` (maschinenlesbar)
- Erbt von `Error`

### 2. Zentraler Error Handler (Aufwand: Niedrig)
- `server.ts:150-161` — aktuell immer 500, kein Statuscode aus Error
- Statuscode aus `err.statusCode` lesen, nur unbekannte Fehler als 500
- In Development: Stack-Trace zurueckgeben. In Production: nur Fehlermeldung.

### 3. Einheitliches Error-Format (Aufwand: Mittel)
- Ueberall `{ error: string }` als Response-Format
- Ca. 10 Stellen in Controllern wo Fehler inkonsistent formatiert werden
- Viele Controller geben `{ status: 'error' }` oder nur Strings zurueck

### 4. Unhandled Rejection Handler (Aufwand: Niedrig)
- `process.on('unhandledRejection')` + `uncaughtException` in `server.ts`
- Loggen, Server graceful herunterfahren

### 5. Post-Response-Bug (Aufwand: Niedrig)
- `sanity.controller.ts:85-87` — `res.json()` wird nach `next(error)` aufgerufen
- Headers already sent Error

### 6. SSE-Handler (Aufwand: Niedrig)
- `story.controller.ts:459-487` — SSE-Endpunkt hat kein try/catch
- Fehler wuerden den Stream still beenden ohne Client-Benachrichtigung

### 7. Winston Logging (Aufwand: Mittel)
- `console.error` durch strukturiertes Winston-Logging ersetzen
- Log-Levels: error, warn, info, debug
- JSON-Format fuer Production, pretty-print fuer Development
- Bestehende `logging.ts` erweitern und exportieren

### 8. Report-Analyse-Fehler (Aufwand: Mittel)
- `report.service.ts:456-459,494-498,546-549`
- Parse-/Analyse-Fehler werden als "Test failed" maskiert statt korrekt propagiert
- Unterscheidung: Test ist fehlgeschlagen vs. Report konnte nicht gelesen werden

## Verifizierung

- [ ] `npm run lint` — keine Fehler
- [ ] `npm test` — alle Tests gruen
- [ ] Manuell: Ungueltige Requests → sinnvolle Fehlermeldungen
- [ ] Manuell: Server-Logs pruefen — strukturiertes Format, korrekte Levels
