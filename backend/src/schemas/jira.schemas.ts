import { z } from 'zod';

/** POST /api/jira/link */
export const linkJiraSchema = z.object({
	jiraAccountName: z.string().min(1, 'Account name is required'),
	jiraPassword: z.string().min(1, 'Password is required'),
	jiraHost: z.string().min(1, 'Host is required'),
	jiraAuthMethod: z.enum(['bearer', 'basic']).optional().default('bearer')
});

/** POST /api/jira/login */
export const jiraLoginSchema = z.object({
	jiraAccountName: z.string().min(1, 'Account name is required'),
	jiraPassword: z.string().min(1, 'Password is required'),
	jiraServer: z.string().min(1, 'Server is required'),
	AuthMethod: z.enum(['bearer', 'basic']).optional()
});

/** PUT /api/jira/xray-status */
export const updateXrayStatusSchema = z.object({
	testRunId: z.string().min(1, 'testRunId is required'),
	stepId: z.string().min(1, 'stepId is required'),
	status: z.string().min(1, 'status is required')
});
