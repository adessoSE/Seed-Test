# Paket 1: ESLint-Modernisierung (Frontend + Backend)

**Status:** Offen
**Abhaengigkeiten:** Keine
**Branch:** `AI-integration-prototype`

---

## Ziel

`airbnb-base` (Backend) und Legacy-ESLint-8-Setup (Frontend) durch modernen TypeScript-ESLint-Stack mit Flat Config ersetzen. Beide Packages bekommen identische Regeln, nur die ESLint-Major-Version unterscheidet sich wegen angular-eslint-Kompatibilitaet.

## Ist-Zustand

### Backend
- `.eslintrc.json` mit `airbnb-base` (JS-only), `ecmaVersion: 2018`
- ESLint 8.57.1 (transitiv ueber `eslint-config-airbnb-base`)
- Kein `@typescript-eslint` — TypeScript wird nicht gelintet!
- Lint-Script: `./node_modules/.bin/eslint src/database --fix` — lintet nur `src/database/`
- Deps: `eslint-config-airbnb-base@^15.0.0`, `eslint-plugin-import@^2.32.0`

### Frontend
- **Keine ESLint-Config-Datei vorhanden** (kein `.eslintrc.json`, kein `eslint.config.*`)
- ESLint 8.57.1
- `@angular-eslint/*` 20.3.0, `@typescript-eslint/*` 8.44.1
- Lint-Script: `ng lint` (via `@angular-eslint/builder:lint` in `angular.json`)

## Soll-Zustand

### Backend: ESLint 10.7.0
```
eslint@10.7.0
@eslint/js@latest
typescript-eslint@8.65.0
@stylistic/eslint-plugin@5.10.0
```

### Frontend: ESLint 9.39.3
```
eslint@9.39.3
typescript-eslint@8.65.0
angular-eslint@20.7.0           (unified Package statt 5 einzelne @angular-eslint/*)
@stylistic/eslint-plugin@5.10.0
```

**Warum ESLint 9 statt 10 im Frontend:**
`angular-eslint` 20.x hat peerDependency `eslint: ^8.57.0 || ^9.0.0` — kein ESLint 10. ESLint 10-Support kommt erst mit angular-eslint v21 (= Angular 21). ESLint 9 unterstuetzt Flat Config bereits als Default, die Configs sind inhaltlich identisch.

## Schritte Backend

1. **Alte Deps deinstallieren:**
   ```bash
   cd backend
   npm uninstall eslint-config-airbnb-base eslint-plugin-import
   ```

2. **Neue Deps installieren:**
   ```bash
   npm install -D eslint@10.7.0 @eslint/js typescript-eslint@8.65.0 @stylistic/eslint-plugin@5.10.0
   ```

3. **`.eslintrc.json` loeschen**

4. **`eslint.config.mjs` erstellen** (siehe Config-Template unten)

5. **`package.json` Lint-Script aendern:**
   ```json
   "lint": "eslint src/"
   ```

6. **Lint ausfuehren, Fehler fixen** — bei `strictTypeChecked` werden viele Fehler kommen. Zuerst mit `recommended` starten, dann hochstufen.

## Schritte Frontend

1. **Alte Deps deinstallieren:**
   ```bash
   cd frontend
   npm uninstall @typescript-eslint/eslint-plugin @typescript-eslint/parser @angular-eslint/builder @angular-eslint/eslint-plugin @angular-eslint/eslint-plugin-template @angular-eslint/schematics @angular-eslint/template-parser
   ```

2. **Neue Deps installieren:**
   ```bash
   npm install -D eslint@9.39.3 typescript-eslint@8.65.0 angular-eslint@20.7.0 @stylistic/eslint-plugin@5.10.0
   ```

3. **`eslint.config.mjs` erstellen** (siehe Config-Template unten)

4. **`angular.json`**: Builder auf neue Config pruefen (sollte automatisch `eslint.config.mjs` finden)

5. **Lint ausfuehren, Fehler fixen**

## Config-Templates

### Backend `eslint.config.mjs`
```javascript
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig([
  {
    files: ['src/**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Projekt-Regeln
      '@stylistic/indent': ['error', 'tab'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'never'],
      'no-console': 'off',
      'prefer-arrow-callback': 'error',
      'curly': ['error', 'multi'],

      // Ggf. lockern fuer Migration
      // '@typescript-eslint/no-explicit-any': 'warn',
      // '@typescript-eslint/no-unsafe-assignment': 'warn',
    },
  },
]);
```

### Frontend `eslint.config.mjs`
```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/indent': ['error', 'tab'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'never'],
      'no-console': 'off',
      'prefer-arrow-callback': 'error',
      'curly': ['error', 'multi'],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  },
);
```

## Verifizierung

- [ ] `cd backend && npm run lint` — keine Fehler (oder nur bewusst gelockterte Regeln)
- [ ] `cd frontend && npm run lint` — keine Fehler
- [ ] `cd backend && npm test` — alle 111 Tests gruen
- [ ] `cd frontend && npm test` — alle Tests gruen
- [ ] `cd backend && npx tsc --noEmit` — keine TS-Fehler

## Hinweise

- Bei `strictTypeChecked` werden initial VIELE Fehler kommen (~280+ im Backend allein durch `any`-Usage). Strategie: Mit `recommended` starten, stabilisieren, dann `strictTypeChecked` aktivieren. Oder `strict`-Regeln einzeln auf `warn` setzen.
- `@stylistic/eslint-plugin` ersetzt die alten ESLint-Formatting-Regeln (indent, quotes, semi etc.), die aus dem ESLint-Core entfernt wurden.
- Frontend: `angular-eslint@20.7.0` ist das unified Package — ersetzt die 5 einzelnen `@angular-eslint/*` Packages.
