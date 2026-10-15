// src/routes/story.routes.spec.ts
//
// Regression guard for story payload validation: PUT /story/:story_id/:_id, PATCH /story/:story_id and
// PUT /story/:_id passed unvalidated bodies straight into database writes (findOneAndReplace / $set).
// Each route must run validate() between authorization and its controller, and must still accept the
// full documents the frontend sends, including fields the schema does not list (passthrough).

import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import router from './story.routes.js';
import { scenarioSchema, updateScenarioListSchema, updateStorySchema } from '@seed-test/shared/schemas/story.schemas.js';

interface RouteLayer {
	handle: (req: Request, res: Response, next: NextFunction) => void;
}

// Returns the handler stack of a route, e.g. [authorization, validate, controller].
function routeStack(method: string, path: string): RouteLayer[] {
	const stack = (router as unknown as { stack: unknown[] }).stack;
	for (const layer of stack) {
		const route = (layer as { route?: { path: string; methods: Record<string, boolean>; stack: RouteLayer[] } }).route;
		if (route?.path === path && route.methods[method])
			return route.stack;
	}
	throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
}

// Runs the validate() handler (index 1, after authorization, before the controller) on a body.
// Reports the HTTP status it produced and whether it called next(), i.e. whether the controller would run.
function runValidation(method: string, path: string, body: unknown): { status?: number; passed: boolean; body: unknown } {
	const stack = routeStack(method, path);
	if (stack.length !== 3)
		throw new Error(`Route ${method.toUpperCase()} ${path} has no validate() before its controller`);
	const req = { body, method: method.toUpperCase(), originalUrl: path } as unknown as Request;
	let status: number | undefined;
	const res = {
		status: (code: number) => {
			status = code;
			return res;
		},
		json: () => res
	} as unknown as Response;
	const next = vi.fn();
	stack[1].handle(req, res, next);
	return { status, passed: next.mock.calls.length > 0, body: req.body };
}

// A scenario as the frontend sends it: DB-only fields (lastTestPassed, testKey, testRunSteps) and
// unknown step fields must survive validation because the controller writes the object back unchanged.
const frontendScenario = {
	scenario_id: 1,
	name: 'Login works',
	comment: '',
	stepDefinitions: {
		given: [{ id: 1, pre: 'Given', mid: 'a user', post: '', stepType: 'given', type: 'user', values: ['x'], frontendFlag: true }],
		when: [],
		then: []
	},
	multipleScenarios: [null, { values: ['a'], checked: true }],
	lastTestPassed: true,
	testKey: 'TEST-1',
	testRunSteps: []
};

// A scenario stored by an older release: steps lack `id` and carry null `pre`/`mid`. Saving such a story
// must still succeed, otherwise the user loses the edit.
const legacyScenario = {
	scenario_id: 2,
	name: 'Legacy scenario',
	stepDefinitions: {
		given: [{ pre: null, mid: null, stepType: 'given', type: 'user', values: [] }],
		when: [{ pre: 'When', mid: null, stepType: 'when', type: 'click', values: [] }],
		then: []
	}
};

describe('story schemas', () => {
	it('accepts a legacy stored step without id and with null pre/mid', () => {
		expect(scenarioSchema.safeParse(legacyScenario).success).toBe(true);
	});

	it('rejects a story update whose scenarios is not an array', () => {
		expect(updateStorySchema.safeParse({ title: 'T', scenarios: 'garbage' }).success).toBe(false);
	});

	it('rejects a scenario without stepDefinitions', () => {
		expect(scenarioSchema.safeParse({ scenario_id: 1, name: 'S' }).success).toBe(false);
	});

	it('accepts the frontend scenario shape and keeps unknown fields', () => {
		const result = scenarioSchema.safeParse(frontendScenario);
		expect(result.success).toBe(true);
		expect(result.success && result.data).toMatchObject({ lastTestPassed: true, testKey: 'TEST-1' });
	});

	it('rejects a non-array body for the scenario list update', () => {
		expect(updateScenarioListSchema.safeParse(null).success).toBe(false);
		expect(updateScenarioListSchema.safeParse({ scenarios: [] }).success).toBe(false);
	});

	it('rejects a story update without a scenarios array (the replace would wipe the scenarios)', () => {
		expect(updateStorySchema.safeParse({ _id: '507f1f77bcf86cd799439011', title: 'T' }).success).toBe(false);
	});
});

describe('story router — body validation', () => {
	it('validates PUT /:story_id/:_id between authorization and updateScenario', () => {
		expect(routeStack('put', '/:story_id/:_id')).toHaveLength(3);
	});

	it('rejects an invalid scenario body on PUT /:story_id/:_id with 400', () => {
		const result = runValidation('put', '/:story_id/:_id', { name: 'S' });
		expect(result.status).toBe(400);
		expect(result.passed).toBe(false);
	});

	it('passes a frontend scenario body on PUT /:story_id/:_id to the controller', () => {
		const result = runValidation('put', '/:story_id/:_id', frontendScenario);
		expect(result.passed).toBe(true);
		expect(result.body).toMatchObject({ lastTestPassed: true, testKey: 'TEST-1' });
	});

	it('passes a legacy scenario body on PUT /:story_id/:_id to the controller', () => {
		expect(runValidation('put', '/:story_id/:_id', legacyScenario).passed).toBe(true);
	});

	it('rejects a scenario list with non-array stepDefinitions on PATCH /:story_id with 400', () => {
		expect(runValidation('patch', '/:story_id', [{ ...legacyScenario, stepDefinitions: 'garbage' }]).status).toBe(400);
	});

	it('rejects a story with non-array scenarios on PUT /:_id with 400', () => {
		expect(runValidation('put', '/:_id', { _id: '507f1f77bcf86cd799439011', title: 'T', scenarios: 'garbage' }).status).toBe(400);
	});

	it('validates PATCH /:story_id between authorization and updateScenarioList', () => {
		expect(routeStack('patch', '/:story_id')).toHaveLength(3);
	});

	it('rejects a non-array body on PATCH /:story_id with 400', () => {
		expect(runValidation('patch', '/:story_id', { scenario_id: 1 }).status).toBe(400);
	});

	it('passes an array of frontend scenarios on PATCH /:story_id to the controller', () => {
		expect(runValidation('patch', '/:story_id', [frontendScenario]).passed).toBe(true);
	});

	it('validates PUT /:_id between authorization and updateStory', () => {
		expect(routeStack('put', '/:_id')).toHaveLength(3);
	});

	it('rejects a story body without scenarios on PUT /:_id with 400', () => {
		expect(runValidation('put', '/:_id', { _id: '507f1f77bcf86cd799439011', title: 'T' }).status).toBe(400);
	});

	it('passes a full story document on PUT /:_id and keeps unknown story fields', () => {
		const story = {
			_id: '507f1f77bcf86cd799439011',
			title: 'Checkout',
			body: '',
			storySource: 'custom',
			background: { name: '', stepDefinitions: { when: [] } },
			scenarios: [frontendScenario]
		};
		const result = runValidation('put', '/:_id', story);
		expect(result.passed).toBe(true);
		expect(result.body).toMatchObject({ storySource: 'custom' });
	});
});
