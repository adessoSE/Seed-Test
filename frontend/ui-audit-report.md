# UI-Audit Report: Base Editor State-Switches

**Datum:** 2026-09-04  
**Projektpfad:** `C:\SeedTest\frontend\src\app\`  
**Umgebung:** Angular 22, zoneless, Signals, OnPush Change Detection  
**Login:** seed@test.de / seedtest  
**Projekt:** "Mein Test Projekt" mit 4 Stories  

---

## Summary

Während des UI-Audits der Base Editor State-Switching-Mechanismen wurden **3 kritische Bugs** identifiziert, die das Story- und Scenario-Weakening fundamental beeinträchtigen. Zusätzlich wurden **2 weitere Probleme** im Dark-Mode und DOM-Rendering gefunden.

---

## Bug #1: Story-Editor zeigt FALSCHE Story nach Wechsel (Kritisch)

**Kategorie:** State-Bug / Signal-Synchronisation  
**Severity:** P0 - Blocker for core functionality  
**Reproduzierbar:** 100% (jeder Story-Wechsel)

### Reproduktionsschritte

1. Frontend starten: `http://localhost:4200`
2. Einloggen (seed@test.de / seedtest)
3. Projekt "Mein Test Projekt" auswählen
4. Auf Expansion Panel Header von Story 2 ("2. Erste Story") klicken
5. **Erwartet:** Editor zeigt Titel "2. Erste Story"  
   **Tatsächlich:** Editor zeigt Titel "3. Story Alpha" (Story 3!)

### Konsistentes Fehlermuster

| Aktion | Sidebar Highlight | Editor Title | Richtig? |
|--------|------------------|--------------|----------|
| Initial: Story 1 | Story 1 | Story 1 | ✅ |
| Klick Story 2 | Story 2 | Story 2 | ✅ |
| Klick Story 1 | Story 1 | Story 2 | ❌ LAG |
| Klick Story 3 | Story 1 | Story 1 | ❌ FALSCH |
| Klick Story 2 | Story 3 | Story 3 | ❌ FALSCH |
| Klick Story 2 | Story 3 | Story 3 | ❌ LAG |

**Muster:** Der Editor zeigt NACH JEDEM Klick die Story des VORHERIGEN Klicks.

### Root-Cause Analyse

**Datei:** `frontend/src/app/story-editor/story-editor.component.ts`  
**Zeilen:** 567-598 (`newSelectedStoryEffect`)

```typescript
/** Effect 18: React to new selected story input */
private readonly newSelectedStoryEffect = effect(() => {
    const story = this.newSelectedStory();
    if (!story) return;
    untracked(() => {
        console.log('Setting selectedStory via effect:', story._id);
        this.selectedStory.set(story);
        this.initializeIsExampleForStory(this.selectedStory());
        this.isReviewingAi.set(false);
        // ... more code
        if (this.selectedStory() &&
            this.selectedStory()!.scenarios &&
            this.selectedStory()!.scenarios.length > 0
        )
            this.selectScenario(this.selectedStory()!.scenarios[0]);
        else if (this.selectedStory())
            this.selectScenario(null);
    });
}, { allowSignalWrites: true });
```

**Ursache:** Der `newSelectedStoryEffect` liest `newSelectedStory()` innerhalb eines `untracked()` Blocks. In zoneless Angular werden Effects nicht automatisch während der Change Detection ausgeführt. Der Effect wird mit einem **stale signal input value** aufgerufen, weil:

1. `newSelectedStory` ist ein **Signal Input** (Angular 17+ `input()` API)
2. Bei einem Signal-Input-Wechsel wird die Change Detection getriggert
3. Aber in **zoneless mode** wird der Effekt nicht im gleichen Tick ausgeführt
4. Der Effekt wird mit dem **alten Wert** aufgerufen (from the previous change detection cycle)

**Datei:** `frontend/src/app/parent/parent.component.ts`  
**Zeilen:** 192-204 (`setSelectedStory`)

