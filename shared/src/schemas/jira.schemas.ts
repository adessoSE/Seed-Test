import { z } from 'zod';

/**
 * POST /api/jira/link
 * Discriminated on jiraAuthMethod: Basic auth builds "user:password", so it needs the account name;
 * a Bearer token (PAT) identifies the user by itself, and the Bearer tab has no account-name field.
 * A missing jiraAuthMethod falls through to the Bearer branch, matching the controller default.
 */
export const linkJiraSchema = z.preprocess(
	input => (input && typeof input === 'object' && (input as Record<string, unknown>).jiraAuthMethod === undefined
		? { ...input, jiraAuthMethod: 'bearer' }
		: input),
	z.discriminatedUnion('jiraAuthMethod', [
		z.object({
			jiraAuthMethod: z.literal('basic'),
			jiraAccountName: z.string().min(1, 'Account name is required'),
			jiraPassword: z.string().min(1, 'Password is required'),
			jiraHost: z.string().min(1, 'Host is required')
		}),
		z.object({
			jiraAuthMethod: z.literal('bearer'),
			jiraAccountName: z.string().optional(),
			jiraPassword: z.string().min(1, 'Password is required'),
			jiraHost: z.string().min(1, 'Host is required')
		})
	])
);

/**
 * POST /api/jira/login (legacy route; the frontend no longer calls it)
 * Same auth rule as linkJiraSchema: Basic needs the account name, Bearer does not.
 * A missing AuthMethod falls through to the Bearer branch, matching buildAuthString's default.
 */
export const jiraLoginSchema = z.preprocess(
	input => (input && typeof input === 'object' && (input as Record<string, unknown>).AuthMethod === undefined
		? { ...input, AuthMethod: 'bearer' }
		: input),
	z.discriminatedUnion('AuthMethod', [
		z.object({
			AuthMethod: z.literal('basic'),
			jiraAccountName: z.string().min(1, 'Account name is required'),
			jiraPassword: z.string().min(1, 'Password is required'),
			jiraServer: z.string().min(1, 'Server is required')
		}),
		z.object({
			AuthMethod: z.literal('bearer'),
			jiraAccountName: z.string().optional(),
			jiraPassword: z.string().min(1, 'Password is required'),
			jiraServer: z.string().min(1, 'Server is required')
		})
	])
);

/** PUT /api/jira/xray-status — frontend sends numeric IDs, coerce to string for URL construction */
export const updateXrayStatusSchema = z.object({
	testRunId: z.coerce.string().min(1, 'testRunId is required'),
	stepId: z.coerce.string().min(1, 'stepId is required'),
	status: z.string().min(1, 'status is required')
});
