import { z } from 'zod';

/** POST /api/script/Group — auth fields consumed by passport, controller fields by runGroupViaScript */
export const scriptGroupSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
	stayLoggedIn: z.boolean().optional(),
	repoID: z.string().min(1, 'Repository ID is required'),
	groupID: z.string().min(1, 'Group ID is required')
}).passthrough();

/** POST /api/script/Feature/:issueID — auth fields + repositoryId */
export const scriptFeatureSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
	stayLoggedIn: z.boolean().optional(),
	repositoryId: z.string().min(1, 'Repository ID is required')
}).passthrough();
