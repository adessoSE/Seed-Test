# Test Execution Engine — Produktfeature

Seed-Test kann **beliebige Web-Apps via Low-Code testen**. Der Nutzer erstellt Scenarios mit vordefinierten Steps, die in echte Browser-Automatisierung (Playwright oder Selenium) übersetzt werden.

## Architektur

```
[User erstellt Story] → Seed-Test generiert [.feature] Cucumber-Datei
                        ↓
                  [User führt Test aus] → Seed-Test API → Cucumber Runtime
                        ↓
                  [Playwright od. Selenium] → Browser steuern die Ziel-App
                        ↓
                  [JSON Report] → Seed-Test Report-Service
```

## Konfiguration des Nutzers

Jedes Repository (Project) hat Settings für den Test-Runner:

| Setting | Type | Default | Beschreibung |
|---------|------|---------|-------------|
| `browser` | string | chromium | Chromium, Firefox, WebKit, MicrosoftEdge |
| `waitTime` | number | 0 | Millisekunden Pause pro Step |
| `emulator` | string | — | Playwright Device Descriptor (z.B. "iPhone 12") |
| `width` / `height` | number | — | Fenstergröße (1920x1080 Standard) |
| `daisyAutoLogout` | boolean | false | Daisy-System: Auto-Logout aktivieren |
| `oneDriver` | boolean | false | Einen Browser über mehrere Scenarios teilen |

## Test-Erstellung im Tool

Der Nutzer erstellt im Seed-Test-Frontend:
1. **Story** → Name, Beschreibung, Repository
2. **Background** → Gemeinsame Setup-Schritte (muss nicht existieren)
3. **Scenarios** → Einzelne Tests mit Given/When/Then Steps
4. **Steps** mit `StepType`-Referenzen → vordefinierte Aktionen (Button klick, Text einfügen etc.)
5. **Block-References** (`_blockReferenceId`) → wiederverwendbare Step-Gruppen

## Feature-Generierung

`feature-file.service.ts` wandelt Seeds Story → Gherkin Feature File:

```gherkin
Feature: Story Title

Background:
  When Step pre 'value' mid post

Scenario: Scenario Name
  Given ... steps ...
  When ... steps ...
  Then ... steps ...
  Examples:
  | value1 | value2 | value3 |

Scenario: Another Name
  ... (optional Outline mit Examples)
```

- Step-Struktur: `pre 'value' mid post` + optional `value1 | value2 | value3`
- Block-References werden vor dem Schreiben expandiert (rekursiv)
- Feature-Dateien landen in `backend/features/`, werden gitignored
- Ggf. neu generiert bevor Test läuft (falls veraltet/fehlt)

## API: Test ausführen

4 Endpunkte triggern Testausführung:

| Endpoint | Beschreibung |
|----------|-------------|
| `POST /api/execute/Feature/:issueID` | Alle Scenarios einer Story |
| `POST /api/execute/Scenario/:issueID/:scenarioId` | Einzelnes Scenario |
| `POST /api/execute/Group/:repoID/:groupID` | Alle Stories einer Gruppe |
| `POST /api/execute/TempGroup` | Temporäre Gruppe (Pre-Conditions) |

Request Body:
```typescript
{
    repositoryId: string,
    testRunner: 'seleniumWebdriver' | 'playwright',  // default: selenium
    body: {
        browser: string,           // chromium/firefox/webkit/MicrosoftEdge
        waitTime: number,           // ms zwischen Steps
        daisyAutoLogout: boolean,
        emulator?: string,          // Playwright device descriptor
        windowSize?: { height, width }
    }
}
```

## Step Definitionen — das Herz

Das Tool enthält **32 vordefinierte Low-Code Steps**, die sowohl für **Playwright** als auch **Selenium** laufen (runner-agnostisch):

### Given (8 Steps)
| Step Pattern | Funktion |
|-------------|----------|
| `As a {string}` | Rolle/User speichern |
| `I am on the website: {string}` | Zur URL navigieren |
| `I add a cookie with the name {string} and value {string}` | Cookie setzen |
| `I remove a cookie with the name {string}` | Cookie löschen |
| `I add a session-storage with the name {string} and value {string}` | sessionStorage setzen |
| `I remove a session-storage with the name {string}` | sessionStorage löschen |
| `I take a screenshot` | Page-Screenshot an Report anhängen |
| `I take a screenshot. Optionally: Focus the page on the element {string}` | Screenshot + Scroll zum Element |

### When (14 Steps)
| Step Pattern | Funktion |
|-------------|----------|
| `I go to the website: {string}` | Zur URL navigieren |
| `I click the button: {string}` | Button finden & klicken (mit Download-Polling) |
| `The site should wait for {string} milliseconds` | Pause + 1s Buffer |
| `I insert {string} into the field {string}` | Input/Textarea finden & füllen |
| `I select {string} from the selection {string}` | Radio-Button wählen |
| `I select the option {string} from the drop-down-menue {string}` | Dropdown öffnen & Option wählen |
| `I select the option {string}` | Option aus aktivem Dropdown wählen |
| `I hover over the element {string} and select the option {string}` | Hover → Menü-Auswahl |
| `I select from the {string} multiple selection, the values {string}{string}{string}` | Multi-Select (unvollständig) |
| `I check the box {string}` | Checkbox setzen |
| `Switch to the newly opened tab` | Zum neuesten Tab wechseln |
| `Switch to the tab number {string}` | Zu konkretem Tab wechseln |
| `I switch to the next tab` | Nächster Tab |
| `I want to upload the file from this path: {string} into this uploadfield: {string}` | Datei-Upload |