```typescript
setSelectedStory(story: Story) {
    if (!this.sameStory(this.selectedStory(), story))
        this.selectedScenario.set(undefined);
    this.selectedStory.set(story);  // <-- This triggers the cascade
}
```

**Datei:** `frontend/src/app/story-editor/story-editor.component.ts`  
**Zeilen:** 1077-1108 (`selectScenario`)

```typescript
selectScenario(scenario: Scenario | null) {
    this.selectedScenario = scenario as Scenario;  // <-- Regular class property, NOT a signal!
    this.showResults.set(false);
    if (scenario) {
        this.showEditor.set(true);
        // ...
    }
}
```

**Probleme:**
1. `selectedScenario` ist ein **klassenes Property** (Zeile 144), nicht ein Signal → kein zoneless Reactivity
2. Die Effect-Kette ist zu lang und zu asynchron für eine zuverlässige State-Synchronisation
3. Das `untracked()` verdeckt, dass `this.selectedStory.set(story)` ein Signal ist, das von OnPush-Komponenten gelesen wird

### Fix-Vorschlag

```typescript
// In story-editor.component.ts

/** Effect 18: React to new selected story input */
private readonly newSelectedStoryEffect = effect((onCleanup) => {
    let prevStory: Story | undefined;
    
    const story = this.newSelectedStory();
    if (!story) return;
    
    // Read signals OUTSIDE of untracked for proper tracking
    this.selectedStory.set(story);
    
    // Clean up previous story's state
    if (prevStory && prevStory._id !== story._id) {
        this.isReviewingAi.set(false);
        this.aiSuggestions.delete(prevStory._id!);
        if (story.aiSuggestion) {
            this.aiSuggestions.set(story._id!, story.aiSuggestion as { scenarios: Scenario[] });
        }
    }
    prevStory = story;
    
    // Auto-select first scenario synchronously
    if (story.scenarios?.length > 0) {
        this.selectScenario(story.scenarios[0]);
    }
    
    onCleanup(() => {
        if (prevStory) {
            this.aiSuggestions.delete(prevStory._id!);
        }
    });
}, { allowSignalWrites: true });
```

**Zusätzlicher Fix für `selectedScenario`:**
```typescript
// In story-editor.component.ts, Zeile ~144
// Change from:
// selectedScenario!: Scenario;
// To:
selectedScenario = signal<Scenario | null>(null);
```

---

## Bug #2: Expansion Panel DOM-Inversion (Hoch)

**Kategorie:** UI-Bug / Material/Angular Kompatibilität  
**Severity:** P1 - UI corruption

### Beschreibung

Die Expansion Panel Inhalte von Angular Material werden in der **falschen DOM-Reihenfolge** gerendert. Story N's Szenario-Inhalte erscheinen unter Story (N+1)'s Header.

### Beobachtetes DOM-Verhalten

```
#mat-expansion-panel-header-1 (Story 1)
  [content of Story 1 should be here]
  
#mat-expansion-panel-header-2 (Story 2)
  [content of Story 2 appears AFTER header-3!]
  
#mat-expansion-panel-header-3 (Story 3)  
  [content of Story 3 appears AFTER header-2!]
```

**Beispiel:** Story 2's `#scenario0` Element erscheint in der DOM-Struktur zwischen Story 3 und Story 4, NICHT innerhalb von Story 2's Expansion Panel.

### Root-Cause

**Datei:** `frontend/src/app/stories-bar/stories-bar.component.html`  
**Zeilen:** 90-158

```html
<mat-accordion displayMode="flat" class="stories-accordion">
    @for (s of storyNumbering().stories; track s; let i = $index) {
        <mat-expansion-panel [cdkDrag] class="story-expansion-panel cdk-drag"
            [class.cdk-drag-dragging]="selectedStory() === s"
            [expanded]="storyExpansion().has(s)"
            (opened)="toggleStoryExpansion(s)" (closed)="toggleStoryExpansion(s)">
            <mat-expansion-panel-header>
                <mat-panel-title id="storyList" tabindex="0" role="button"
                    [class.selected]="selectedStory() === s"
                    style="cursor:pointer">
                    ...
                </mat-panel-title>
            </mat-expansion-panel-header>
```

