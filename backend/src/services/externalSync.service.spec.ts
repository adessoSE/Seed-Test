// src/services/externalSync.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// Import the service to test (dynamically, to handle cycles)
import type * as ExternalSyncService from './externalSync.service.js';

// Import types
import { User } from '@shared/models/User.js';
import { Story } from '@shared/models/Story.js';
import { Repository } from '@shared/models/Repository.js';
import { StepType } from '@shared/models/StepType.js';
import { Scenario } from '@shared/models/Scenario.js';

// --- 1. Mock all external dependencies ---
const mockDb = { collection: vi.fn() };
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));

const mockedRepoService = {
	getOneJiraRepository: vi.fn(),
	getOneRepositoryById: vi.fn(),
	updateStoriesArrayInRepo: vi.fn()
};
vi.mock('./repository.service', () => mockedRepoService);

const mockedStoryService = {
	getOneStory: vi.fn(),
	upsertStoryByExternalId: vi.fn((_id, story) => Promise.resolve({ value: story })) 
};
vi.mock('./story.service', () => mockedStoryService);

const mockedXrayService = {
	handleTestIssue: vi.fn()
};
vi.mock('./xray.service', () => mockedXrayService);

const mockedFeatureFileService = {
	writeFile: vi.fn()
};
vi.mock('./feature-file.service', () => mockedFeatureFileService);

const mockedExternalAccountService = {
	jiraDecryptPassword: vi.fn().mockReturnValue('decrypted-password'),
	buildAuthString: vi.fn().mockReturnValue('Basic FAKEAUTHSTRING')
};
vi.mock('./externalAccount.service', () => mockedExternalAccountService);

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);


