import { z } from 'zod';

/** POST /api/workgroup/:id/members */
export const addMemberSchema = z.object({
	email: z.string().email(),
	canEdit: z.boolean().optional().default(false)
});

/** PUT /api/workgroup/:id/members */
export const updateMemberSchema = z.object({
	email: z.string().email(),
	canEdit: z.boolean()
});

/** DELETE /api/workgroup/:id/members — handles legacy nested {email: {email: "..."}} format */
export const removeMemberSchema = z.object({
	email: z.union([
		z.string().email(),
		z.object({ email: z.string().email() })
	])
});