**Probleme:**
1. `[expanded]="storyExpansion().has(s)"` + `(opened)="toggleStoryExpansion(s)"` (Zeile 95): Die **doppelte** Expansion State-Steuerung führt zu Race Conditions zwischen dem Material-internen State und dem externen Signal-State
2. `toggleStoryExpansion` (stories-bar.ts:245-253) ruft `this.selectStory(story)` auf, was die `storyChosen` Output emittiert und den parent-`selectedStory` signal ändert. Dies triggert **gleichzeitig** die Change Detection für das aktuelle Panel, was den Material-interne State konfundiert.
3. `cdkDrag` innerhalb von `mat-expansion-panel` interferiert mit Angular Material's Animation Container Rendering

### Fix-Vorschlag

```typescript
// In stories-bar.component.ts
// Refactor toggleStoryExpansion to ONLY toggle expansion, NOT select story

toggleStoryExpansion(story: Story) {
    const prev = new Map(this.storyExpansion());
    if (prev.has(story))
        prev.delete(story);
    else
        prev.set(story, true);
    this.storyExpansion.set(prev);
    // DO NOT call selectStory here - only click on mat-panel-title should select
}
```

Und den Panel-Title Klick explizit machen:
```html
<mat-panel-title id="storyList" tabindex="0" role="button"
    [class.selected]="selectedStory() === s"
    style="cursor:pointer"
    (click)="$event.stopPropagation(); selectStory(s);">
```

---

## Bug #3: Scenario-Auswahl hat keine Wirkung (Mittel)

**Kategorie:** State-Bug / Event Binding  
**Severity:** P2 - Feature not working

### Reproduktionsschritte

1. Auf eine Story klicken (z.B. Story 2)
2. Auf einen Scenario-Link im Sidebar klicken (z.B. "#2.1 New Scenario")
3. **Erwartet:** Editor aktualisiert sich mit dem ausgewählten Scenario
4. **Tatsächlich:** Keine sichtbare Änderung

### Root-Cause

**Datei:** `frontend/src/app/stories-bar/stories-bar.component.ts`  
**Zeilen:** 612-614

```typescript
selectScenario(scenario: Scenario) {
    this.scenarioChosen.emit(scenario);
}
```

**Datei:** `frontend/src/app/parent/parent.component.html`  
**Zeilen:** 8

```html
(scenarioChosen)="setSelectedScenario($event);"
```

**Datei:** `frontend/src/app/parent/parent.component.ts`  
**Zeilen:** 228-230

```typescript
setSelectedScenario(scenario: Scenario) {
    this.selectedScenario.set(scenario);
}
```

**Datei:** `frontend/src/app/parent/parent.component.html`  
**Zeile:** 22

```html
[newSelectedScenario]="selectedScenario()"
```

**Datei:** `frontend/src/app/story-editor/story-editor.component.ts`  
**Zeilen:** 544-556

```typescript
private readonly newSelectedScenarioEffect = effect(() => {
    const scenario = this.newSelectedScenario();
    if (!scenario) return;
    const story = this.selectedStory();
    if (!story) return;
    untracked(() => {
        if (this.isReviewingAi())
            this.exitAiReviewMode();
        this.selectScenario(scenario);  // <-- This sets class property
    });
}, { allowSignalWrites: true });
```

**Problem:** `selectScenario()` in story-editor.ts (Zeile 1078) setzt `this.selectedScenario` als **klassenes Property**, nicht als Signal:

```typescript
selectScenario(scenario: Scenario | null) {
    this.selectedScenario = scenario as Scenario;  // Not a signal!
    this.showResults.set(false);
    // ... rest
}
```

Da `selectedScenario` (Zeile 144) ein klassenes Property ist (`selectedScenario!: Scenario`), und die OnPush-Änderungserkennung in zoneless Angular nur auf Signals und Observable-Changes reagiert, **wird die Änderung am Property nicht im Template erkannt**.

