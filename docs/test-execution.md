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

Code: `backend/src/testing/` (`test-runner.service.ts` orchestrates; `test-runners/playwright` and `test-runners/selenium-webdriver` hold the worlds and step definitions).

## Repository settings

Each repository (project) has settings for the test runner. Their names are defined in `shared/src/models/RepositoryContainer.ts` and `Repository.ts`.

| Setting | Type | Description |
|---|---|---|
| `browser` | string | `chromium`, `firefox`, `webkit`, or `MicrosoftEdge` |
| `stepWaitTime` | number | Milliseconds to pause per step |
| `emulator` | string | Playwright device descriptor (for example "iPhone 12"); Chromium-based browsers only |
| `width` / `height` | number | Window size |
| `testRunner` | string | `playwright` or `seleniumWebdriver` (default `seleniumWebdriver`) |

## Creating tests in the tool

The user creates in the Seed-Test frontend:
1. **Story**: name, description, repository
2. **Background**: shared setup steps (optional)
3. **Scenarios**: individual tests with Given/When/Then steps
4. **Steps** with `StepType` references: predefined actions (click button, insert text, etc.)
5. **Block references** (`_blockReferenceId`): reusable step groups

## Feature file generation

`feature-file.service.ts` converts a Seed-Test story into a Gherkin feature file:

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
  ... (optional Outline with Examples)
```

- Step structure: `pre 'value' mid post`, plus optional `value1 | value2 | value3` for Examples.
- Block references are expanded recursively before writing.
- Feature files are written to `backend/features/` and are gitignored.
- They are regenerated before a run when they are outdated or missing.

## API: running tests

Four endpoints start a test run (full list in `docs/api-reference.md`):

| Endpoint | Scope |
|----------|-------|
| `POST /api/execute/Feature/:issueID` | All scenarios of a story |
| `POST /api/execute/Scenario/:issueID/:scenarioId` | One scenario |
| `POST /api/execute/Group/:repoID/:groupID` | All stories of a group |
| `POST /api/execute/TempGroup` | Temporary group (pre-conditions) |

Request body:
```typescript
{
    repositoryId: string,
    testRunner: 'seleniumWebdriver' | 'playwright',  // default: seleniumWebdriver
    body: {
        browser: string,           // chromium / firefox / webkit / MicrosoftEdge
        waitTime: number,          // ms between steps
        daisyAutoLogout: boolean,
        emulator?: string,         // Playwright device descriptor
        windowSize?: { height, width }
    }
}
```

## Step definitions

The step definitions are the low-code vocabulary. The tables below list the patterns as written in the feature files. Playwright and Selenium do not implement exactly the same set, so check `backend/src/testing/test-runners/<runner>/stepdefs.ts` for the authoritative list.

### Given
| Step Pattern | Function |
|-------------|----------|
| `As a {string}` | Store role/user |
| `I am on the website: {string}` | Navigate to URL |
| `I add a cookie with the name {string} and value {string}` | Set cookie |
| `I remove a cookie with the name {string}` | Delete cookie |
| `I add a session-storage with the name {string} and value {string}` | Set sessionStorage entry |
| `I remove a session-storage with the name {string}` | Delete sessionStorage entry |
| `I take a screenshot` | Attach page screenshot to report |
| `I take a screenshot. Optionally: Focus the page on the element {string}` | Screenshot after scrolling to element |

### When
| Step Pattern | Function |
|-------------|----------|
| `I go to the website: {string}` | Navigate to URL |
| `I click the button: {string}` | Find and click button (with download polling) |
| `The site should wait for {string} milliseconds` | Pause plus 1 s buffer |
| `I insert {string} into the field {string}` | Find and fill input/textarea |
| `I select {string} from the selection {string}` | Choose radio button |
| `I select the option {string} from the drop-down-menue {string}` | Open dropdown and choose option |
| `I select the option {string}` | Choose option from the active dropdown |
| `I hover over the element {string} and select the option {string}` | Hover, then menu selection |
| `I select from the {string} multiple selection, the values {string}{string}{string}` | Multi-select (incomplete) |
| `I check the box {string}` | Set checkbox |
| `Switch to the newly opened tab` | Switch to newest tab |
| `Switch to the tab number {string}` | Switch to a specific tab |
| `I switch to the next tab` | Next tab |
| `I want to upload the file from this path: {string} into this uploadfield: {string}` | File upload |

### Then
| Step Pattern | Function |
|-------------|----------|
| `So I will be navigated to the website: {string}` | URL assertion |
| `So I can see the text {string} in the textbox: {string}` | Input value assertion |
| `So I can see the text: {string}` | Text assertion (supports `{Regex:...}`) |
| `So I can't see text in the textbox: {string}` | Negated input value assertion |
| `So a file with the name {string} is downloaded in this Directory {string}` | Download assertion |
| `So the picture {string} has the name {string}` | Image upload assertion |
| `So I can't see the text: {string}` | Negated text assertion |
| `So the checkbox {string} is set to {string}` | Checkbox state assertion |
| `So on element {string} the css property {string} is {string}` | CSS property assertion (including colors) |
| `So the element {string} has the tool-tip {string}` | Tooltip assertion |

