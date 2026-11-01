import { describe, it, expect } from 'vitest';
import { generateAiScenariosSchema } from '@seed-test/shared/schemas/repository.schemas.js';

describe('generateAiScenariosSchema', () => {
	const provider = { provider: 'custom', name: 'local', modelName: 'mistral', baseURL: 'http://localhost:11434/v1' };

	it('accepts the nested aiConfig shape', () => {
		const result = generateAiScenariosSchema.safeParse({ aiConfig: { textPreparation: provider, jsonConversion: provider } });
		expect(result.success).toBe(true);
	});

	// Older projects and exports store a flat aiConfig; without this rule the AI job crashed with a TypeError.
	it('rejects the legacy flat aiConfig with a message naming the expected shape', () => {
		const result = generateAiScenariosSchema.safeParse({
			aiConfig: { provider: 'ollama', ollamaUrl: 'http://localhost:11434', defaultTextModel: 'mistral', defaultJsonModel: 'codellama', apiKey: '' }
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((i) => i.message).join(' ')).toContain('textPreparation');
	});

	it('rejects a missing aiConfig', () => {
		expect(generateAiScenariosSchema.safeParse({}).success).toBe(false);
	});
});