// --- 2. The Test Suite ---
describe('ExternalSyncService', () => {

	let externalSyncService: typeof ExternalSyncService;

	// Define reusable mock data
	const mockUser: User = {
		_id: new ObjectId(),
		email: 'test@test.com',
		jira: {
			Host: 'jira.example.com',
			AccountName: 'jira-user',
			Password: 'encrypted-password' as any, 
			Password_Nonce: 'nonce' as any,
			Password_Tag: 'tag' as any,
			AuthMethod: 'basic'
		},
		github: { 
			githubToken: 'gh-token', 
			login: 'github-user',
			id: 12345 
		}
	};

	const mockRepo: Repository = {
		_id: new ObjectId(),
		owner: new ObjectId(),
		repoName: 'JIRA-PROJECT',
		stories: [],
		repoType: 'jira',
		groups: []
	};

	// 'stepA' and 'stepA_updated' MUST have the same pre/mid/post to be recognized as an update.
	// Only 'values' (or other properties) should change.
	const stepA: StepType = { id: 1, pre: 'Step A (Shared Key)', mid: '', type: 'Given', stepType: 'given', values: ['old-value'] };
	const stepB: StepType = { id: 2, pre: 'Step B (DB Only)', mid: '', type: 'When', stepType: 'when', values: [] };
	const stepA_updated: StepType = { id: 1, pre: 'Step A (Shared Key)', mid: '', type: 'Given', stepType: 'given', values: ['new-value'] };
	const stepC_new: StepType = { id: 3, pre: 'Step C (Jira New)', mid: '', type: 'Then', stepType: 'then', values: [] };
	// ----------------

	beforeEach(async () => {
		externalSyncService = await vi.importActual<typeof ExternalSyncService>('./externalSync.service');
		vi.clearAllMocks(); 

		mockedRepoService.getOneJiraRepository.mockResolvedValue(mockRepo);
		mockedRepoService.getOneRepositoryById.mockResolvedValue(mockRepo);
		mockedRepoService.updateStoriesArrayInRepo.mockResolvedValue(null as any);
		mockedFeatureFileService.writeFile.mockResolvedValue(undefined);
	});

	describe('getStoriesFromSource (Jira Sync)', () => {

		it('should correctly merge steps, keeping DB order (Happy Path)', async () => {
			// --- A. Arrange ---
			// 1. Mock 'fetch' for Jira issues
			const mockJiraIssue = { 
				id: 10001, // Must be a number
				key: 'JIRA-1', 
				fields: { 
					summary: 'Jira Story 1', 
					issuetype: { name: 'Test' },
					status: { name: 'In Progress' },
					assignee: null 
				}
			};
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ issues: [mockJiraIssue] })
			});

			// 2. Mock 'storyService' to return an existing DB story
			const dbStory: Story = {
				_id: new ObjectId(),
				story_id: 10001,
				title: 'DB Story 1',
				scenarios: [
					{
						scenario_id: 1,
						name: 'Scenario 1',
						comment: '',
						stepDefinitions: { given: [stepA], when: [stepB], then: [] }
					}
				],
				body: '', repo_type: 'jira', state: 'open', assignee: '', assignee_avatar_url: '', storySource: 'jira',
				background: undefined as any 
			};
			mockedStoryService.getOneStory.mockResolvedValue(dbStory);

			// 3. Mock 'xrayService'
			// Jira only sends 'stepA_updated'. This should now match 'stepA'
			mockedXrayService.handleTestIssue.mockResolvedValue({
				scenarioList: [{
					scenario_id: 1,
					name: 'Scenario 1 (Jira Name)',
					stepDefinitions: { given: [stepA_updated], when: [], then: [] }
				}] as Scenario[],
				testStepDescription: ''
			});

			// --- B. Act ---
			await externalSyncService.getStoriesFromSource(mockUser, { source: 'jira', projectKey: 'JIRA-PROJECT' });

			// --- C. Assert ---
			expect(mockedStoryService.upsertStoryByExternalId).toHaveBeenCalledTimes(1);
      
			const savedStory = mockedStoryService.upsertStoryByExternalId.mock.calls[0][1] as Story;
			const savedScenarios = savedStory.scenarios;
      
			expect(savedScenarios).toHaveLength(1);
      
			const mergedGiven = savedScenarios[0].stepDefinitions.given;
			const mergedWhen = savedScenarios[0].stepDefinitions.when;

			// This test now correctly hits the if (allJiraInDb) block
			expect(mergedGiven).toHaveLength(1); // (stepA_updated)
			expect(mergedGiven[0].pre).toBe('Step A (Shared Key)');
			expect(mergedGiven[0].values).toEqual(['new-value']); // Value from Jira

			expect(mergedWhen).toHaveLength(1); // (stepB)
			expect(mergedWhen[0].pre).toBe('Step B (DB Only)'); // Preserved from DB
		});

		it('should correctly merge steps, using Jira order (New Step)', async () => {
			// --- A. Arrange ---
			// 1. Mock 'fetch'
			const mockJiraIssue = { 
				id: 10002, // Must be a number
				key: 'JIRA-2', 
				fields: { 
					summary: 'Jira Story 2', 
					issuetype: { name: 'Test' },
					status: { name: 'Done' },
					assignee: { 
						name: 'Jira User', 
						avatarUrls: { '32x32': 'http://avatar.url' } 
					}
				}
			};
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ issues: [mockJiraIssue] })
			});

			// 2. Mock 'storyService' (existing DB story)
			const dbStory: Story = {
				_id: new ObjectId(),
				story_id: 10002,
				title: 'DB Story 2',
				scenarios: [
					{
						scenario_id: 1,
						name: 'Scenario 1',
						comment: '',
						stepDefinitions: { given: [stepA], when: [stepB], then: [] } // DB has A and B
					}
				],
				body: '', repo_type: 'jira', state: 'open', assignee: '', assignee_avatar_url: '', storySource: 'jira',
				background: undefined as any 
			};
			mockedStoryService.getOneStory.mockResolvedValue(dbStory);

			// 3. Mock 'xrayService'
			// Jira sends A (updated) and C (new)
			mockedXrayService.handleTestIssue.mockResolvedValue({
				scenarioList: [{
					scenario_id: 1,
					name: 'Scenario 1 (Jira Name)',
					stepDefinitions: { given: [stepA_updated], when: [], then: [stepC_new] }
				}] as Scenario[],
				testStepDescription: ''
			});

			// --- B. Act ---
			await externalSyncService.getStoriesFromSource(mockUser, { source: 'jira', projectKey: 'JIRA-PROJECT' });

			// --- C. Assert ---
			expect(mockedStoryService.upsertStoryByExternalId).toHaveBeenCalledTimes(1);
      
			const savedStory = mockedStoryService.upsertStoryByExternalId.mock.calls[0][1] as Story;
			const savedScenarios = savedStory.scenarios;
      
			const mergedGiven = savedScenarios[0].stepDefinitions.given;
			const mergedWhen = savedScenarios[0].stepDefinitions.when;
			const mergedThen = savedScenarios[0].stepDefinitions.then;
      
			// This test correctly hits the else block
			// Jira steps (A_updated, C_new) come first.
			// DB-only steps (B) are appended.
      
			expect(mergedGiven).toHaveLength(1); // (stepA_updated)
			expect(mergedGiven[0].pre).toBe('Step A (Shared Key)');

			expect(mergedThen).toHaveLength(1); // (stepC_new)
			expect(mergedThen[0].pre).toBe('Step C (Jira New)');

			expect(mergedWhen).toHaveLength(1); // (stepB)
			expect(mergedWhen[0].pre).toBe('Step B (DB Only)'); // Appended from DB
		});
	});

});