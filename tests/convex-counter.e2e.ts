import { expect, test } from '@playwright/test';

test('counter updates in another tab and persists through a reload', async ({ page, context }) => {
	test.skip(process.env.RUN_CONVEX_SMOKE !== '1', 'Opt in to writing to the dev counter.');
	await page.goto('/');
	const value = page.getByRole('status', { name: 'Counter value' });
	await expect(value).toHaveText(/^\d+$/);
	const initial = Number(await value.textContent());
	const other = await context.newPage();
	await other.goto('/');
	const otherValue = other.getByRole('status', { name: 'Counter value' });
	await expect(otherValue).toHaveText(String(initial));
	await page.getByRole('button', { name: 'Increment counter', exact: true }).click();
	await expect(value).toHaveText(String(initial + 1));
	await expect(otherValue).toHaveText(String(initial + 1));
	await other.getByRole('button', { name: 'Increment counter', exact: true }).click();
	await expect(value).toHaveText(String(initial + 2));
	await page.reload();
	await expect(value).toHaveText(String(initial + 2));
});
