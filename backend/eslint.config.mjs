import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig([
	{
		files: ['src/**/*.ts'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommendedTypeChecked
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
			'eqeqeq': ['error', 'always'],
			'no-useless-catch': 'warn',
			'preserve-caught-error': 'error',

			// --- TypeScript type-aware rules ---
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/return-await': ['error', 'in-try-catch'],
			'@typescript-eslint/only-throw-error': 'warn',
			'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
			'@typescript-eslint/no-unused-vars': ['error', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-require-imports': 'error',
			'@typescript-eslint/consistent-type-imports': ['error', {
				prefer: 'type-imports',
				fixStyle: 'inline-type-imports'
			}],

			// Deferred: too noisy while codebase still has pervasive `any` types.
			// Enable as `any` is incrementally replaced with proper types.
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-enum-comparison': 'off'
		}
	},
	{
		// Test files get relaxed rules — mocks and test utilities need flexibility
		files: ['src/**/*.spec.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/only-throw-error': 'off'
		}
	},
	{
		// Cucumber step definitions use 'const self = this' for World context
		files: ['src/testing/**/*.ts'],
		rules: {
			'@typescript-eslint/no-this-alias': 'off'
		}
	}
]);
