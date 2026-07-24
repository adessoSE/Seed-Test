import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { User } from '@shared/models/User';

process.env.JIRA_SECRET = 'test-jira-secret';
process.env.JIRA_SALT = 'test-jira-salt';

const mockedUserService = {
	getUserById: vi.fn(),
	updateUser: vi.fn()
};
vi.mock('./user.service', () => mockedUserService);

describe('ExternalAccountService', () => {
	let externalAccountService: typeof import('./externalAccount.service');

	const userId = new ObjectId().toHexString();
	const mockUser: User = {
		_id: new ObjectId(userId),
		email: 'test@test.com'
	};

	beforeEach(async () => {
		externalAccountService = await vi.importActual<typeof import('./externalAccount.service')>('./externalAccount.service');
		vi.clearAllMocks();
		mockedUserService.getUserById.mockResolvedValue({ ...mockUser });
		mockedUserService.updateUser.mockResolvedValue({ ok: 1 });
	});

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
	});

	describe('disconnectJira', () => {
		it('should remove jira property from user', async () => {
			mockedUserService.getUserById.mockResolvedValue({
				...mockUser,
				jira: { AccountName: 'test', Host: 'host' }
			});

			await externalAccountService.disconnectJira(userId);

			const updatedUser = mockedUserService.updateUser.mock.calls[0][1] as User;
			expect(updatedUser.jira).toBeUndefined();
			expect(updatedUser.email).toBe('test@test.com');
		});

		it('should throw if user not found', async () => {
			mockedUserService.getUserById.mockResolvedValue(null);
			await expect(externalAccountService.disconnectJira(userId)).rejects.toThrow('User not found');
		});
	});

	describe('disconnectGithub', () => {
		it('should remove github property from user', async () => {
			mockedUserService.getUserById.mockResolvedValue({
				...mockUser,
				github: { githubToken: 'token', login: 'user', id: 123 }
			});

			await externalAccountService.disconnectGithub(userId);

			const updatedUser = mockedUserService.updateUser.mock.calls[0][1] as User;
			expect(updatedUser.github).toBeUndefined();
			expect(updatedUser.email).toBe('test@test.com');
		});
	});
});