## Locating strategy

Each step tries **multiple locator strategies in sequence** until one succeeds.

### Playwright (primary)
1. **Preferred locators**: `getByRole()`, `getByLabel()`, `getByText()`, `locator()` (CSS)
2. **XPath locators**: `locator('xpath=...')`
3. If all fail: error listing every locator tried

The strategy is tuned per action (click, fill, check, hover, ...). Example, button click: `getByRole("button", name)`, `getByText`, `getByLabel`, `#${id}`, `[id*=...]`, then several XPath variants.

### Selenium (legacy)
XPath only, built by string interpolation; `Promise.any()` runs over the locator array.

## Special features

### `@*` wildcard expansion
Steps support Selenium's `@*=` and `contains(@*, ...)` wildcards. Playwright expands them into a list of known attributes (`id`, `name`, `class`, `data-testid`, `aria-label`, `title`, ...) depending on element type.

### Special commands
`text` parameters pass through `applySpecialCommands()` (`helpers/specialCommandParser.ts`), which resolves tokens such as `{Enter}`, `{Tab}`, and `{Backspace}`.

### Regex assertions
Text assertions accept `{Regex:pattern}`.

## World classes

Each step runs with `this` set to the world of the selected runner:

### PlaywrightWorld (`test-runners/playwright/playwrightWorld.ts`)
- Browser session: `chromium`, `firefox`, `webkit`, `MicrosoftEdge`
- Timeouts: launch 10 s; context and page actions 5 s; navigation 10 s
- Download and upload folders are OS-specific and defined in the world class (search for `seed_Downloads`)
- `download.suggestedFilename()` for download capture
- Tab management via `context.pages()` and `bringToFront()`

### SeleniumWebdriverWorld (`test-runners/selenium-webdriver/seleniumWebdriverWorld.ts`)
- WebDriver session with `By.xpath()`
- Download verification via `fs.promises.access()` and `fs.promises.rename()`
- Tab management via `driver.getAllWindowHandles()` and `driver.switchTo().window()`

### Shared features
- **`oneDriver` mode**: one browser session shared across multiple scenarios
- **Screenshot on fail**: automatic screenshot attached to the report when a step fails
- **Emulator mode**: Playwright device descriptors; Chromium-based browsers only

## Reporting

| Artifact | Location | Format |
|----------|----------|--------|
| Raw JSON report | `backend/features/reporting_<timestamp>.json` | Cucumber JSON |
| HTML report | `backend/features/reporting_<timestamp>.html` | HTML |
| Screenshot (fail) | Download directory | PNG |
| Screenshot (manual) | Download directory | `manual-{timestamp}.png` |

- Reports are deleted automatically after `REPORT_DELETION_TIME` minutes (see `backend/.env.example`).
- The report service stores reports in MongoDB; the `reportId` is returned by the API.
- HTML report: grouped JSON → Cucumber reporter → `cucumber-html-reporter`.

## Technical details

### Cucumber runtime
- `@cucumber/cucumber`, loaded dynamically via `import('@cucumber/cucumber/api')`.
- Step definitions are cached per runner in `cachedSupportCode` (`test-runner.service.ts`). `loadSupport()` runs only on the first run for a runner; later runs reuse it. Consequence: a change to a step definition needs a backend restart.
- Single-scenario runs select via the tag `@<storyID>_<scenarioId>`.

### Timeouts
- Playwright: step timeout 30 s (twice the 15 s search timeout, `playwright/stepdefs.ts`); context and page action timeout 5 s; navigation timeout 10 s (`playwrightWorld.ts`).
- Selenium: step timeout 60 s (`selenium-webdriver/stepdefs.ts`); search timeout 15 s (`seleniumWebdriverWorld.ts`).

### Execution modes
`ExecutionMode` in `backend/src/models/models.ts`:
- `STORY` (value `feature`): all scenarios of a story
- `SCENARIO` (value `scenario`): one scenario of a story
- `GROUP` (value `group`): all stories of a group
