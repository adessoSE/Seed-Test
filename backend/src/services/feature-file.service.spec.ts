// src/services/feature-file.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as featureFileService from './feature-file.service.js';

// Import dependencies to be mocked
import * as blockService from './block.service.js';

// Import types for creating mock data
import { Story } from '@shared/models/Story.js';
import { Block } from '@shared/models/Block.js';
import { Scenario } from '@shared/models/Scenario.js';

// --- 1. Mock Dependencies ---
vi.mock('./story.service', () => ({
	getOneStory: vi.fn()
}));
vi.mock('./block.service', () => ({
	getBlock: vi.fn()
}));

// --- 2. Setup typed mocks ---
const mockedBlockService = vi.mocked(blockService);

// --- 3. The Test Suite ---
describe('FeatureFileService', () => {

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();
		mockedBlockService.getBlock.mockReset();
	});

	// --- Test for a simple utility function ---
	describe('cleanFileName', () => {
		it('should replace special characters but preserve the dot', () => {
			const input = 'My Feature (Test 1!)/.feature';
			// This expectation is correct and will pass once the function is fixed
			const expected = 'My_Feature__Test_1___.feature';
			expect(featureFileService.cleanFileName(input)).toBe(expected);
		});
	});

	// --- Test for the main Gherkin generator ---
	describe('getFeatureContent', () => {
		it('should generate a complete feature file string using real step definitions', () => {
			// A. Arrange
			const mockStory: Story = {
				_id: 'story123abc',
				title: 'User Login',
				body: 'As a user, I want to log in.',
				background: {
					name: 'Background',
					stepDefinitions: {
						when: [
							{ id: 0, pre: 'I am on the website:', mid: '', values: ['http://test.com'], stepType: 'when', type: 'Website / URL' }
						]
					}
				},
				scenarios: [
					{
						scenario_id: 1,
						name: 'Successful Login (Outline)',
						comment: 'This is a scenario comment\nwith multiple lines.',
						stepDefinitions: {
							given: [
								{ id: 500, pre: 'Recommended Title:', mid: '', values: ['User Has Account'], stepType: 'given', type: 'New Step' }
							],
							when: [
								{ id: 1, pre: 'I insert', mid: 'into the field ', values: ['<user>', '<pass>'], stepType: 'when', type: 'Textfield' }
							],
							then: [
								{ id: 1, pre: 'So I can see the text:', mid: '', values: ['Dashboard'], stepType: 'then', type: 'Check Text on Page' }
							],
							example: [
								{ id: 0, pre: '', mid: '', values: ['user', 'password'], stepType: 'example', type: 'Add Variable' },
								{ id: 0, pre: '', mid: '', values: ['test@user.com', 'pass123'], stepType: 'example', type: 'Add Variable' }
							]
						}
					},
					{
						scenario_id: 2,
						name: 'Failed Login (Simple)',
						comment: '',
						stepDefinitions: {
							given: [],
							when: [],
							then: [
								{ id: 2, pre: "So I can't see the text:", mid: '', values: ['Dashboard'], stepType: 'then', type: 'Text Not on Page' }
							]
						}
					}
				],
				story_id: 123,
				storySource: 'db',
				repo_type: 'db',
				state: 'open',
				assignee: 'unassigned',
				assignee_avatar_url: ''
			};

			// B. Act
			const content = featureFileService.getFeatureContent(mockStory);
      
			// C. Assert
			expect(content).include('Feature: User Login');
			expect(content).include('As a user, I want to log in.');
			expect(content).include('Background:');
			expect(content).include("When I am on the website: 'http://test.com'");
			expect(content).include('@story123abc_1');
			expect(content).include('Scenario Outline: Successful Login (Outline)');
			expect(content).include("Given Recommended Title: 'User Has Account'");
			expect(content).include("When I insert '<user>' into the field '<pass>'");
			expect(content).include("Then So I can see the text: 'Dashboard'");
			expect(content).include('Examples:');
			expect(content).include('| user | password |');
			expect(content).include('| test@user.com | pass123 |');
			expect(content).include('# Comment:');
			expect(content).include('#  with multiple lines.');
			expect(content).include('@story123abc_2');
			expect(content).include('Scenario: Failed Login (Simple)');
			expect(content).include("Then So I can't see the text: 'Dashboard'");
		});
	});

	// --- Test for complex data transformation logic ---
	describe('replaceRefBlocks', () => {

		it('should expand a referenced block into its steps', async () => {
			// A. Arrange
			const mockBlockId = 'block-object-id-123';
			const mockBlock: Block = {
				_id: mockBlockId,
				name: 'Login Block',
				owner: 'user123',
				repositoryId: 'repo123',
				stepDefinitions: {
					given: [
						{ id: 11, pre: 'I click the button:', mid: '', values: ['Login Modal Button'], stepType: 'given', type: 'Button' }
					],
					when: [
						{ id: 15, pre: 'I insert', mid: 'into the field ', values: ['user@test.com', 'user-field'], stepType: 'given', type: 'Textfield' },
						{ id: 15, pre: 'I insert', mid: 'into the field ', values: ['pass123', 'pass-field'], stepType: 'given', type: 'Textfield' }
					],
					then: []
				}
			};
      
			mockedBlockService.getBlock.mockResolvedValue(mockBlock);

			const scenarios: Scenario[] = [
				{
					scenario_id: 1,
					name: 'Test with block',
					hasRefBlock: true, // This flag triggers the logic
					stepDefinitions: {
						given: [
							{ _blockReferenceId: mockBlockId, id: 500, pre: 'Recommended Title:', mid: '', values: ['BLOCK: Login Block'], stepType: 'given', type: 'TestStep' }
						],
						when: [], // This array is initially empty
						then: [
							{ id: 1, pre: 'So I can see the text:', mid: '', values: ['Dashboard'], stepType: 'then', type: 'Check Text on Page' }
						]
					},
					comment: '' 
				}
			];

			// B. Act
			const expandedScenarios = await featureFileService.replaceRefBlocks(scenarios);

			// C. Assert
			expect(mockedBlockService.getBlock).toHaveBeenCalledWith(mockBlockId);
			expect(expandedScenarios).toHaveLength(1);
      
			const givenSteps = expandedScenarios[0].stepDefinitions.given;
			const whenSteps = expandedScenarios[0].stepDefinitions.when;
			const thenSteps = expandedScenarios[0].stepDefinitions.then;
      
			// The function correctly flattens all 3 steps (1 given, 2 when) from the block
			// into the 'given' array, where the reference was.
			expect(givenSteps).toHaveLength(3); 
			expect(givenSteps[0].pre).toBe('I click the button:'); // from block.given
			expect(givenSteps[1].pre).toBe('I insert'); // from block.when
			expect(givenSteps[2].values[0]).toBe('pass123'); // from block.when
      
			expect(whenSteps).toHaveLength(0); 
			expect(thenSteps).toHaveLength(1);
			expect(thenSteps[0].pre).toBe('So I can see the text:');
		});

		it('should return scenarios unchanged if hasRefBlock is false or undefined', async () => {
			// A. Arrange
			const originalScenarios: Scenario[] = [
				{
					scenario_id: 1, name: 'Test without block',
					hasRefBlock: false, 
					stepDefinitions: { given: [], when: [], then: [] },
					comment: ''
				},
				{
					scenario_id: 2, name: 'Test with undefined flag',
					stepDefinitions: { given: [], when: [], then: [] },
					comment: ''
				}
			];
      
			// B. Act
			const result = await featureFileService.replaceRefBlocks(originalScenarios);

			// C. Assert
			expect(mockedBlockService.getBlock).not.toHaveBeenCalled();
			expect(result).toBe(originalScenarios); 
		});
	});

});