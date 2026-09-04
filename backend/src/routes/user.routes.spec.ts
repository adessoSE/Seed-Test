// src/routes/user.routes.spec.ts
//
// Regression guard for the GitHub auth-bypass fix: the insecure public
// POST /user/githubLogin and POST /user/githubRegister routes (which minted a
// full authenticated session from just login+id with no GitHub verification)
// must never be registered on the router again.

import { describe, it, expect } from 'vitest';
import router from './user.routes.js';

// Flatten the router's middleware chain into the mounted Route handlers.
function collectRoutes(): Array<{ methods: string[]; path: string }> {
	const routes: Array<{ methods: string[]; path: string }> = [];
	const stack = (router as { stack: unknown[] }).stack;
	for (const layer of stack) {
		const route = (layer as { route?: { path: string; methods: Record<string, boolean> } }).route;
		if (!route) continue; // non-route layers (rate limiters, middleware) are skipped
		routes.push({
			methods: Object.keys(route.methods).filter(m => route.methods[m]),
			path: route.path
		});
	}
	return routes;
}

describe('user router — GitHub auth hardening', () => {
	it('does not expose the insecure POST /githubLogin route', () => {
		const paths = collectRoutes();
		expect(paths.some(r => r.methods.includes('post') && r.path === '/githubLogin')).toBe(false);
	});

	it('does not expose the insecure POST /githubRegister route', () => {
		const paths = collectRoutes();
		expect(paths.some(r => r.methods.includes('post') && r.path === '/githubRegister')).toBe(false);
	});

	it('still exposes the server-verified GitHub OAuth callback route', () => {
		const paths = collectRoutes();
		expect(paths.some(r => r.methods.includes('get') && r.path === '/callback')).toBe(true);
	});
});
