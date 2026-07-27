import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StepType } from '@shared/models/StepType.js';

const mockedExternalAccountService = {
	jiraDecryptPassword: vi.fn().mockReturnValue('decrypted-pass'),
	buildAuthString: vi.fn().mockReturnValue('Basic FAKEAUTH')
};
vi.mock('./externalAccount.service', () => mockedExternalAccountService);

const mockedStepTypeService = {
	showSteptypes: vi.fn()
};
vi.mock('./step-type.service', () => mockedStepTypeService);

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('XrayService', () => {
	let xrayService: typeof import('./xray.service');

	const stepTypes: StepType[] = [
		{ id: 1, pre: 'I am on the website ', mid: '', type: 'Website', stepType: 'given', values: [] },
		{ id: 2, pre: 'I click the button ', mid: '', type: 'Button', stepType: 'when', values: [] },
		{ id: 3, pre: 'I can see the text ', mid: '', type: 'Text', stepType: 'then', values: [] }
	];

	const mockUser = {
		_id: 'user-id',
		email: 'test@test.com',
		jira: {
			AccountName: 'jira-user',
			AuthMethod: 'basic',
			Host: 'jira.example.com',
			Password: Buffer.from('enc'),
			Password_Nonce: Buffer.from('nonce'),
			Password_Tag: Buffer.from('tag')
		}
	};

	beforeEach(async () => {
		xrayService = await vi.importActual<typeof import('./xray.service')>('./xray.service');
		vi.clearAllMocks();
		mockedStepTypeService.showSteptypes.mockResolvedValue([...stepTypes, { id: 99, pre: '', mid: '', type: 'Add Variable', stepType: 'given', values: [] }]);
	});

	describe('deleteXrayStep', () => {
		it('should send DELETE request to correct XRay URL', async () => {
			mockFetch.mockResolvedValue({ ok: true });

			await xrayService.deleteXrayStep(mockUser as any, 'JIRA-123', 5);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://jira.example.com/rest/raven/1.0/api/test/JIRA-123/step/5/',
				expect.objectContaining({ method: 'DELETE' })
			);
			expect(mockedExternalAccountService.jiraDecryptPassword).toHaveBeenCalled();
		});

		it('should throw if user has no Jira account', async () => {
			await expect(xrayService.deleteXrayStep({ email: 'x' } as any, 'KEY-1', 1))
				.rejects.toThrow('no linked Jira account');
		});

		it('should throw if testKey is empty', async () => {
			await expect(xrayService.deleteXrayStep(mockUser as any, '', 1))
				.rejects.toThrow('Test Key');
		});

		it('should throw on non-ok response', async () => {
			mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', text: () => Promise.resolve('Not found') });

			await expect(xrayService.deleteXrayStep(mockUser as any, 'KEY-1', 1))
				.rejects.toThrow('Failed to delete XRay step');
		});
	});

	describe('handleTestIssue', () => {
		it('should fetch test runs and steps, then process them', async () => {
			const issue = { key: 'TEST-1' };
			const options = { headers: { Authorization: 'Basic x' } };

			mockFetch
				.mockResolvedValueOnce({ json: () => Promise.resolve([{ id: 100 }]) })
				.mockResolvedValueOnce({ json: () => Promise.resolve({ id: 100, steps: [], testExecKey: 'EXEC-1' }) })
				.mockResolvedValueOnce({
					json: () => Promise.resolve({
						steps: [{
							id: 1,
							index: 1,
							fields: {
								Given: { value: 'I am on the website https://example.com' },
								Action: { value: { raw: 'I click the button Submit' } },
								'Expected Result': { value: { raw: 'I can see the text Success' } }
							}
						}]
					})
				});

			const result = await xrayService.handleTestIssue(issue, options, 'jira.example.com');

			expect(result.scenarioList).toHaveLength(1);
			expect(result.scenarioList[0].stepDefinitions!.given).toHaveLength(1);
			expect(result.scenarioList[0].stepDefinitions!.given[0].values).toContain('https://example.com');
			expect(result.scenarioList[0].stepDefinitions!.when).toHaveLength(1);
			expect(result.scenarioList[0].stepDefinitions!.then).toHaveLength(1);
		});

		it('should filter out Add Variable step types', async () => {
			const issue = { key: 'TEST-2' };
			mockFetch
				.mockResolvedValueOnce({ json: () => Promise.resolve([]) })
				.mockResolvedValueOnce({ json: () => Promise.resolve({ steps: null }) });

			const result = await xrayService.handleTestIssue(issue, {}, 'host');

			expect(result.scenarioList).toHaveLength(0);
			expect(result.testStepDescription).toBe('No steps found.');
		});

		it('should skip steps without fields', async () => {
			const issue = { key: 'TEST-3' };
			mockFetch
				.mockResolvedValueOnce({ json: () => Promise.resolve([]) })
				.mockResolvedValueOnce({
					json: () => Promise.resolve({
						steps: [
							{ id: 1, index: 1 },
							{ id: 2, index: 2, fields: { Given: { value: 'I am on the website test.com' } } }
						]
					})
				});

			const result = await xrayService.handleTestIssue(issue, {}, 'host');

			expect(result.scenarioList).toHaveLength(1);
			expect(result.scenarioList[0].scenario_id).toBe(2);
		});
	});
});
