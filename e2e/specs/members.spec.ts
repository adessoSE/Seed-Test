import { randomBytes } from 'node:crypto';
import { request, type APIRequestContext } from '@playwright/test';
import { test, expect } from '../fixtures';
import { API_URL, STORAGE_STATE_PATH } from '../helpers/config';
import { createProject, createStory, deleteProject, getStory, type ProjectRef } from '../helpers/api';
import { deleteOwnAccount, getWorkgroup, openMemberContext, ownerEmail, registerAndLogin, storyItem, type MemberSession } from '../helpers/members';
import { AppPage } from '../pages/app';
import { MembersPage } from '../pages/members';
import { ProjectsPage } from '../pages/projects';

/** Unique suffix per run so project and story names never clash with leftovers of earlier runs. */
function runSuffix(): string {
	return `${new Date().toISOString()} ${randomBytes(3).toString('hex')}`;
}

// WHY: the steps build on each other (invite, grant write access, remove, transfer), so they must run in order on shared state.
test.describe.serial('members and ownership', () => {
	let owner: APIRequestContext;
	let member: MemberSession;
	let shared: ProjectRef;
	let storyId: string;
	let storyTitle: string;
	let dedicated: ProjectRef | undefined;

	test.beforeAll(async () => {
		// Two auth requests in total: register and login of the member. The owner reuses the shared session;
		// registerAndLogin logs the member in with an empty cookie jar, so that login cannot replace it.
		owner = await request.newContext({ storageState: STORAGE_STATE_PATH });
		member = await registerAndLogin();
		shared = await createProject(owner, `E2E members ${runSuffix()}`);
		storyTitle = `E2E member story ${runSuffix()}`;
		storyId = await createStory(owner, shared.id, storyTitle);
	});

	test.afterAll(async () => {
		// WHY: beforeAll may have failed before creating anything, so every cleanup step checks what exists
		try {
			if (dedicated)
				// CASE 1: ownership moved to the member in step 8, so the owner's delete is refused and the member deletes it
				await deleteProject(owner, dedicated.id).catch(() => deleteProject(member.api, dedicated!.id));
			if (shared)
				await deleteProject(owner, shared.id);
		} finally {
			if (member) {
				await deleteOwnAccount(member.api);
				await member.api.dispose();
			}
			if (owner)
				await owner.dispose();
		}
	});

	test('inviting an unknown email shows the backend error and adds no member', async ({ page }) => {
		const projects = new ProjectsPage(page);
		const members = new MembersPage(page);
		await new AppPage(page).gotoAccount();
		await projects.openSettings(shared.name);
		await members.openMembersTab();

		const response = await members.invite(`nobody-${randomBytes(3).toString('hex')}@seedtest.test`);
		expect(response.status()).toBe(404);
		await expect(page.getByText('No user found with this email')).toBeVisible();

		expect((await getWorkgroup(owner, shared.id)).member).toEqual([]);
	});

	test('owner invites the member read-only and the list shows no write access', async ({ page, runtimeErrors }) => {
		const projects = new ProjectsPage(page);
		const members = new MembersPage(page);
		await new AppPage(page).gotoAccount();
		await projects.openSettings(shared.name);
		await members.openMembersTab();

		const response = await members.invite(member.email, false);
		expect(response.ok()).toBe(true);
		await expect(members.row(member.email)).toBeVisible();
		await expect(members.row(member.email).locator('input[name="canEditUser"]')).not.toBeChecked();

		const workgroup = await getWorkgroup(owner, shared.id);
		expect(workgroup.member).toHaveLength(1);
		expect(workgroup.member[0]).toMatchObject({ email: member.email, canEdit: false });
		expect(runtimeErrors).toEqual([]);
	});

	test('member sees the shared project and its story', async ({ browser, runtimeErrors }) => {
		const { context, page } = await openMemberContext(browser, member.api, runtimeErrors);
		try {
			await new AppPage(page).gotoAccount();
			await page.getByRole('link', { name: shared.name, exact: true }).click();
			await expect(storyItem(page, storyTitle)).toBeVisible();
			expect(await page.evaluate(() => window.localStorage.getItem('repository'))).toBe(shared.name);
		} finally {
			await context.close();
		}
		expect(runtimeErrors).toEqual([]);
	});

	test('member with read-only access sees no story edit controls', async ({ browser, runtimeErrors }) => {
		const { context, page } = await openMemberContext(browser, member.api, runtimeErrors);
		try {
			await new AppPage(page).gotoAccount();
			await page.getByRole('link', { name: shared.name, exact: true }).click();
			await storyItem(page, storyTitle).click();
			// The rename pencil is the only story-level edit control in the header; the backend rejects its save for read-only members
			await expect(page.locator('button.storyTitle.pencil_icon').first()).toBeHidden();
		} finally {
			await context.close();
		}
	});

	test('member with read-only access cannot update the story through the API', async () => {
		const story = await getStory(owner, storyId);
		const response = await member.api.put(`${API_URL}/story/${storyId}`, { data: { ...story, title: 'Changed by read-only member' } });
		expect(response.status()).toBe(403);
		expect((await getStory(owner, storyId)).title).toBe(storyTitle);
	});

	test('owner grants write access and the change persists', async ({ page, runtimeErrors }) => {
		const projects = new ProjectsPage(page);
		const members = new MembersPage(page);
		await new AppPage(page).gotoAccount();
		await projects.openSettings(shared.name);
		await members.openMembersTab();

		const response = await members.setCanEdit(member.email, true);
		expect(response.ok()).toBe(true);
		await expect(members.row(member.email).locator('input[name="canEditUser"]')).toBeChecked();

		const workgroup = await getWorkgroup(owner, shared.id);
		expect(workgroup.member[0]).toMatchObject({ email: member.email, canEdit: true });
		expect(runtimeErrors).toEqual([]);
	});

	test('member with write access renames the story through the UI', async ({ browser, runtimeErrors }) => {
		const newTitle = `${storyTitle} renamed`;
		const { context, page } = await openMemberContext(browser, member.api, runtimeErrors);
		try {
			await new AppPage(page).gotoAccount();
			await page.getByRole('link', { name: shared.name, exact: true }).click();
			await storyItem(page, storyTitle).click();
			await page.locator('button.storyTitle.pencil_icon').first().click();

			const rename = page.locator('#newStoryTitle:visible');
			// Select the old title and type over it; clear() does not fire the keyup the form validates on
			await rename.press('ControlOrMeta+A');
			await rename.pressSequentially(newTitle);
			const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().includes('/story/'));
			await page.locator('#submitRenameStory:visible').click();
			expect((await saved).ok()).toBe(true);
		} finally {
			await context.close();
		}

		await expect.poll(async () => (await getStory(owner, storyId)).title).toBe(newTitle);
		storyTitle = newTitle;
	});

	test('owner removes the member, who then loses access to the project', async ({ page, runtimeErrors }) => {
		const projects = new ProjectsPage(page);
		const members = new MembersPage(page);
		await new AppPage(page).gotoAccount();
		await projects.openSettings(shared.name);
		await members.openMembersTab();

		const response = await members.removeMember(member.email);
		expect(response.ok()).toBe(true);
		await expect(members.row(member.email)).toHaveCount(0);
		expect((await getWorkgroup(owner, shared.id)).member).toEqual([]);

		const repositories = await member.api.get(`${API_URL}/repository/`);
		expect(JSON.stringify(await repositories.json())).not.toContain(shared.id);
		const stories = await member.api.get(`${API_URL}/story/`, { params: { source: 'db', id: shared.id } });
		expect(stories.status()).toBe(403);
		expect(runtimeErrors).toEqual([]);
	});

	test('cancelling the ownership dialog keeps the current owner', async ({ page, runtimeErrors }) => {
		dedicated = await createProject(owner, `E2E ownership ${runSuffix()}`);
		const invite = await owner.post(`${API_URL}/workgroup/${dedicated.id}/members`, { data: { email: member.email, canEdit: false } });
		expect(invite.ok()).toBe(true);

		const projects = new ProjectsPage(page);
		const members = new MembersPage(page);
		let transferRequests = 0;
		page.on('request', r => {
			if (r.url().includes('/repository/owner/')) transferRequests++;
		});

		await new AppPage(page).gotoAccount();
		await projects.openSettings(dedicated.name);
		await members.openOwnershipTab();
		await members.pickNewOwner(member.email);
		await members.cancelOwnerChange();

		expect(transferRequests).toBe(0);
		expect((await getWorkgroup(owner, dedicated.id)).owner.email).toBe(await ownerEmail());
		expect(runtimeErrors).toEqual([]);
	});

	test('confirming the ownership dialog hands the project to the member, who deletes it', async ({ page, runtimeErrors }) => {
		const projects = new ProjectsPage(page);
		const members = new MembersPage(page);
		await new AppPage(page).gotoAccount();
		await projects.openSettings(dedicated!.name);
		await members.openOwnershipTab();
		await members.pickNewOwner(member.email);

		const transfer = await members.confirmOwnerChange();
		expect(transfer.ok()).toBe(true);
		await expect(page.getByText('successfully changed')).toBeVisible();

		// The member is the new owner, so the member's API context can read the owner and delete the project
		expect((await getWorkgroup(member.api, dedicated!.id)).owner.email).toBe(member.email);
		await deleteProject(member.api, dedicated!.id);
		dedicated = undefined;
		expect(runtimeErrors).toEqual([]);
	});
});