### Fix-Vorschlag

```typescript
// In story-editor.component.ts, Zeile ~144
// Change from:
// selectedScenario!: Scenario;
// To:
selectedScenario = signal<Scenario | null>(null);

// In selectScenario(), Zeile ~1078
selectScenario(scenario: Scenario | null) {
    this.selectedScenario.set(scenario);  // Use signal method
    this.showResults.set(false);
    // ... rest unchanged
}

// In template, update bindings from:
// {{selectedScenario?.name}}
// To:
// {{selectedScenario()?.name}}
```

---

## Bug #4: Dark Mode Toggle ohne visuelle Rückmeldung (Niedrig)

**Kategorie:** UI-Bug / CSS Theming  
**Severity:** P3 - Cosmetic

### Beschreibung

Der Dark Mode Toggle (Sonne/Mond Icon) reagiert visuell korrekt (Icon wechselt von "brightness_5" zu "bedtime"), aber das CSS-Theme wird nicht angewendet. Das Dokument enthält keine `.darkTheme` Klasse oder CSS-Variable-Änderung.

### Root-Cause

**Datei:** `frontend/src/app/parent/parent.component.html`  
**Zeile:** 1

```html
<div [class.darkTheme] ="isDark()" class="grid">
```

Die `darkTheme` Klasse wird an das root-Element gebunden, aber:
1. `isDark()` kommt aus dem `ThemingService` (computed signal)
2. Der Toggle in story-editor.ts aktualisiert die Theme-Variable, aber die CSS-Regeln für `[class.darkTheme]` könnten veraltet sein oder nicht alle Komponenten abdecken

### Fix-Vorschlag

ThemingService prüfen:
```typescript
// In theming.service.ts sicherstellen dass:
isDark = signal(false);

toggleTheme() {
    this.isDark.update(d => !d);
    document.body.classList.toggle('darkTheme', !this.isDark());
}
```

---

## Bug #5: Expand/Collapse Story-Panels funktioniert nicht isoliert (Mittel)

**Kategorie:** UI-Bug / UX  
**Severity:** P2 - UX degradation

### Beschreibung

Beim Klick auf einen Story-Header wird die Expansion State UND die Story-Auswahl gleichzeitig umgeschaltet. Es ist nicht möglich, eine Story zu expandieren ODER auszuwählen ohne beides zu tun. Zusätzlich bleiben vorherige Panels expandiert.

### Reproduktionsschritte

1. Story 1 expandieren (Klick auf Header)
2. Story 2 expandieren (Klick auf Header)
3. **Ergebnis:** Beide Panels sind expandiert, aber nur Story 2 ist "selected"
4. Ein weiteres Panel expandieren → drei Panels gleichzeitig expandiert

### Root-Cause

**Datei:** `frontend/src/app/stories-bar/stories-bar.component.html`  
**Zeile:** 95

```html
(opened)="toggleStoryExpansion(s)" (closed)="toggleStoryExpansion(s)">
```

**Datei:** `frontend/src/app/stories-bar/stories-bar.component.ts`  
**Zeilen:** 245-253

```typescript
toggleStoryExpansion(story: Story) {
    const prev = new Map(this.storyExpansion());
    if (prev.has(story))
        prev.delete(story);
    else
        prev.set(story, true);
    this.storyExpansion.set(prev);
    this.selectStory(story);  // <-- Forces selection on every toggle
}
```

Die `mat-accordion` mit `displayMode="flat"` sollte normal Collapse-Verhalten haben, aber da `toggleStoryExpansion` das Panel bei jedem Klick explizit toggelt (öffnen ODER schließen), kollidiert das mit dem Accordion-Verhalten.

### Fix-Vorschlag

