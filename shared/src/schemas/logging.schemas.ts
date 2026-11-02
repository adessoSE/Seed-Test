import { z } from 'zod';

/** POST /api/log */
export const logMessageSchema = z.object({
	message: z.string().max(10000).optional(),
	additional: z.any().optional()
});