### Then (10 Steps)
| Step Pattern | Funktion |
|-------------|----------|
| `So I will be navigated to the website: {string}` | URL-Assertion |
| `So I can see the text {string} in the textbox: {string}` | Input-Value-Assertion |
| `So I can see the text: {string}` | Text-Assertion (mit Regex-Support `{Regex:...}`) |
| `So I can't see text in the textbox: {string}` | Negierte Text-Assertion |
| `So a file with the name {string} is downloaded in this Directory {string}` | Datei-Download-Assertion |
| `So the picture {string} has the name {string}` | Bild-Upload-Assertion |
| `So I can't see the text: {string}` | Negierte Text-Assertion |
| `So the checkbox {string} is set to {string}` | Checkbox-Status-Assertion |
| `So on element {string} the css property {string} is {string}` | CSS-Property-Assertion (inkl. Farben) |
| `So the element {string} has the tool-tip {string}` | Tooltip-Assertion |

## Locating Strategy

Jeder Step versucht **mehrere Locator-Strategien sequentiell**, bis einer erfolgreich ist.

### Playwright (Primary)
1. **Preferred locators** → `getByRole()`, `getByLabel()`, `getByText()`, `locator()` (CSS)  
2. **XPath locators** → `locator('xpath=...')`  
3. Wenn alle fehlschlagen → Fehler mit Liste aller versuchten Locators

Die Locator-Strategie ist für jede Aktion (click, fill, check, hover, ...) speziell optimiert. Beispiel "button click":
`getByRole("button", name)`, `getByText`, `getByLabel`, `#${id}`, `[id*=...]`, dann 8 XPath-Varianten.

### Selenium (Legacy)
Nur XPath-basiert mit string-Interpolation und `Promise.any()` über Locator-Array.

## Special Features

### `@*` Wildcard Expansion
Steps unterstützen Selenium's `@*=`, `contains(@*, ...)` Wildcards. Playwright expandiert diese automatisch in eine Liste bekannter Attribute (`id`, `name`, `class`, `data-testid`, `aria-label`, `title`, ...) basierend auf Element-Typ.

### `Apply Special Commands`
`text` Parameter werden durch `applySpecialCommands()` gefiltert — unterstützt Commands wie `{Enter}`, `{Tab}`, `{Backspace}` etc. (definiert in `helpers/specialCommandParser.ts`).

### `Regex` Assertions
Text-Assertions unterstützen `{Regex:pattern}` Syntax um regular Expressions in Assertions zu verwenden.

## `World` Klassen

Jeder Step hat Zugriff auf `this` vom Typ (abhängig vom gewählten Runner):

### PlaywrightWorld (`PlaywrightWorld`)
- Browser-Session: `chromium`, `firefox`, `webkit`, `MicrosoftEdge`
- Download-Verzeichnis: `C:\Users\Public\seed_Downloads\` / `/home/public/Downloads/`
- Upload-Verzeichnis: `C:\Users\Public\SeedTmp\` / `/home/public/SeedTmp\`
- `download.suggestedFilename()` für Download-Capture
- Tab-Management über `context.pages()` + `bringToFront()`

### SeleniumWebdriverWorld (`SeleniumWebdriverWorld`)
- WebDriver-Session mit `By.xpath()`
- Download-Verifizierung über `fs.promises.access()` + `fs.promises.rename()`
- Tab-Management über `driver.getAllWindowHandles()` + `driver.switchTo().window()`

### Shared Features
- **`oneDriver`-Modus**: Browser-Session über mehrere Scenarios teilen (geteilte Instances)
- **Screenshot on fail**: Auto-Screenshot + Report-Anhang bei Step-Fehler
- **Emulator-Modus**: Playwright Device Descriptors (z.B. "iPhone 12") — nur Chromium-basierte Browser

## Reporting

| Artifact | Location | Format |
|----------|----------|--------|
| Roh-JSON Report | `backend/features/reporting_<timestamp>.json` | Cucumber JSON |
| HTML Report | `backend/features/reporting_<timestamp>.html` | HTML |
| Screenshot (fail) | Download-Verzeichnis | PNG |
| Screenshot (manual) | Download-Verzeichnis | `manual-{timestamp}.png` |

- Reports werden nach `REPORT_DELETION_TIME` Minuten automatisch gelöscht
- Report-Service speichert Reports in DB (`reportId` für API-Rückgabe)
- HTML-Report: gruppierte JSON → Cucumber-Reporter → `cucumber-html-reporter`

## Technische Details

### Cucumber Runtime
- `@cucumber/cucumber` v12
- Dynamisch geladen: `import('@cucumber/cucumber/api')`
- Support Code StepDefs werden pro Runner **gecached** (Wiederverwendung zwischen Test-Calls)
- Tags für single-Scenario-Selection: `@<storyID>_<scenarioId>`

### Timeout-Strategie
- Playwright: 30s global, 15s searchTimeout, 5s/10s context/page-level
- Selenium: 60s global default
- `page.setDefaultTimeout(5000)` + `page.setDefaultNavigationTimeout(10000)`

### Test-Modes
- `scenario`: Einzelnes Scenario einer Story
- `feature`: Alle Scenarios einer Story  
- `group`: Alle Stories einer Gruppe

### Caching
`cachedSupportCode` hält Playwright- und Selenium-StepDefs im Speicher zwischen. `loadSupport()` vom Cucumber-Runner wird nur beim **ersten** Test pro Runner aufgerufen. Folge-Tests verwenden die gecachte Instance → spart Startzeit.

### Frontend-Support
Die UI zeigt:
- Live-Fortschritt pro Scenario (Loading/Running/Done)
- Download-Link für den HTML Report
- Report-Status in der Story-Ansicht
- Pre-Conditions Editor für Gruppen-Tests
