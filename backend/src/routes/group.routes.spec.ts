// src/routes/group.routes.spec.ts
//
// Regression guard for group payload validation: PUT /group/:repo_id/:group_id and PUT /group/:repo_id
// used to pass unvalidated bodies to the controller, so a null or non-array body crashed it with a
// TypeError (HTTP 500). Each mutating route with a body must run validate() before its controller.

import { describe, it, expect } from 'vitest';
import router from './group.routes.js';
import { createGroupSchema, updateGroupSchema, updateGroupsArraySchema } from '@seed-test/shared/schemas/group.schemas.js';

// Number of middleware handlers registered on a route (authorization, validate, controller).
function handlerCount(method: string, path: string): number {
	const stack = (router as { stack: unknown[] }).stack;
	for (const layer of stack) {
		const route = (layer as { route?: { path: string; methods: Record<string, boolean>; stack: unknown[] } }).route;
		if (route?.path === path && route.methods[method])
			return route.stack.length;
	}
	return -1;
}

describe('group schemas', () => {
	it('rejects a null body for a single group update', () => {
		expect(updateGroupSchema.safeParse(null).success).toBe(false);
	});

	it('rejects a group update without a name or with a non-array member_stories', () => {
		expect(updateGroupSchema.safeParse({ member_stories: [] }).success).toBe(false);
		expect(updateGroupSchema.safeParse({ name: 'G', member_stories: 'abc' }).success).toBe(false);
	});

	it('accepts a group update and defaults member_stories to an empty array', () => {
		const result = updateGroupSchema.safeParse({ _id: '507f1f77bcf86cd799439012', name: 'G', isSequential: true });
		expect(result.success).toBe(true);
		expect(result.success && result.data.member_stories).toEqual([]);
	});

	it('rejects a null or non-array body for the groups array update', () => {
		expect(updateGroupsArraySchema.safeParse(null).success).toBe(false);
		expect(updateGroupsArraySchema.safeParse({ name: 'G' }).success).toBe(false);
		expect(updateGroupsArraySchema.safeParse([{ member_stories: [] }]).success).toBe(false);
	});

	it('accepts an array of groups', () => {
		expect(updateGroupsArraySchema.safeParse([{ name: 'A', member_stories: ['507f1f77bcf86cd799439013'] }]).success).toBe(true);
	});

	it('keeps the create schema requiring a name', () => {
		expect(createGroupSchema.safeParse({ member_stories: [] }).success).toBe(false);
	});
});

describe('group router — body validation', () => {
	it('validates the body of PUT /:repo_id/:group_id before the controller', () => {
		// canEdit + validate + controller
		expect(handlerCount('put', '/:repo_id/:group_id')).toBe(3);
	});

	it('validates the body of PUT /:repo_id before the controller', () => {
		expect(handlerCount('put', '/:repo_id')).toBe(3);
	});

	it('validates the body of POST /:repo_id before the controller', () => {
		expect(handlerCount('post', '/:repo_id')).toBe(3);
	});
});
