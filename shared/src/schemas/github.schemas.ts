import { z } from 'zod';

/** POST /api/github/submitIssue */
export const submitIssueSchema = z.object({
	title: z.string().min(1, 'Issue title is required'),
	body: z.string().optional(),
	assignees: z.array(z.string()).optional(),
	labels: z.array(z.string()).optional(),
	milestone: z.number().int().nullable().optional()
});
