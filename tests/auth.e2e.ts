import { expect, test as base } from '@playwright/test';
import { authBackend } from './fixtures/auth-backend';

const test = base.extend<{ backend: Awaited<ReturnType<typeof authBackend>> }>({
	backend: async ({ context }, use) => {
		const backend = await authBackend(context);
		try {
			await use(backend);
		} finally {
			backend.restore();
		}
	}
});

test('email code signs in, returns after reload and reopening, then signs out', async ({
	page,
	context,
	backend
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.getByLabel('Email address')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Send code', exact: true })).toBeVisible();
	await page.screenshot({ path: test.info().outputPath('sign-in.png') });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.getByLabel('Email address').fill('Leo@example.com');
	await page.getByRole('button', { name: 'Send code', exact: true }).click();
	await expect(page.getByLabel('Sign-in code')).toBeVisible();
	await expect(page.getByLabel('Sign-in code')).toHaveAttribute('autocomplete', 'one-time-code');
	const firstCode = backend.code;
	await page.getByLabel('Sign-in code').fill('00000000' === firstCode ? '11111111' : '00000000');
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('invalid or has expired');
	await expect(page.getByRole('heading', { name: 'You are signed in', exact: true })).toHaveCount(
		0
	);
	await page.getByRole('button', { name: 'Send a new code', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Code sent.' })).toBeVisible();
	await page.getByLabel('Sign-in code').fill(backend.code);
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'You are signed in', exact: true })).toBeVisible();
	await expect(page.getByText('leo@example.com', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('heading', { name: 'You are signed in', exact: true })).toBeVisible();
	await page.close();
	const reopened = await context.newPage();
	await reopened.goto('/');
	await expect(
		reopened.getByRole('heading', { name: 'You are signed in', exact: true })
	).toBeVisible();
	await reopened.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(reopened.getByLabel('Email address')).toBeVisible();
	await reopened.reload();
	await expect(reopened.getByLabel('Email address')).toBeVisible();
});

test('delivery failure stays on the email form and Ukrainian fits a narrow phone', async ({
	page,
	backend
}) => {
	backend.failDelivery();
	await page.setViewportSize({ width: 320, height: 640 });
	await page.goto('/uk');
	await page.getByLabel('Електронна пошта').fill('leo@example.com');
	await page.getByRole('button', { name: 'Надіслати код', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Не вдалося надіслати код');
	await expect(page.getByLabel('Електронна пошта')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a player creates multiple games and reopens the same seat after reload', async ({
	page,
	backend
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByLabel('Email address').fill('leo@example.com');
	await page.getByRole('button', { name: 'Send code', exact: true }).click();
	await expect(page.getByLabel('Sign-in code')).toBeVisible();
	await page.getByLabel('Sign-in code').fill(backend.code);
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await page.getByLabel('Game name').fill('Evening table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await expect(page.getByRole('heading', { name: 'Evening table' })).toBeVisible();
	await expect(page.getByText('You are the host.', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Evening table' })).toBeVisible();
	await page.getByRole('button', { name: 'All games' }).click();
	await page.getByLabel('Game name').fill('Weekend table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await expect(page.getByRole('heading', { name: 'Weekend table' })).toBeVisible();
	await page.getByRole('button', { name: 'All games' }).click();
	await expect(page.getByRole('button', { name: 'Weekend table' })).toBeVisible();
	await page.getByRole('button', { name: 'Evening table' }).click();
	await expect(page.getByRole('heading', { name: 'Evening table' })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
