import type { Request } from 'express';

/**
 * Reads a named route parameter and normalizes it to a plain string.
 *
 * Express 5 types route params as `string | string[]` (a param captured
 * multiple times in a route path becomes an array). Almost every consumer in
 * this codebase expects a single string, so this helper unwraps the array
 * (first value) and returns `undefined` when the param is absent.
 *
 * @param req - The Express request holding the params.
 * @param name - The route param name (e.g. 'repo_id', '_id', 'storyID').
 * @returns The first param value as a string, or undefined if missing/empty.
 */
export function param(req: Request, name: string): string | undefined {
	const value = req.params[name];
	if (Array.isArray(value)) return value[0];
	return value;
}
