import { describe, it, expect } from 'vitest';
import { requireValidId, requireSafeExternalHost } from './validation.js';

describe('requireValidId', () => {
	it('returns a valid ObjectId string', () => {
		const id = '507f1f77bcf86cd799439011';
		expect(requireValidId(id, 'test')).toBe(id);
	});

	it('throws for undefined', () => {
		expect(() => requireValidId(undefined, 'test')).toThrow('Invalid or missing test');
	});

	it('throws for empty string', () => {
		expect(() => requireValidId('', 'test')).toThrow('Invalid or missing test');
	});

	it('throws for non-ObjectId string', () => {
		expect(() => requireValidId('not-an-id', 'test')).toThrow('Invalid or missing test');
	});
});

describe('requireSafeExternalHost', () => {
	// --- Valid hosts ---
	it('accepts a valid FQDN', () => {
		expect(requireSafeExternalHost('mycompany.atlassian.net')).toBe('mycompany.atlassian.net');
	});

	it('accepts a subdomain host', () => {
		expect(requireSafeExternalHost('jira.corp.example.com')).toBe('jira.corp.example.com');
	});

	it('accepts host with hyphens', () => {
		expect(requireSafeExternalHost('my-jira.example.com')).toBe('my-jira.example.com');
	});

	// --- Empty / missing ---
	it('throws for empty string', () => {
		expect(() => requireSafeExternalHost('')).toThrow('Missing host');
	});

	// --- Format violations ---
	it('rejects host with colon (port injection)', () => {
		expect(() => requireSafeExternalHost('evil.com:8080')).toThrow('Invalid host format');
	});

	it('rejects host with slash (path injection)', () => {
		expect(() => requireSafeExternalHost('evil.com/admin')).toThrow('Invalid host format');
	});

	it('rejects host with spaces', () => {
		expect(() => requireSafeExternalHost('evil .com')).toThrow('Invalid host format');
	});

	// --- Single-label names (no dot) ---
	it('rejects single-label hostname', () => {
		expect(() => requireSafeExternalHost('intranet')).toThrow('fully qualified domain name');
	});

	// --- Raw IPv4 addresses ---
	it('rejects loopback IP', () => {
		expect(() => requireSafeExternalHost('127.0.0.1')).toThrow('private or reserved');
	});

	it('rejects private class A IP', () => {
		expect(() => requireSafeExternalHost('10.0.0.1')).toThrow('private or reserved');
	});

	it('rejects private class B IP', () => {
		expect(() => requireSafeExternalHost('172.16.0.1')).toThrow('private or reserved');
	});

	it('rejects private class C IP', () => {
		expect(() => requireSafeExternalHost('192.168.1.1')).toThrow('private or reserved');
	});

	it('rejects AWS metadata IP (link-local)', () => {
		expect(() => requireSafeExternalHost('169.254.169.254')).toThrow('private or reserved');
	});

	it('rejects public IP (must be domain name)', () => {
		expect(() => requireSafeExternalHost('8.8.8.8')).toThrow('not an IP address');
	});

	// --- Internal hostnames ---
	it('rejects localhost', () => {
		expect(() => requireSafeExternalHost('localhost.localdomain')).toThrow();
	});

	it('rejects .local suffix', () => {
		expect(() => requireSafeExternalHost('jira.local')).toThrow('Internal domain suffixes');
	});

	it('rejects .internal suffix', () => {
		expect(() => requireSafeExternalHost('jira.internal')).toThrow('Internal domain suffixes');
	});

	it('rejects .corp suffix', () => {
		expect(() => requireSafeExternalHost('jira.corp')).toThrow('Internal domain suffixes');
	});
});
