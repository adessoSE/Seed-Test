/**
 * Zone.js/Vitest bridge — wraps Vitest test callbacks in ProxyZone.
 *
 * Zone.js/testing patches Jasmine's globals to run each test inside a ProxyZone,
 * but has no built-in Vitest support. Angular's fakeAsync() requires ProxyZone.
 * This setup bridges the gap by patching Vitest globals in the same way.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Zone: any;

const g = globalThis as any;
const ambientZone = Zone.current;
const ProxyZoneSpec = Zone['ProxyZoneSpec'];
const _SyncTestZoneSpec = Zone['SyncTestZoneSpec'];

if (!ProxyZoneSpec)
	throw new Error('zone-testing must be loaded before test-setup');

/**
 * Run a test callback inside a fresh ProxyZone so that fakeAsync() and
 * Angular's async test utilities work correctly.
 */
function wrapInProxyZone(testFn: any): any {
	if (!testFn || testFn.length > 0)
		return testFn;

	return function (this: unknown) {
		const proxyZone = ambientZone.fork(new ProxyZoneSpec());
		return proxyZone.run(testFn, this);
	};
}

// Patch Vitest's globals to wrap test callbacks in ProxyZone
const _beforeEach = g.beforeEach;
const _afterEach = g.afterEach;
const _beforeAll = g.beforeAll;
const _afterAll = g.afterAll;
const _it = g.it;

g.beforeEach = function (fn: any, timeout?: number) {
	return _beforeEach(wrapInProxyZone(fn), timeout);
};

g.afterEach = function (fn: any, timeout?: number) {
	return _afterEach(wrapInProxyZone(fn), timeout);
};

g.beforeAll = function (fn: any, timeout?: number) {
	return _beforeAll(wrapInProxyZone(fn), timeout);
};

g.afterAll = function (fn: any, timeout?: number) {
	return _afterAll(wrapInProxyZone(fn), timeout);
};

const wrappedIt: any = function (description: string, fn: any, timeout?: number) {
	return _it(description, wrapInProxyZone(fn), timeout);
};
wrappedIt.skip = _it.skip;
wrappedIt.only = _it.only;
wrappedIt.todo = _it.todo;
wrappedIt.each = _it.each;
wrappedIt.fails = _it.fails;
g.it = wrappedIt;
g.test = wrappedIt;
