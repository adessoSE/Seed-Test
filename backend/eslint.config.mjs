import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig([
	{
		files: ['src/**/*.ts'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended
		],
		languageOptions: {
			parserOptions: {
				project: './tsconfig.eslint.json',
				tsconfigRootDir: import.meta.dirname
			}
		},
		plugins: {
			'@stylistic': stylistic
		},
		rules: {
			// --- Project style rules ---
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

			// --- Deferred to Paket 4 (Error Handling) ---
			'preserve-caught-error': 'warn',
			'no-useless-catch': 'warn',

			// --- TypeScript overrides ---
			'@typescript-eslint/no-unused-vars': ['error', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-require-imports': 'off'
		}
	},
	{
		// Test files get relaxed rules
		files: ['src/**/*.spec.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},
	{
		// Cucumber step definitions use 'const self = this' for World context
		files: ['src/testing/**/*.ts'],
		rules: {
			'@typescript-eslint/no-this-alias': 'off'
		}
	},
	{
		// Dead code admin utilities — not imported anywhere, kept for manual DB operations
		files: ['src/database/mongoDB_admin.ts'],
		rules: {
			'@typescript-eslint/no-unused-vars': 'off'
		}
	}
]);
