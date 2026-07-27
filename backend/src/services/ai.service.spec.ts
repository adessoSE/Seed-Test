import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Story } from '@shared/models/Story.js';
import type { AiConfig } from '@shared/models/RepositoryContainer.js';

// --- Mock Dependencies ---

const mockedStoryService = {
	getOneStory: vi.fn(),
	updateStory: vi.fn()
};
vi.mock('./story.service', () => mockedStoryService);

const mockedRepoService = {
	getOneRepositoryById: vi.fn(),
	getRepoSettingsById: vi.fn()
};
vi.mock('./repository.service', () => mockedRepoService);

const mockedCryptoHelper = {
	decrypt: vi.fn((val: string) => `decrypted-${val}`)
};
vi.mock('../helpers/cryptoHelper', () => mockedCryptoHelper);

const mockedAiParser = {
	parseTextToStory: vi.fn()
};
vi.mock('@seed-test/ai-parser', () => mockedAiParser);

// --- Test Suite ---
describe('AiService', () => {

	let aiService: typeof import('./ai.service');

	const storyId = new ObjectId().toHexString();
	const repoId = new ObjectId().toHexString();

	const localAiConfig: AiConfig = {
		textPreparation: {
			provider: 'custom',
			name: 'local',
			modelName: 'mistral',
			baseURL: 'http://localhost:11434/v1'
		},
		jsonConversion: {
			provider: 'custom',
			name: 'local',
			modelName: 'codellama',
			baseURL: 'http://localhost:11434/v1'
		}
	};

	const cloudAiConfig: AiConfig = {
		textPreparation: {
			provider: 'custom',
			name: 'cloud',
			modelName: 'gpt-4',
			baseURL: 'https://api.openai.com/v1',
			apiKey: 'enc-text-key'
		},
		jsonConversion: {
			provider: 'custom',
			name: 'cloud',
			modelName: 'gpt-4',
			baseURL: 'https://api.openai.com/v1',
			apiKey: 'enc-json-key'
		}
	};

	const mockStory: Story = {
		_id: new ObjectId(storyId),
		story_id: 1,
		title: 'Test Story',
		body: 'As a user I want to login so that I can access my dashboard',
		scenarios: [],
		repo_type: 'db',
		state: 'open',
		assignee: '',
		assignee_avatar_url: '',
		storySource: 'db',
		background: undefined as any
	};

	const parsedResult = {
		scenarios: [
			{
				scenario_id: 1,
				name: 'Login with valid credentials',
				stepDefinitions: {
					given: [{ id: 1, pre: 'I am on the login page', mid: '', type: 'Given', stepType: 'given', values: [] }],
					when: [{ id: 2, pre: 'I enter valid credentials', mid: '', type: 'When', stepType: 'when', values: [] }],
					then: [{ id: 3, pre: 'I see the dashboard', mid: '', type: 'Then', stepType: 'then', values: [] }]
				}
			}
		],
		background: { name: 'Background', stepDefinitions: { given: [] } }
	};

	beforeEach(async () => {
		aiService = await vi.importActual<typeof import('./ai.service')>('./ai.service');
		aiService._resetParserStateForTesting();
		vi.clearAllMocks();

		mockedStoryService.getOneStory.mockResolvedValue({ ...mockStory });
		mockedStoryService.updateStory.mockResolvedValue({ ok: 1 });
		mockedAiParser.parseTextToStory.mockResolvedValue(parsedResult);
	});

	afterEach(() => {
		aiService.aiJobEmitter.removeAllListeners();
	});

	describe('isAiParserAvailable', () => {

		it('should return true when parser module can be loaded', async () => {
			const available = await aiService.isAiParserAvailable();
			expect(available).toBe(true);
		});
	});

	describe('queueAiScenarioGeneration (local provider)', () => {

		it('should generate scenarios and save them as aiSuggestion', async () => {
			const done = new Promise<void>((resolve) => {
				aiService.aiJobEmitter.once(`job-done-${storyId}`, (data) => {
					expect(data.status).toBe('suggestion-ready');
					expect(data.storyId).toBe(storyId);
					resolve();
				});
			});

			aiService.queueAiScenarioGeneration(storyId, { ...localAiConfig }, repoId);
			await done;

			expect(mockedStoryService.getOneStory).toHaveBeenCalledWith(storyId);
			expect(mockedAiParser.parseTextToStory).toHaveBeenCalledWith({
				inputText: mockStory.body,
				config: expect.objectContaining({
					textPreparation: expect.objectContaining({ name: 'local' })
				})
			});

			const savedStory = mockedStoryService.updateStory.mock.calls[0][0] as Story;
			expect(savedStory.aiSuggestion).toBeDefined();
			expect(savedStory.aiSuggestion.scenarios).toHaveLength(1);
			expect(savedStory.aiSuggestion.scenarios[0].name).toBe('Login with valid credentials');
			expect(savedStory.aiSuggestion.metadata.modelsUsed.textModel).toBe('mistral');
			expect(savedStory.aiSuggestion.metadata.modelsUsed.jsonModel).toBe('codellama');
		});
	});

	describe('queueAiScenarioGeneration (cloud provider)', () => {

		it('should decrypt API keys before calling the parser', async () => {
			const mockRepo = {
				_id: new ObjectId(repoId),
				aiConfig: {
					textPreparation: { apiKey: 'enc-text-key' },
					jsonConversion: { apiKey: 'enc-json-key' }
				}
			} as any;
			mockedRepoService.getOneRepositoryById.mockResolvedValue(mockRepo);

			const done = new Promise<void>((resolve) => {
				aiService.aiJobEmitter.once(`job-done-${storyId}`, (data) => {
					expect(data.status).toBe('suggestion-ready');
					resolve();
				});
			});

			aiService.queueAiScenarioGeneration(storyId, { ...cloudAiConfig }, repoId);
			await done;

			expect(mockedRepoService.getOneRepositoryById).toHaveBeenCalledWith(repoId);
			expect(mockedCryptoHelper.decrypt).toHaveBeenCalledWith('enc-text-key');
			expect(mockedCryptoHelper.decrypt).toHaveBeenCalledWith('enc-json-key');
		});
	});

	describe('error handling', () => {

		it('should emit error when story is not found', async () => {
			mockedStoryService.getOneStory.mockResolvedValue(null);

			const done = new Promise<void>((resolve) => {
				aiService.aiJobEmitter.once(`job-done-${storyId}`, (data) => {
					expect(data.status).toBe('error');
					expect(data.error).toBe('Story not found');
					resolve();
				});
			});

			aiService.queueAiScenarioGeneration(storyId, { ...localAiConfig }, repoId);
			await done;

			expect(mockedStoryService.updateStory).not.toHaveBeenCalled();
		});

		it('should emit error when story body is empty', async () => {
			mockedStoryService.getOneStory.mockResolvedValue({ ...mockStory, body: '' });

			const done = new Promise<void>((resolve) => {
				aiService.aiJobEmitter.once(`job-done-${storyId}`, (data) => {
					expect(data.status).toBe('error');
					expect(data.error).toBe('No input from story description found');
					resolve();
				});
			});

			aiService.queueAiScenarioGeneration(storyId, { ...localAiConfig }, repoId);
			await done;
		});

		it('should emit error when parser returns no scenarios', async () => {
			mockedAiParser.parseTextToStory.mockResolvedValue({ scenarios: [] });

			const done = new Promise<void>((resolve) => {
				aiService.aiJobEmitter.once(`job-done-${storyId}`, (data) => {
					expect(data.status).toBe('error');
					expect(data.error).toBe('AI-Parser did not generate any valid scenarios.');
					resolve();
				});
			});

			aiService.queueAiScenarioGeneration(storyId, { ...localAiConfig }, repoId);
			await done;
		});

		it('should emit error when cloud config has no project aiConfig', async () => {
			mockedRepoService.getOneRepositoryById.mockResolvedValue({ _id: new ObjectId(repoId) });

			const done = new Promise<void>((resolve) => {
				aiService.aiJobEmitter.once(`job-done-${storyId}`, (data) => {
					expect(data.status).toBe('error');
					expect(data.error).toContain('no AI config was found');
					resolve();
				});
			});

			aiService.queueAiScenarioGeneration(storyId, { ...cloudAiConfig }, repoId);
			await done;
		});
	});

	describe('JobQueue sequential processing', () => {

		it('should process multiple jobs sequentially', async () => {
			const storyId2 = new ObjectId().toHexString();
			const mockStory2 = { ...mockStory, _id: new ObjectId(storyId2), title: 'Story 2' };

			const callOrder: string[] = [];
			mockedStoryService.getOneStory.mockImplementation(async (id: string) => {
				callOrder.push(`get-${id}`);
				return id === storyId ? { ...mockStory } : { ...mockStory2 };
			});
			mockedStoryService.updateStory.mockImplementation(async (story: Story) => {
				callOrder.push(`update-${story._id}`);
				return { ok: 1 };
			});

			const done1 = new Promise<void>((resolve) => {
				aiService.aiJobEmitter.once(`job-done-${storyId}`, () => resolve());
			});
			const done2 = new Promise<void>((resolve) => {
				aiService.aiJobEmitter.once(`job-done-${storyId2}`, () => resolve());
			});

			aiService.queueAiScenarioGeneration(storyId, { ...localAiConfig }, repoId);
			aiService.queueAiScenarioGeneration(storyId2, { ...localAiConfig }, repoId);

			await Promise.all([done1, done2]);

			expect(callOrder[0]).toBe(`get-${storyId}`);
			expect(callOrder[1]).toBe(`update-${storyId}`);
			expect(callOrder[2]).toBe(`get-${storyId2}`);
			expect(callOrder[3]).toBe(`update-${storyId2}`);
		});
	});
});
