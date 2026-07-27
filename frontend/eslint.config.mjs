import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig([
	{
		ignores: ['src/assets/documentation/**']
	},
	{
		files: ['src/**/*.ts'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			angular.configs.tsRecommended
		],
		processor: angular.processInlineTemplates,
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		},
		plugins: {
			'@stylistic': stylistic
		},
		rules: {
			// --- Project style rules (shared with backend) ---
			'@stylistic/indent': ['error', 'tab', { SwitchCase: 1 }],
			'@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
			'@stylistic/semi': ['error', 'always'],
			'@stylistic/comma-dangle': ['error', 'never'],
			'@stylistic/space-infix-ops': ['error', { int32Hint: false }],
			'@stylistic/keyword-spacing': ['error', { before: true }],
			'@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
			'@stylistic/no-multiple-empty-lines': 'error',
			'@stylistic/no-tabs': ['error', { allowIndentationTabs: true }],

			// --- Code quality rules ---
			'no-console': 'off',
			'prefer-arrow-callback': 'error',
			'curly': ['error', 'multi'],
			'no-duplicate-imports': 'error',

			// --- TypeScript overrides ---
			'@typescript-eslint/no-unused-vars': ['error', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}],
			'@typescript-eslint/no-explicit-any': 'warn',

			// --- Angular rules ---
			'@angular-eslint/prefer-inject': 'error',
			'@angular-eslint/prefer-standalone': 'warn',
			'@angular-eslint/prefer-on-push-component-change-detection': 'warn',
			'@angular-eslint/no-empty-lifecycle-method': 'error',

			// --- Angular selectors (warn — existing components use non-standard selectors) ---
			'@angular-eslint/directive-selector': ['warn', {
				type: 'attribute',
				prefix: 'app',
				style: 'camelCase'
			}],
			'@angular-eslint/component-selector': ['warn', {
				type: 'element',
				prefix: 'app',
				style: 'kebab-case'
			}]
		}
	},
	{
		files: ['src/**/*.html'],
		extends: [
			angular.configs.templateRecommended,
			angular.configs.templateAccessibility
		],
		rules: {
			// Accessibility rules — real issues but gradual adoption
			'@angular-eslint/template/label-has-associated-control': 'warn',
			'@angular-eslint/template/interactive-supports-focus': 'warn',
			'@angular-eslint/template/click-events-have-key-events': 'warn',
			'@angular-eslint/template/elements-content': 'warn',
			'@angular-eslint/template/alt-text': 'warn',

			// Template strict equality — gradual adoption
			'@angular-eslint/template/eqeqeq': 'warn'
		}
	},
	{
		// Test files get relaxed rules
		files: ['src/**/*.spec.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	}
]);
