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

test('invitation waits for approval and an approved player returns without another request', async ({
	page,
	backend
}) => {
	async function signIn(email: string) {
		await page.getByLabel('Email address').fill(email);
		await page.getByRole('button', { name: 'Send code', exact: true }).click();
		await expect(page.getByLabel('Sign-in code')).toBeVisible();
		await page.getByLabel('Sign-in code').fill(backend.code);
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
	}
	async function signOut() {
		await page.getByRole('button', { name: 'Sign out', exact: true }).click();
		await expect(page.getByLabel('Email address')).toBeVisible();
	}
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await signIn('host@example.com');
	await page.getByLabel('Game name').fill('Private invitation table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await page.getByRole('button', { name: 'Get invitation link' }).click();
	const invitation = await page.getByLabel('Invitation link', { exact: true }).inputValue();
	const gameURL = page.url();
	await signOut();
	await page.goto(invitation);
	await signIn('guest@example.com');
	await expect(page.getByRole('button', { name: 'Request a seat', exact: true })).toBeVisible();
	await expect(page.getByText('Score cutoff', { exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'Request a seat', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'waiting for host approval' })
	).toBeVisible();
	await signOut();
	await page.goto(gameURL);
	await signIn('host@example.com');
	await expect(page.getByText('guest@example.com', { exact: true })).toBeVisible();
	await page.screenshot({ path: test.info().outputPath('seat-approval.png') });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.getByRole('button', { name: 'Approve', exact: true }).click();
	await expect(page.getByText('2 of 4 seats occupied', { exact: true })).toBeVisible();
	await signOut();
	await page.goto(invitation);
	await signIn('guest@example.com');
	await expect(page.getByText('Your seat is saved.', { exact: true })).toBeVisible();
	await expect(page.getByText('2 of 4 seats occupied', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByText('Your seat is saved.', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Request a seat', exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'I have reviewed these rules', exact: true }).click();
	await expect(
		page.getByText('You have reviewed the current rules.', { exact: true })
	).toBeVisible();
	await signOut();
	await page.goto(gameURL);
	await signIn('host@example.com');
	await page.getByRole('button', { name: 'I have reviewed these rules', exact: true }).click();
	await expect(
		page.getByText('Everyone has reviewed the rules. The table is ready to start.', { exact: true })
	).toBeVisible();
	await page.getByLabel('Score cutoff', { exact: true }).fill('300');
	await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'I have reviewed these rules', exact: true })
	).toBeVisible();
	await expect(page.getByText('Review needed', { exact: false })).toHaveCount(2);
	await page.getByRole('button', { name: 'I have reviewed these rules', exact: true }).click();
	await signOut();
	await page.goto(invitation);
	await signIn('guest@example.com');
	await page.getByRole('button', { name: 'I have reviewed these rules', exact: true }).click();
	await signOut();
	await page.goto(gameURL);
	await signIn('host@example.com');
	await page.getByRole('button', { name: 'Start first round', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Round 1', exact: true })).toBeVisible();
	const hand = page.getByRole('list', { name: 'Your hand', exact: true });
	const cards = await hand.getByRole('listitem').allTextContents();
	expect(await hand.getByRole('listitem').count()).toBeGreaterThanOrEqual(4);
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Round 1', exact: true })).toBeVisible();
	await expect(hand.getByRole('listitem')).toHaveText(cards);
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toHaveCount(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({
		path: test.info().outputPath('opening-round-phone.png'),
		fullPage: true
	});
	await page.goto(`/uk${new URL(page.url()).search}`);
	await page.setViewportSize({ width: 320, height: 640 });
	await expect(page.getByRole('heading', { name: 'Раунд 1', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({
		path: test.info().outputPath('opening-round-uk-phone.png'),
		fullPage: true
	});
});

test('Host edits advanced rules and copies a saved configuration into a later Game on phones', async ({
	page,
	backend
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByLabel('Email address').fill('host@example.com');
	await page.getByRole('button', { name: 'Send code', exact: true }).click();
	await expect(page.getByLabel('Sign-in code')).toBeVisible();
	await page.getByLabel('Sign-in code').fill(backend.code);
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await page.getByLabel('Game name').fill('Our rules');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('300');
	await page.getByRole('switch', { name: 'Special King of Spades', exact: true }).click();
	await page.getByText('Detailed settings', { exact: true }).first().click();
	await page.getByRole('radio', { name: 'Cancel incoming effect', exact: true }).click();
	await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await expect(
		page.getByText('Ace behavior: Cancel incoming effect.', { exact: false })
	).toBeVisible();
	await page.getByRole('button', { name: 'I have reviewed these rules', exact: true }).click();
	await expect(
		page.getByText('Invite at least one more player before starting.', { exact: true })
	).toBeVisible();
	await page.getByText('Saved configurations', { exact: true }).click();
	await page.getByLabel('Configuration name', { exact: true }).fill('Weekend rules');
	await page.getByRole('button', { name: 'Save current rules', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Use Weekend rules', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'All games', exact: true }).click();
	await page.getByLabel('Game name').fill('Next table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await page.getByText('Saved configurations', { exact: true }).click();
	await page.getByRole('button', { name: 'Use Weekend rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await expect(
		page.getByRole('switch', { name: 'Special King of Spades', exact: true })
	).toBeChecked();
	await page.getByText('How to play', { exact: true }).click();
	await expect(
		page.getByText('An Ace skips the next player by default.', { exact: false })
	).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: test.info().outputPath('rules-phone.png'), fullPage: true });
	await page.goto(`/uk${new URL(page.url()).search}`);
	await page.setViewportSize({ width: 320, height: 640 });
	await expect(page.getByRole('heading', { name: 'Правила столу', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: test.info().outputPath('rules-uk-phone.png'), fullPage: true });
});
