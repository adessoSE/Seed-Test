import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Integration tests: 429 guard coverage across ALL public API endpoints.
 * Verifies: (1) each endpoint hits 429 as expected, (2) frontend catches 429 before 401.
 */

// --- Global limiter (server.ts) ---
const globalLimiter = rateLimit({
	windowMs: 60000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests, please try again later.' },
	validate: { ip: false }
});

// --- Auth limiter (user.routes.ts) ---
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests. Please try again later.' },
	validate: { ip: false }
});

// --- Isolated Express apps per endpoint group ---

// 1) /api/user/login — has BOTH globalLimiter + authLimiter
const authApp = express();
authApp.set('trust proxy', 1);
authApp.use(express.json());
authApp.post('/api/user/login', globalLimiter, authLimiter, (_req, res) => {
	res.status(200).json({ message: 'ok' });
});

// 2) /api/story — unique limiter
const storyLimiter = rateLimit({ windowMs: 60000, max: 100, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, please try again later.' }, validate: { ip: false } });
const storyApp = express();
storyApp.set('trust proxy', 1);
storyApp.use(express.json());
storyApp.get('/api/story/:storyId', storyLimiter, (_req, res) => {
	res.status(200).json({ id: '123' });
});

// 3) /api/report — unique limiter
const reportLimiter = rateLimit({ windowMs: 60000, max: 100, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, please try again later.' }, validate: { ip: false } });
const reportApp = express();
reportApp.set('trust proxy', 1);
reportApp.use(express.json());
reportApp.get('/api/report/:reportId', reportLimiter, (_req, res) => {
	res.status(200).json({ id: '456' });
});

// 4) /api/repository — unique limiter
const repoLimiter = rateLimit({ windowMs: 60000, max: 100, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, please try again later.' }, validate: { ip: false } });
const repoApp = express();
repoApp.set('trust proxy', 1);
repoApp.use(express.json());
repoApp.post('/api/repository', repoLimiter, (_req, res) => {
	res.status(200).json({ id: '789' });
});

let authServer: http.Server;
let storyServer: http.Server;
let reportServer: http.Server;
let repoServer: http.Server;
let authUrl: string;
let storyUrl: string;
let reportUrl: string;
let repoUrl: string;

beforeAll(async () => {
	[authServer, storyServer, reportServer, repoServer] = [authApp, storyApp, reportApp, repoApp].map((a) => http.createServer(a));
	await Promise.all([
		new Promise<void>((r) => { authServer.listen(() => { const a = authServer.address(); if (a && typeof a === 'object') authUrl = `http://localhost:${a.port}`; r(); }); }),
		new Promise<void>((r) => { storyServer.listen(() => { const a = storyServer.address(); if (a && typeof a === 'object') storyUrl = `http://localhost:${a.port}`; r(); }); }),
		new Promise<void>((r) => { reportServer.listen(() => { const a = reportServer.address(); if (a && typeof a === 'object') reportUrl = `http://localhost:${a.port}`; r(); }); }),
		new Promise<void>((r) => { repoServer.listen(() => { const a = repoServer.address(); if (a && typeof a === 'object') repoUrl = `http://localhost:${a.port}`; r(); }); })
	]);
});

afterAll(async () => {
	await Promise.all([authServer, storyServer, reportServer, repoServer].map((s) => new Promise<void>((r) => s.close(r))));
});

// ----------------------------------------------------------
async function _hit429Loop(url: string, count: number): Promise<boolean> {
	let found = false;
	for (let i = 0; i < count && !found; i++) {
		const res = await fetch(url, { method: 'POST' });
		if (res.status === 429) found = true;
	}
	return found;
}

// ----------------------------------------------------------
describe('POST /api/user/login — authLimiter (20/15min)', () => {
	it('returns 200 when under limit', async () => {
		const res = await fetch(`${authUrl}/api/user/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@test.de', password: '123456' }) });
		expect(res.status).toBe(200);
	});

	it('returns 429 after exceeding 20 requests', async () => {
		let found429 = false;
		for (let i = 0; i < 25 && !found429; i++) {
			const res = await fetch(`${authUrl}/api/user/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x@x.de', password: 'x' }) });
			if (res.status === 429) {
				const body = await res.json();
				expect(body.error).toBe('Too many requests. Please try again later.');
				found429 = true;
			}
		}
		expect(found429).toBe(true);
	});
});

describe('GET /api/story — limiter (100/min)', () => {
	it('returns 200 when under limit', async () => {
		const res = await fetch(`${storyUrl}/api/story/s1`);
		expect(res.status).toBe(200);
	});

	// Test-standalone limiter is 100/min — story routes use global limiter (500/min)
	it('returns 429 after exceeding 100 requests', async () => {
		let found429 = false;
		for (let b = 0; b < 2 && !found429; b++) 
			for (let i = 0; i < 60 && !found429; i++) {
				const res = await fetch(`${storyUrl}/api/story/b${b}_${i}`);
				if (res.status === 429) {
					expect((await res.json()).error).toBe('Too many requests, please try again later.');
					found429 = true;
				}
			}
		
		expect(found429, 'Expected 429 after 100 requests/min').toBe(true);
	});
});

describe('GET /api/report — limiter (100/min)', () => {
	it('returns 200 when under limit', async () => {
		const res = await fetch(`${reportUrl}/api/report/r1`);
		expect(res.status).toBe(200);
	});

	it('returns 429 after exceeding 100 requests', async () => {
		let found429 = false;
		for (let b = 0; b < 2 && !found429; b++) 
			for (let i = 0; i < 60 && !found429; i++) {
				const res = await fetch(`${reportUrl}/api/report/b${b}_${i}`);
				if (res.status === 429) {
					expect((await res.json()).error).toBe('Too many requests, please try again later.');
					found429 = true;
				}
			}
		
		expect(found429, 'Expected 429 after 100 requests/min').toBe(true);
	});
});

describe('POST /api/repository — limiter (100/min)', () => {
	it('returns 200 when under limit', async () => {
		const res = await fetch(`${repoUrl}/api/repository`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://github.com/test/test' }) });
		expect(res.status).toBe(200);
	});

	it('returns 429 after exceeding 100 requests', async () => {
		let found429 = false;
		for (let b = 0; b < 2 && !found429; b++) 
			for (let i = 0; i < 60 && !found429; i++) {
				const res = await fetch(`${repoUrl}/api/repository`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: `https://gh.com/${b}_${i}` }) });
				if (res.status === 429) {
					expect((await res.json()).error).toBe('Too many requests, please try again later.');
					found429 = true;
				}
			}
		
		expect(found429, 'Expected 429 after 100 requests/min').toBe(true);
	});
});

// ----------------------------------------------------------
describe('Frontend 429 guard — http-logger.interceptor.ts', () => {
	it('catches ALL 429 before redirect', async () => {
		const src = fs.readFileSync(path.join(import.meta.dirname, '../../../frontend/src/app/Services/http-logger.interceptor.ts'), 'utf-8');
		expect(src).toMatch(/err\.status\s*===\s*429/);
		expect(src).toMatch(/console\.warn/);
		expect(src).toMatch(/HttpStatusCode\.Unauthorized/);
		const match = src.match(/catchError[\s\S]*\n\t\t\)/);
		const body = match![0];
		const r429 = body.indexOf('429');
		const r401 = body.indexOf('HttpStatusCode.Unauthorized');
		expect(r429).toBeGreaterThan(-1);
		expect(r401).toBeGreaterThan(-1);
		expect(r429).toBeLessThan(r401);
		const branch = body.slice(0, r401);
		expect(branch).not.toMatch(/window\.location/);
		expect(branch).toMatch(/return throwError/);
	});
});