import { describe, it, expect } from 'vitest';
import type { User } from '@seed-test/shared/models/User.js';
import { sanitizeUser } from './userSanitize.js';

/** Full user fixture with all sensitive fields populated. */
const fullUser: User = {
	_id: '507f1f77bcf86cd799439011',
	email: 'test@example.com',
	password: 'hashed_secret_password',
	transitioned: true,
	github: {
		githubToken: 'ghp_supersecrettoken123',
		login: 'testuser',
		id: 42,
		githubRepo: 'my-repo'
	},
	jira: {
		AccountName: 'jira-user',
		Password: { $binary: { base64: 'encrypted==', subType: '00' } },
		Password_Nonce: { $binary: { base64: 'nonce==', subType: '00' } },
		Password_Tag: { $binary: { base64: 'tag==', subType: '00' } },
		Host: 'https://jira.example.com',
		AuthMethod: 'basic'
	}
};

describe('sanitizeUser', () => {
	it('should strip password from the output', () => {
		const result = sanitizeUser(fullUser);
		expect(result).not.toHaveProperty('password');
	});

	it('should strip transitioned flag from the output', () => {
		const result = sanitizeUser(fullUser);
		expect(result).not.toHaveProperty('transitioned');
	});

	it('should strip github.githubToken from the output', () => {
		const result = sanitizeUser(fullUser);
		expect(result.github).toBeDefined();
		expect(result.github).not.toHaveProperty('githubToken');
	});

	it('should strip jira.Password, jira.Password_Nonce, and jira.Password_Tag from the output', () => {
		const result = sanitizeUser(fullUser);
		expect(result.jira).toBeDefined();
		expect(result.jira).not.toHaveProperty('Password');
		expect(result.jira).not.toHaveProperty('Password_Nonce');
		expect(result.jira).not.toHaveProperty('Password_Tag');
	});

	it('should keep safe fields: _id, email, github.login, github.id, github.githubRepo', () => {
		const result = sanitizeUser(fullUser);
		expect(result._id).toBe(fullUser._id);
		expect(result.email).toBe(fullUser.email);
		expect(result.github?.login).toBe('testuser');
		expect(result.github?.id).toBe(42);
		expect(result.github?.githubRepo).toBe('my-repo');
	});

	it('should keep safe jira fields: AccountName, Host, AuthMethod', () => {
		const result = sanitizeUser(fullUser);
		expect(result.jira?.AccountName).toBe('jira-user');
		expect(result.jira?.Host).toBe('https://jira.example.com');
		expect(result.jira?.AuthMethod).toBe('basic');
	});

	it('should handle undefined github gracefully', () => {
		const userNoGithub: User = {
			...fullUser,
			github: undefined
		};
		const result = sanitizeUser(userNoGithub);
		expect(result.github).toBeUndefined();
	});

	it('should handle undefined jira gracefully', () => {
		const userNoJira: User = {
			...fullUser,
			jira: undefined
		};
		const result = sanitizeUser(userNoJira);
		expect(result.jira).toBeUndefined();
	});

	it('should return a new object without mutating the original', () => {
		const original = { ...fullUser };
		const result = sanitizeUser(fullUser);
		// Result must be a distinct reference
		expect(result).not.toBe(fullUser);
		// Original user must retain its password
		expect(fullUser.password).toBe(original.password);
		expect(fullUser.github.githubToken).toBe(original.github.githubToken);
	});
});
