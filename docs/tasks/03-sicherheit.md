# Paket 3: Sicherheit

**Status:** Offen
**Abhaengigkeiten:** Paket 2 (TypeScript Strict) muss abgeschlossen sein
**Branch:** `AI-integration-prototype`

---

## Ziel

Die kritischsten Security-Luecken im Backend schliessen. Wird unter strengem Linting + Typisierung geschrieben.

## Aenderungen

### 1. Authorization-Middleware (Aufwand: Hoch)
- **Problem:** Endpoints pruefen nur ob ein User eingeloggt ist (`isLoggedIn`), nicht ob er Zugriff auf die Ressource hat. Jeder eingeloggte User kann jedes Repository/jede Story aendern/loeschen.
- **Loesung:** Neues `middleware/authorize.ts` mit Ownership-Check. Middleware prueft ob `req.user._id` der Owner der Ressource ist oder Member der Workgroup.
- **Dateien:** Neues `middleware/authorize.ts`, alle Route-Files die Resource-Endpoints haben

### 2. Rate Limiting (Aufwand: Niedrig)
- **Problem:** Kein Rate Limiting — Brute-Force auf Login moeglich
- **Loesung:** `express-rate-limit` auf Login, Register, Password Reset
- **Dateien:** `server.ts`, `package.json`

### 3. CSRF-Fix (Aufwand: Niedrig)
- **Problem:** Session-Cookie hat `sameSite: 'none'` in Production — ermoeglicht CSRF-Angriffe
- **Loesung:** `sameSite: 'lax'` in Production. `'none'` nur in Development/Docker
- **Dateien:** `server.ts:75`

### 4. Helmet (Aufwand: Niedrig)
- **Problem:** Keine Security-Header (X-Frame-Options, CSP, etc.)
- **Loesung:** `helmet` Middleware einbinden
- **Dateien:** `server.ts`, `package.json`

### 5. UUID v1 ersetzen (Aufwand: Niedrig)
- **Problem:** `uuid` v1 leakt die MAC-Adresse des Servers
- **Loesung:** `crypto.randomUUID()` (Node.js built-in, kryptographisch sicher)
- **Dateien:** `user.controller.ts:4,32`, `package.json` (uuid entfernen)

### 6. Credential-Cleanup (Aufwand: Niedrig)
- **Problem:** Hardcoded DB-Credentials als Fallback-Defaults im Code
- **Loesung:** Fallback-Defaults entfernen, nur aus `.env` lesen, bei fehlendem Wert mit klarer Fehlermeldung abbrechen
- **Dateien:** `DbConnector.ts:4`, `server.ts:61,65`

### 7. Input-Sanitization (Aufwand: Mittel)
- **Problem:** Kein zentraler Schutz gegen MongoDB Injection ($-Operator in User-Input)
- **Loesung:** `express-mongo-sanitize` als globale Middleware
- **Dateien:** Neues `middleware/sanitize.ts`, `server.ts`

## Verifizierung

- [ ] `npm run lint` — keine Fehler
- [ ] `npm test` — alle Tests gruen
- [ ] Manuell: Login-Flow testen (CSRF-Fix koennte Frontend-Session brechen wenn Cookie-Settings nicht stimmen)
- [ ] Manuell: Als User A versuchen, Repo von User B zu editieren → 403
- [ ] Rate Limiting: 10+ schnelle Login-Versuche → 429 Too Many Requests
