import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

/**
 * Validates that a value is a non-empty, valid MongoDB ObjectId string.
 * Throws AppError.badRequest if the value is missing or malformed.
 *
 * @param value - The string to validate as an ObjectId.
 * @param label - Human-readable name for error messages (e.g. 'repository ID').
 * @returns The validated value, unchanged.
 */
export function requireValidId(value: string | undefined, label: string): string {
	if (!value || !ObjectId.isValid(value))
		throw AppError.badRequest(`Invalid or missing ${label}`);

	return value;
}

// IPv4 patterns that resolve to private/reserved networks — SSRF targets
const PRIVATE_IPV4 = [
	/^127\./,                                     // loopback
	/^10\./,                                      // class A private
	/^172\.(1[6-9]|2\d|3[01])\./,                 // class B private
	/^192\.168\./,                                 // class C private
	/^169\.254\./,                                 // link-local (cloud metadata!)
	/^0\./,                                       // current network
	/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./   // carrier-grade NAT
];

/**
 * Validates that a hostname is a safe external FQDN, not an internal/private target.
 * Prevents SSRF by rejecting raw IPs, localhost, port-injected strings, and
 * hostnames that could resolve to private infrastructure.
 *
 * @param host - The hostname string to validate (e.g. 'mycompany.atlassian.net').
 * @returns The validated hostname.
 */
export function requireSafeExternalHost(host: string): string {
	if (!host)
		throw AppError.badRequest('Missing host');

	// Only allow valid hostname characters — no colons (port injection), no slashes (path injection)
	if (!/^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host))
		throw AppError.badRequest('Invalid host format: only letters, digits, dots, and hyphens are allowed');

	// Require FQDN — at least one dot prevents single-label names like 'localhost'
	if (!host.includes('.'))
		throw AppError.badRequest('Host must be a fully qualified domain name');

	// Block raw IPv4 addresses — they bypass domain-based SSRF filters
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
		if (PRIVATE_IPV4.some(r => r.test(host)))
			throw AppError.badRequest('Host must not resolve to a private or reserved IP address');

		// Even public IPs are suspicious for a Jira/Xray host — reject all raw IPs
		throw AppError.badRequest('Host must be a domain name, not an IP address');
	}

	// Block well-known internal hostnames
	const lower = host.toLowerCase();
	if (lower === 'localhost' || lower.startsWith('localhost.'))
		throw AppError.badRequest('Internal hostnames are not allowed');

	if (lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.corp'))
		throw AppError.badRequest('Internal domain suffixes are not allowed');

	return host;
}
