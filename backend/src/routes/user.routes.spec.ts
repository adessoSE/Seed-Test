// src/routes/user.routes.spec.ts
//
// Invariant: the unauthenticated POST /user/githubLogin and POST /user/githubRegister routes,
// which minted a full authenticated session from login+id without GitHub verification,
// are never registered on the router.

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

// Number of middleware handlers registered on a route (limiters, auth, validate, controller).
function handlerCount(method: string, path: string): number {
	const stack = (router as { stack: unknown[] }).stack;
	for (const layer of stack) {
		const route = (layer as { route?: { path: string; methods: Record<string, boolean>; stack: unknown[] } }).route;
		if (route?.path === path && route.methods[method])
			return route.stack.length;
	}
	return -1;
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

	it('exposes the POST /mergeGithub/initiate route for proving merge ownership', () => {
		const paths = collectRoutes();
		expect(paths.some(r => r.methods.includes('post') && r.path === '/mergeGithub/initiate')).toBe(true);
	});

	it('exposes the POST /mergeGithub route for completing the merge', () => {
		const paths = collectRoutes();
		expect(paths.some(r => r.methods.includes('post') && r.path === '/mergeGithub')).toBe(true);
	});

	// Regression: the initiate endpoint took an unvalidated body (userId) — it needs a Zod validate() step
	it('limits and validates the body of POST /mergeGithub/initiate (mergeInitiateLimiter, isAuthenticated, validate, controller)', () => {
		expect(handlerCount('post', '/mergeGithub/initiate')).toBe(4);
	});

	// Regression: password-verifying and account-deleting routes had no per-IP brute-force limiter
	it('applies a limiter to POST /update/:userID (passwordLimiter, isAuthenticated, validate, controller)', () => {
		expect(handlerCount('post', '/update/:userID')).toBe(4);
	});

	it('applies a limiter to DELETE / (passwordLimiter, isAuthenticated, controller)', () => {
		expect(handlerCount('delete', '/')).toBe(3);
	});

	// The first handler of a route is its limiter instance. Equal instances share a counter.
	function limiterOf(method: string, path: string): unknown {
		const stack = (router as { stack: unknown[] }).stack;
		for (const layer of stack) {
			const route = (layer as { route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> } }).route;
			if (route?.path === path && route.methods[method])
				return route.stack[0].handle;
		}
		return undefined;
	}

	// Regression: one shared counter let a flood of failed logins block password changes, and the reverse
	it('keeps login, register and password reset on one shared limiter bucket', () => {
		const shared = limiterOf('post', '/login');
		expect(shared).toBeDefined();
		expect(limiterOf('post', '/register')).toBe(shared);
		expect(limiterOf('post', '/resetpassword')).toBe(shared);
		expect(limiterOf('patch', '/reset')).toBe(shared);
	});

	it('keeps password change and account deletion on a bucket separate from login', () => {
		const authBucket = limiterOf('post', '/login');
		const passwordBucket = limiterOf('post', '/update/:userID');
		expect(passwordBucket).toBeDefined();
		expect(passwordBucket).not.toBe(authBucket);
		expect(limiterOf('delete', '/')).toBe(passwordBucket);
	});

	it('gives the merge initiate endpoint its own bucket', () => {
		const initiateBucket = limiterOf('post', '/mergeGithub/initiate');
		expect(initiateBucket).toBeDefined();
		expect(initiateBucket).not.toBe(limiterOf('post', '/login'));
		expect(initiateBucket).not.toBe(limiterOf('post', '/update/:userID'));
	});
});
