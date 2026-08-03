import type { User } from '@shared/models/User.js';

/**
 * Safe subset of a User object, with sensitive fields removed.
 * Uses an allowlist approach — only explicitly listed fields are included.
 */
export interface SanitizedUser {
	_id?: string;
	email: string;
	github?: {
		login: string;
		id: number;
		githubRepo?: string;
	};
	jira?: {
		AccountName: string;
		Host: string;
		AuthMethod: string;
	};
}

/**
 * Returns a new object containing only non-sensitive user fields.
 * Strips password, transitioned flag, GitHub token, and Jira credentials.
 * Uses an allowlist — only explicitly named fields are copied.
 */
export function sanitizeUser(user: User): SanitizedUser {
	const sanitized: SanitizedUser = {
		_id: user._id,
		email: user.email
	};

	// Only include GitHub fields that are safe for client consumption
	if (user.github)
		sanitized.github = {
			login: user.github.login,
			id: user.github.id,
			githubRepo: user.github.githubRepo
		};

	// Only include Jira metadata — encrypted credentials are excluded
	if (user.jira)
		sanitized.jira = {
			AccountName: user.jira.AccountName,
			Host: user.jira.Host,
			AuthMethod: user.jira.AuthMethod
		};

	return sanitized;
}
