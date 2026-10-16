import { describe, it, expect } from 'vitest';
import { linkJiraSchema, jiraLoginSchema } from '@seed-test/shared/schemas/jira.schemas.js';

const HOST = 'jira.example.com';

describe('linkJiraSchema', () => {
	// Bearer tokens (PAT) identify the user on their own, so the account name must not be required.
	it('accepts bearer without jiraAccountName', () => {
		const result = linkJiraSchema.safeParse({ jiraAuthMethod: 'bearer', jiraPassword: 'token-123', jiraHost: HOST });
		expect(result.success).toBe(true);
	});

	it('accepts a missing jiraAuthMethod without jiraAccountName and defaults it to bearer', () => {
		const result = linkJiraSchema.safeParse({ jiraPassword: 'token-123', jiraHost: HOST });
		expect(result.success).toBe(true);
		expect(result.data?.jiraAuthMethod).toBe('bearer');
	});

	it('rejects bearer without a token', () => {
		const result = linkJiraSchema.safeParse({ jiraAuthMethod: 'bearer', jiraHost: HOST });
		expect(result.success).toBe(false);
	});

	it('accepts basic with jiraAccountName and password', () => {
		const result = linkJiraSchema.safeParse({ jiraAuthMethod: 'basic', jiraAccountName: 'user', jiraPassword: 'pass123', jiraHost: HOST });
		expect(result.success).toBe(true);
	});

	// Basic auth builds "user:password" — without the account name the header would be invalid.
	it('rejects basic without jiraAccountName', () => {
		const result = linkJiraSchema.safeParse({ jiraAuthMethod: 'basic', jiraPassword: 'pass123', jiraHost: HOST });
		expect(result.success).toBe(false);
	});

	it('rejects basic with an empty jiraAccountName', () => {
		const result = linkJiraSchema.safeParse({ jiraAuthMethod: 'basic', jiraAccountName: '', jiraPassword: 'pass123', jiraHost: HOST });
		expect(result.success).toBe(false);
	});
});

describe('jiraLoginSchema', () => {
	// Same auth rule as linkJiraSchema: the login route must not demand an account name that a Bearer token does not need.
	it('accepts bearer without jiraAccountName', () => {
		const result = jiraLoginSchema.safeParse({ AuthMethod: 'bearer', jiraPassword: 'token-123', jiraServer: HOST });
		expect(result.success).toBe(true);
	});

	it('accepts a missing AuthMethod without jiraAccountName (buildAuthString defaults to Bearer)', () => {
		const result = jiraLoginSchema.safeParse({ jiraPassword: 'token-123', jiraServer: HOST });
		expect(result.success).toBe(true);
	});

	it('rejects basic without jiraAccountName', () => {
		const result = jiraLoginSchema.safeParse({ AuthMethod: 'basic', jiraPassword: 'pass123', jiraServer: HOST });
		expect(result.success).toBe(false);
	});

	it('accepts basic with jiraAccountName, password and server', () => {
		const result = jiraLoginSchema.safeParse({ AuthMethod: 'basic', jiraAccountName: 'user', jiraPassword: 'pass123', jiraServer: HOST });
		expect(result.success).toBe(true);
	});

	it('rejects an unknown AuthMethod', () => {
		const result = jiraLoginSchema.safeParse({ AuthMethod: 'oauth', jiraAccountName: 'user', jiraPassword: 'pass123', jiraServer: HOST });
		expect(result.success).toBe(false);
	});
});
