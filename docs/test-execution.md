# Test Execution Engine — Product Feature

Seed-Test can test **any web app via low-code**. The user creates scenarios with predefined steps that are translated into real browser automation (Playwright or Selenium).

## Architecture

```
[User creates Story] → Seed-Test generates [.feature] Cucumber file
                        ↓
                  [User runs test] → Seed-Test API → Cucumber Runtime
                        ↓
                  [Playwright or Selenium] → Browser controls target app
                        ↓
                  [JSON Report] → Seed-Test Report Service
```

## User configuration

Each repository (project) has settings for the test runner:

| Setting | Type | Default | Description |
| `browser` | string | chromium | Chromium, Firefox, WebKit, MicrosoftEdge |
| `waitTime` | number | 0 | Milliseconds pause per step |
| `emulator` | string | — | Playwright device descriptor (e.g. "iPhone 12") |
| `width` / `height` | number | — | Window size (1920x1080 default) |
| `daisyAutoLogout` | boolean | false | Daisy system: enable auto-logout |
| `oneDriver` | boolean | false | Share one browser across multiple scenarios |

## Creating tests in the tool

The user creates in the Seed-Test frontend:
1. **Story** → Name, description, repository
2. **Background** → Shared setup steps (optional)
3. **Scenarios** → Individual tests with Given/When/Then steps
4. **Steps** with `StepType` references → predefined actions (click button, insert text, etc.)
5. **Block references** (`_blockReferenceId`) → reusable step groups

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

## Step definitions — the heart

The tool contains **32 predefined low-code steps** that work with both **Playwright** and **Selenium** (runner-agnostic):

### Given (8 steps)
| Step Pattern | Function |
|-------------|----------|
| `As a {string}` | Rolle/User speichern |
| `I am on the website: {string}` | Zur URL navigieren |
| `I add a cookie with the name {string} and value {string}` | Cookie setzen |
| `I remove a cookie with the name {string}` | Cookie löschen |
| `I add a session-storage with the name {string} and value {string}` | sessionStorage setzen |
| `I remove a session-storage with the name {string}` | sessionStorage löschen |
| `I take a screenshot` | Page-Screenshot an Report anhängen |
| `I take a screenshot. Optionally: Focus the page on the element {string}` | Screenshot + Scroll zum Element |

### When (14 steps)
| Step Pattern | Function |
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

### Then (10 steps)
| Step Pattern | Function |
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

## Locating strategy

Each step tries **multiple locator strategies sequentially** until one succeeds.

### Playwright (primary)
1. **Preferred locators** → `getByRole()`, `getByLabel()`, `getByText()`, `locator()` (CSS)  
2. **XPath locators** → `locator('xpath=...')`  
3. If all fail → error with list of all locators tried

The locator strategy is specifically optimized per action (click, fill, check, hover, ...). Example "button click":
`getByRole("button", name)`, `getByText`, `getByLabel`, `#${id}`, `[id*=...]`, then 8 XPath variants.

### Selenium (legacy)
XPath-only, using string interpolation and `Promise.any()` over locator array.

## Special features

### `@*` wildcard expansion
Steps support Selenium's `@*=`, `contains(@*, ...)` wildcards. Playwright automatically expands these into a list of known attributes (`id`, `name`, `class`, `data-testid`, `aria-label`, `title`, ...) based on element type.

### `Apply Special Commands`
`text` parameters are filtered through `applySpecialCommands()` — supports commands like `{Enter}`, `{Tab}`, `{Backspace}` etc. (defined in `helpers/specialCommandParser.ts`).

### `Regex` assertions
Text assertions support `{Regex:pattern}` syntax to use regular expressions in assertions.

## `World` classes

Each step has access to `this` whose type depends on the selected runner:

### PlaywrightWorld (`PlaywrightWorld`)
- Browser session: `chromium`, `firefox`, `webkit`, `MicrosoftEdge`
- Download directory: `C:\Users\Public\seed_Downloads\` / `/home/public/Downloads/`
- Upload directory: `C:\Users\Public\SeedTmp\` / `/home/public/SeedTmp\`
- `download.suggestedFilename()` for download capture
- Tab management via `context.pages()` + `bringToFront()`

### SeleniumWebdriverWorld (`SeleniumWebdriverWorld`)
- WebDriver session with `By.xpath()`
- Download verification via `fs.promises.access()` + `fs.promises.rename()`
- Tab management via `driver.getAllWindowHandles()` + `driver.switchTo().window()`

### Shared features
- **`oneDriver` mode**: Share browser session across multiple scenarios (shared instances)
- **Screenshot on fail**: Auto-screenshot + report attachment on step failure
- **Emulator mode**: Playwright device descriptors (e.g. "iPhone 12") — Chromium-based browsers only

## Reporting

| Artifact | Location | Format |
|----------|----------|--------|
| Raw JSON report | `backend/features/reporting_<timestamp>.json` | Cucumber JSON |
| HTML report | `backend/features/reporting_<timestamp>.html` | HTML |
| Screenshot (fail) | Download directory | PNG |
| Screenshot (manual) | Download directory | `manual-{timestamp}.png` |

- Reports are automatically deleted after `REPORT_DELETION_TIME` minutes
- Report service stores reports in DB (`reportId` for API return)
- HTML report: grouped JSON → Cucumber reporter → `cucumber-html-reporter`

## Technical details

### Cucumber runtime
- `@cucumber/cucumber` v13
- Dynamically loaded: `import('@cucumber/cucumber/api')`
- Support code step definitions are **cached** per runner (reused between test calls)
- Tags for single scenario selection: `@<storyID>_<scenarioId>`

### Timeout strategy
- Playwright: 30s global, 15s searchTimeout, 5s/10s context/page-level
- Selenium: 60s global default
- `page.setDefaultTimeout(5000)` + `page.setDefaultNavigationTimeout(10000)`

### Test modes
- `scenario`: Single scenario of a story
- `feature`: All scenarios of a story  
- `group`: All stories of a group

### Caching
`cachedSupportCode` holds Playwright and Selenium step definitions in memory between runs. `loadSupport()` from the Cucumber runner is only called on the **first** test per runner. Subsequent tests use the cached instance → saves startup time.

### Frontend support
The UI shows:
- Live progress per scenario (Loading/Running/Done)
- Download link for the HTML report
- Report status in the story view
- Pre-conditions editor for group tests
