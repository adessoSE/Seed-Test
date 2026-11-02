import { test, expect } from '../fixtures';

test('home loads logged in with the fixture project selected', async ({ page, project, runtimeErrors }) => {
	await page.goto('/');
	await expect(page).not.toHaveURL(/\/login/);
	const selected = await page.evaluate(() => ({
		repository: window.localStorage.getItem('repository'),
		source: window.localStorage.getItem('source'),
		id: window.localStorage.getItem('id'),
	}));
	expect(selected).toEqual({ repository: project.name, source: 'db', id: project.id });
	expect(runtimeErrors).toEqual([]);
});
