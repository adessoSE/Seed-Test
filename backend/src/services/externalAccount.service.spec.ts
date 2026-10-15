import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { User } from '@seed-test/shared/models/User.js';
import type * as ExtAccountServiceModule from './externalAccount.service.js';

process.env.JIRA_SECRET = 'test-jira-secret';
process.env.JIRA_SALT = 'test-jira-salt';

// Disconnects must $unset the field; updateUser($set) cannot remove a key, so they go through userService.unsetUserFields.
const mockedUserService = {
	getUserById: vi.fn(),
	updateUser: vi.fn(),
	unsetUserFields: vi.fn()
};
vi.mock('./user.service', () => mockedUserService);

describe('ExternalAccountService', () => {
	let externalAccountService: typeof ExtAccountServiceModule;

	const userId = new ObjectId().toHexString();
	const mockUser: User = {
		_id: new ObjectId(userId),
		email: 'test@test.com'
	};

	beforeEach(async () => {
		// Ensure config is validated and cached so externalAccount.service
		// reads validated values (lazy getter would also work, but being
		// explicit here avoids flaky test ordering issues).
		const config = await import('../config.js');
		config.validateConfig();
		externalAccountService = await vi.importActual<typeof ExtAccountServiceModule>('./externalAccount.service');
		vi.clearAllMocks();
		mockedUserService.getUserById.mockResolvedValue({ ...mockUser });
		mockedUserService.updateUser.mockResolvedValue({ ok: 1 });
	}, 15_000);

	describe('buildAuthString', () => {
		it('should return Basic auth for basic method', () => {
			const result = externalAccountService.buildAuthString('user', 'pass', 'basic');
			const expected = `Basic ${Buffer.from('user:pass').toString('base64')}`;
			expect(result).toBe(expected);
		});

		it('should return Bearer token by default', () => {
			const result = externalAccountService.buildAuthString('user', 'my-token');
			expect(result).toBe('Bearer my-token');
		});

		it('should return Bearer for non-basic method', () => {
			const result = externalAccountService.buildAuthString('user', 'token', 'pat');
			expect(result).toBe('Bearer token');
		});
	});

	describe('jiraDecryptPassword', () => {
		it('should round-trip encrypt and decrypt a password', async () => {
			const password = 'my-jira-password-123';

			await externalAccountService.updateJiraCredential(userId, 'jira-user', password, 'jira.example.com', 'basic');

			const savedUser = mockedUserService.updateUser.mock.calls[0][1] as User;
			const jira = savedUser.jira!;

			const decrypted = externalAccountService.jiraDecryptPassword(
				jira.Password, jira.Password_Nonce, jira.Password_Tag
			);
			expect(decrypted).toBe(password);
		});

		it('should throw on invalid cipher data', () => {
			expect(() => externalAccountService.jiraDecryptPassword(
				Buffer.from('bad'), Buffer.from('data-13-bytes'), Buffer.from('0123456789abcdef')
			)).toThrow('Jira password decryption failed');
		});
	});

	describe('checkValidGithubFormat', () => {
		it('should return true for valid GitHub username and repo', () => {
			expect(externalAccountService.checkValidGithubFormat('octocat', 'Hello-World')).toBe(true);
		});

		it('should return false for missing params', () => {
			expect(externalAccountService.checkValidGithubFormat()).toBe(false);
			expect(externalAccountService.checkValidGithubFormat('user')).toBe(false);
			expect(externalAccountService.checkValidGithubFormat(undefined, 'repo')).toBe(false);
		});

		it('should reject usernames starting with hyphen', () => {
			expect(externalAccountService.checkValidGithubFormat('-invalid', 'repo')).toBe(false);
		});

		it('should reject usernames longer than 39 characters', () => {
			expect(externalAccountService.checkValidGithubFormat('a'.repeat(40), 'repo')).toBe(false);
		});
	});

	describe('updateJiraCredential', () => {
		it('should encrypt password and update user', async () => {
			await externalAccountService.updateJiraCredential(userId, 'jira-user', 'clearpass', 'jira.host.com', 'basic');

			expect(mockedUserService.getUserById).toHaveBeenCalledWith(userId);
			expect(mockedUserService.updateUser).toHaveBeenCalledTimes(1);

			const updatedUser = mockedUserService.updateUser.mock.calls[0][1] as User;
			expect(updatedUser.jira).toBeDefined();
			expect(updatedUser.jira!.AccountName).toBe('jira-user');
			expect(updatedUser.jira!.Host).toBe('jira.host.com');
			expect(Buffer.isBuffer(updatedUser.jira!.Password)).toBe(true);
		});

		it('should throw if user not found', async () => {
			mockedUserService.getUserById.mockResolvedValue(null);
			await expect(
				externalAccountService.updateJiraCredential(userId, 'user', 'pass', 'host', 'basic')
			).rejects.toThrow('User not found');
		});

		// Regression: spreading the full user re-wrote the password field and could revert a concurrent password change.
		it('should pass only the jira key to updateUser, never the password or other user fields', async () => {
			mockedUserService.getUserById.mockResolvedValue({ ...mockUser, password: 'hashed-password' });

			await externalAccountService.updateJiraCredential(userId, 'jira-user', 'clearpass', 'jira.host.com', 'basic');

			const payload = mockedUserService.updateUser.mock.calls[0][1] as Record<string, unknown>;
			expect(Object.keys(payload)).toEqual(['jira']);
		});
	});

	describe('updateGithubToken', () => {
		// Regression: spreading the full user re-wrote the password field and could revert a concurrent password change.
		it('should pass only the github key to updateUser, never the password or other user fields', async () => {
			mockedUserService.getUserById.mockResolvedValue({ ...mockUser, password: 'hashed-password' });

			await externalAccountService.updateGithubToken(userId, 'ghp_token', { login: 'octocat', id: 1 });

			expect(mockedUserService.updateUser).toHaveBeenCalledTimes(1);
			const [calledId, payload] = mockedUserService.updateUser.mock.calls[0] as [string, Record<string, unknown>];
			expect(calledId).toBe(userId);
			expect(Object.keys(payload)).toEqual(['github']);
			expect(payload.github).toEqual({ githubToken: 'ghp_token', login: 'octocat', id: 1 });
		});

		it('should throw if user not found', async () => {
			mockedUserService.getUserById.mockResolvedValue(null);
			await expect(
				externalAccountService.updateGithubToken(userId, 'ghp_token', { login: 'octocat', id: 1 })
			).rejects.toThrow('User not found');
		});
	});

	describe('disconnectJira', () => {
		it('should $unset the jira field on the user document', async () => {
			mockedUserService.getUserById.mockResolvedValue({
				...mockUser,
				jira: { AccountName: 'test', Host: 'host' }
			});

			await externalAccountService.disconnectJira(userId);

			expect(mockedUserService.unsetUserFields).toHaveBeenCalledWith(userId, ['jira']);
		});

		// Regression: a snapshot write via updateUser could not remove jira, and disconnect was a no-op.
		it('should not write the user snapshot (no password or other fields) via updateUser', async () => {
			mockedUserService.getUserById.mockResolvedValue({
				...mockUser,
				password: 'hashed-password',
				jira: { AccountName: 'test', Host: 'host' }
			});

			await externalAccountService.disconnectJira(userId);

			expect(mockedUserService.updateUser).not.toHaveBeenCalled();
		});

		it('should throw if user not found', async () => {
			mockedUserService.getUserById.mockResolvedValue(null);
			await expect(externalAccountService.disconnectJira(userId)).rejects.toThrow('User not found');
			expect(mockedUserService.unsetUserFields).not.toHaveBeenCalled();
		});
	});

	describe('disconnectGithub', () => {
		it('should $unset the github field on the user document', async () => {
			mockedUserService.getUserById.mockResolvedValue({
				...mockUser,
				github: { githubToken: 'token', login: 'user', id: 123 }
			});

			await externalAccountService.disconnectGithub(userId);

			expect(mockedUserService.unsetUserFields).toHaveBeenCalledWith(userId, ['github']);
		});

		// Regression: a snapshot write via updateUser could not remove github, and disconnect was a no-op.
		it('should not write the user snapshot (no password or other fields) via updateUser', async () => {
			mockedUserService.getUserById.mockResolvedValue({
				...mockUser,
				password: 'hashed-password',
				github: { githubToken: 'token', login: 'user', id: 123 }
			});

			await externalAccountService.disconnectGithub(userId);

			expect(mockedUserService.updateUser).not.toHaveBeenCalled();
		});

		it('should throw if user not found', async () => {
			mockedUserService.getUserById.mockResolvedValue(null);
			await expect(externalAccountService.disconnectGithub(userId)).rejects.toThrow('User not found');
			expect(mockedUserService.unsetUserFields).not.toHaveBeenCalled();
		});
	});
});