```typescript
// In stories-bar.component.ts

/** Expand/collapse story panel - separate from selection */
toggleStoryExpansion(story: Story) {
    const prev = new Map(this.storyExpansion());
    if (prev.has(story))
        prev.delete(story);  // Collapse
    else
        prev.set(story, true);  // Expand (others stay as-is)
    this.storyExpansion.set(prev);
}

/** Select story - called only on panel-title click */
selectStory(story: Story) {
    this.selectedStory.set(story);
    this.storyChosen.emit(story);
}
```

Und im Template Expansion/Selection trennen:
```html
<mat-expansion-panel [expanded]="storyExpansion().has(s)"
    (opened)="toggleStoryExpansion(s)" 
    (closed)="toggleStoryExpansion(s)">
    <mat-expansion-panel-header>
        <mat-panel-title (click)="selectStory(s); $event.stopPropagation();">
            ...
        </mat-panel-title>
    </mat-expansion-panel-header>
</mat-expansion-panel>
```

---

## Zusammenfassung der Bugs

| ID | Beschreibung | Kategorie | Severity | Root-Cause File:Line |
|----|-------------|-----------|----------|---------------------|
| #1 | Editor zeigt falsche Story nach Wechsel | State-Bug | **P0** | story-editor.ts:567-598 |
| #2 | Expansion Panel DOM-Inversion | UI-Bug | **P1** | stories-bar.html:90-158 |
| #3 | Scenario-Klick hat keine Wirkung | State-Bug | **P2** | story-editor.ts:144,1078 |
| #4 | Dark Mode keine visuelle Änderung | UI-Bug | **P3** | theming.service.ts |
| #5 | Expand/Collapse mit Selection gekoppelt | UI-Bug | **P2** | stories-bar.ts:245-253 |

---

## Empfohlene Priorität für Fixes

1. **Bug #1** (P0) - Blockiert alle Story-Edit-Funktionen. Fix required before release.
2. **Bug #2** (P1) - Verwirrende UI, potenziell gefährlich für User Data Integrity.
3. **Bug #3** (P2) - Scenario-Switching unusable in current state.
4. **Bug #5** (P2) - UX-Problematik, aber Workaround vorhanden.
5. **Bug #4** (P3) - Cosmetic, low impact.

---

## Technische Hinweise für die Fixes

### Angular Signals + Zoneless Kontext

Alle Bugs sind direkt mit dem Angular 22 Zoneless + Signals Paradigma verknüpft:

1. **Signal Inputs vs. Regular Inputs:** `input()` (Signal Input) und `input.required()` verhalten sich in zoneless mode anders als traditionelle `@Input()` Decorators. Effects die Signal Inputs lesen müssen außerhalb von `untracked()` bleiben, damit sie korrekt triggern.

2. **OnPush + Nicht-Signal Properties:** Komponenten mit `ChangeDetectionStrategy.OnPush` reagieren **nur** auf:
   - Signal-Änderungen die im Template gelesen werden
   - Observable-Changes (async pipe)
   - Event-Handler-Ausführung
   - **NICHT** auf Änderungen an class properties
   
   Daher ist `selectedScenario!: Scenario` (klassenes Property) in OnPush-Komponenten **reaktionslos** in zoneless mode.

3. **`untracked()` Blockierung:** `untracked(() => { ... })` blockiert die Signal-Tracking innerhalb des Blocks. Wenn innerhalb von `untracked()` Signal-Werte gelesen werden, die sich ändern, **triggered der Effect nicht** für diese Änderungen.

4. **`linkedSignal()` reset behavior:** `linkedSignal()` reset to source value when source changes. Falls `linkedSignal()` verwendet wird und der Source-Service das Signal nicht aktualisiert, bleibt der alte Wert bestehen.

### Allgemeine Empfehlungen

1. **Alle class properties die im Template gelesen werden → in Signale umwandeln**
2. **`untracked()` nur für async operations verwenden**, nicht für Signal-Reads
3. **Expansion State und Selection State trennen** - zwei unabhängige Signale
4. **`effect()` Chain reduzieren** - zu viele Effekte die Signale schreiben lesen (Effect A writes signal X → Effect B reads signal X and writes signal Y → ...) verursachen unvorhersehbares Timing in zoneless
