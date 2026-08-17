import { z } from 'zod';

/** POST /api/sanity/test/:repoID/:groupID — auth credentials for passport */
export const sanityTestSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1)
});
