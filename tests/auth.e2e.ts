import { expect, test as base, type Page } from '@playwright/test';
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

// Account settings live behind the top bar's account button, not in the main layout.
async function openAccount(page: Page) {
	await page.getByRole('button', { name: 'Account and settings', exact: true }).click();
	return page.getByRole('dialog', { name: 'Account and settings', exact: true });
}

async function signOut(page: Page) {
	await (await openAccount(page)).getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page.getByLabel('Email address')).toBeVisible();
}

async function reviewRules(page: Page) {
	const review = page.getByRole('button', { name: 'Review and start', exact: true });
	const ready = page.getByRole('button', { name: 'I have reviewed these rules', exact: true });
	await expect(review.or(ready).first()).toBeVisible();
	if (await review.isVisible()) await review.click();
	await ready.click();
	await expect(ready).toHaveCount(0);
	if (await page.getByRole('dialog').count())
		await page.getByRole('button', { name: 'Close', exact: true }).click();
}

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
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText(
		'invalid or has expired'
	);
	await expect(page.getByRole('heading', { name: 'You are signed in', exact: true })).toHaveCount(
		0
	);
	await page.getByRole('button', { name: 'Send a new code', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Code sent.' })).toBeVisible();
	await page.getByLabel('Sign-in code').fill(backend.code);
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'You are signed in', exact: true })).toBeVisible();
	await expect(page.getByText('leo@example.com', { exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
	const account = await openAccount(page);
	await expect(account.getByText('leo@example.com', { exact: true })).toBeVisible();
	await expect(account.getByText('Preview', { exact: true })).toBeVisible();
	await account.getByLabel('Username').fill('Lucky Otter');
	await account.getByRole('radio', { name: 'Avatar 3', exact: true }).click();
	await page.keyboard.press('Escape');
	await expect(account).toHaveCount(0);
	await expect(
		page.getByRole('button', { name: 'Account and settings', exact: true })
	).toBeFocused();
	await page.reload();
	await expect(page.getByRole('heading', { name: 'You are signed in', exact: true })).toBeVisible();
	const reloaded = await openAccount(page);
	await expect(reloaded.getByLabel('Username')).toHaveValue('Lucky Otter');
	await expect(reloaded.getByRole('radio', { name: 'Avatar 3', exact: true })).toBeChecked();
	await page.keyboard.press('Escape');
	await page.reload();
	await expect(page.getByRole('heading', { name: 'You are signed in', exact: true })).toBeVisible();
	await page.close();
	const reopened = await context.newPage();
	await reopened.goto('/');
	await expect(
		reopened.getByRole('heading', { name: 'You are signed in', exact: true })
	).toBeVisible();
	await signOut(reopened);
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
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText(
		'Не вдалося надіслати код'
	);
	await expect(page.getByLabel('Електронна пошта')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('language and appearance apply immediately and survive a reload', async ({
	page,
	backend
}) => {
	void backend;
	await page.emulateMedia({ colorScheme: 'light' });
	await page.setViewportSize({ width: 320, height: 640 });
	await page.goto('/');
	await expect(page.getByText('Yard Bridge', { exact: true })).toBeVisible();
	const button = page.getByRole('button', { name: 'Account and settings', exact: true });
	const size = await button.boundingBox();
	expect(size!.width).toBeGreaterThanOrEqual(44);
	expect(size!.height).toBeGreaterThanOrEqual(44);
	let settings = await openAccount(page);
	await expect(settings.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
	await settings.getByRole('radio', { name: 'Dark', exact: true }).click();
	await expect(page.locator('html')).toHaveClass(/\bdark\b/);
	await settings.getByRole('radio', { name: 'Українська', exact: true }).click();
	await expect(page.getByLabel('Електронна пошта')).toBeVisible();
	await page.reload();
	await expect(page.getByLabel('Електронна пошта')).toBeVisible();
	await expect(page.locator('html')).toHaveClass(/\bdark\b/);
	await page.getByRole('button', { name: 'Обліковий запис і налаштування', exact: true }).click();
	settings = page.getByRole('dialog', { name: 'Обліковий запис і налаштування', exact: true });
	await expect(settings.getByRole('radio', { name: 'Темна', exact: true })).toBeChecked();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	const box = await settings.boundingBox();
	expect(box!.x).toBeGreaterThanOrEqual(0);
	expect(box!.x + box!.width).toBeLessThanOrEqual(320);
	await settings.getByRole('radio', { name: 'Системна', exact: true }).click();
	await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
	await page.reload();
	await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
	await page.emulateMedia({ colorScheme: 'dark' });
	await expect(page.locator('html')).toHaveClass(/\bdark\b/);
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
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Evening table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await expect(page.getByRole('heading', { name: 'Evening table' })).toBeVisible();
	await expect(page.getByText('You are the host.', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Evening table' })).toBeVisible();
	await page.getByRole('button', { name: 'All games' }).click();
	await page.getByRole('button', { name: 'New game', exact: true }).click();
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
		await expect(
			page.getByRole('heading', { name: 'You are signed in', exact: true })
		).toBeVisible();
	}
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await signIn('host@example.com');
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Private invitation table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await page.getByRole('button', { name: 'Get invitation link' }).click();
	const invitation = await page.getByLabel('Invitation link', { exact: true }).inputValue();
	await page.getByRole('button', { name: 'Done', exact: true }).click();
	const gameURL = page.url();
	await signOut(page);
	await page.goto(invitation);
	await signIn('guest@example.com');
	await expect(page.getByRole('button', { name: 'Request a seat', exact: true })).toBeVisible();
	await expect(page.getByText('Score cutoff', { exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'Request a seat', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'waiting for host approval' })
	).toBeVisible();
	await signOut(page);
	await page.goto(gameURL);
	await signIn('host@example.com');
	await expect(page.getByText('guest@example.com', { exact: true })).toBeVisible();
	await page.screenshot({ path: test.info().outputPath('seat-approval.png') });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('350');
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByText('Saved configurations', { exact: true }).click();
	await page.getByLabel('Configuration name', { exact: true }).fill('Unfinished table');
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	await page.getByRole('button', { name: 'Approve', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('350');
	await expect(page.getByLabel('Configuration name', { exact: true })).toHaveValue(
		'Unfinished table'
	);
	await expect(
		page.getByRole('button', { name: 'Save current rules', exact: true })
	).toBeDisabled();
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	await expect(page.getByText('2 of 4 seats occupied', { exact: true })).toBeVisible();
	await signOut(page);
	await page.goto(invitation);
	await signIn('guest@example.com');
	await expect(page.getByText('Your seat is saved.', { exact: true })).toBeVisible();
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	await expect(page.getByText('2 of 4 seats occupied', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByText('Your seat is saved.', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Request a seat', exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toHaveCount(0);
	await reviewRules(page);
	await expect(
		page.getByText('You have reviewed the current rules.', { exact: true })
	).toBeVisible();
	await signOut(page);
	await page.goto(gameURL);
	await signIn('host@example.com');
	await reviewRules(page);
	await expect(
		page.getByText('Everyone has reviewed the rules. The table is ready to start.', { exact: true })
	).toBeVisible();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('300');
	await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Review and start', exact: true })).toBeVisible();
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	await expect(page.getByText('Review needed', { exact: false })).toHaveCount(2);
	await reviewRules(page);
	await signOut(page);
	await page.goto(invitation);
	await signIn('guest@example.com');
	await reviewRules(page);
	await signOut(page);
	await page.goto(gameURL);
	await signIn('host@example.com');
	await page.getByRole('button', { name: 'Review and start', exact: true }).click();
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
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Our rules');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByRole('button', { name: 'About Score cutoff', exact: true }).click();
	await expect(
		page.getByText('Reaching this total exactly resets your score to zero.', { exact: false })
	).toBeVisible();
	await page.getByLabel('Score cutoff', { exact: true }).fill('0');
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toBeDisabled();
	await expect(page.getByText('Enter a positive whole number.', { exact: true })).toBeVisible();
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('200');
	await page.getByLabel('Score cutoff', { exact: true }).fill('300');
	await page.getByRole('switch', { name: 'Special King of Spades', exact: true }).click();
	await page.getByRole('radio', { name: 'Cancel incoming effect', exact: true }).click();
	await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await expect(
		page.getByRole('radio', { name: 'Cancel incoming effect', exact: true })
	).toBeChecked();
	await reviewRules(page);
	await expect(
		page.getByText('Invite at least one more player before starting.', { exact: true })
	).toBeVisible();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByText('Saved configurations', { exact: true }).click();
	await page.getByLabel('Configuration name', { exact: true }).fill('Weekend rules');
	await page.getByRole('button', { name: 'Save current rules', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Use Weekend rules', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'All games', exact: true }).click();
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Next table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByText('Saved configurations', { exact: true }).click();
	await reviewRules(page);
	await page.getByRole('button', { name: 'Use Weekend rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toBeEnabled();
	await expect(
		page.getByText('You have reviewed the current rules.', { exact: true })
	).toBeVisible();
	await page.getByLabel('Configuration name', { exact: true }).fill('Next rules');
	await expect(
		page.getByRole('button', { name: 'Save current rules', exact: true })
	).toBeDisabled();
	await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Save current rules', exact: true })).toBeEnabled();
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
	await reviewRules(page);
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByRole('button', { name: 'Use defaults', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('200');
	await expect(
		page.getByText('You have reviewed the current rules.', { exact: true })
	).toBeVisible();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('200');
	await expect(
		page.getByRole('button', { name: 'Save current rules', exact: true })
	).toBeDisabled();
	await page.reload();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByText('Saved configurations', { exact: true }).click();
	await expect(page.getByLabel('Configuration name', { exact: true })).toHaveValue('');
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('500');
	await page.getByRole('button', { name: 'All games', exact: true }).click();
	await page.getByRole('button', { name: 'Our rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await page.getByRole('button', { name: 'All games', exact: true }).click();
	await page.getByRole('button', { name: 'Next table', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await expect(
		page.getByRole('switch', { name: 'Special King of Spades', exact: true })
	).toBeChecked();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByText('How to play', { exact: true }).click();
	await expect(
		page.getByRole('listitem').filter({ hasText: 'An Ace skips the next player by default.' })
	).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: test.info().outputPath('rules-phone.png'), fullPage: true });
	await page.goto(`/uk${new URL(page.url()).search}`);
	await page.setViewportSize({ width: 320, height: 640 });
	await page.getByRole('radio', { name: 'Правила столу', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Правила столу', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: test.info().outputPath('rules-uk-phone.png'), fullPage: true });
});

test('Rules drafts follow clean updates, require explicit conflict reload, and survive stale Apply', async ({
	page,
	context,
	backend
}) => {
	await page.goto('/');
	await page.getByLabel('Email address').fill('host@example.com');
	await page.getByRole('button', { name: 'Send code', exact: true }).click();
	await expect(page.getByLabel('Sign-in code')).toBeVisible();
	await page.getByLabel('Sign-in code').fill(backend.code);
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Shared table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await expect(page.getByRole('heading', { name: 'Shared table', exact: true })).toBeVisible();
	const other = await context.newPage();
	await other.goto(page.url());
	await other.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await other.getByLabel('Score cutoff', { exact: true }).fill('250');
	await other.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('250');
	await expect(other.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('300');
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByText('Saved configurations', { exact: true }).click();
	await page.getByLabel('Configuration name', { exact: true }).fill('My draft');
	await other.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await other.getByLabel('Score cutoff', { exact: true }).fill('275');
	await other.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText(
		'Applied rules changed elsewhere'
	);
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await expect(page.getByLabel('Configuration name', { exact: true })).toHaveValue('My draft');
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toBeDisabled();
	await expect(
		page.getByRole('button', { name: 'Save current rules', exact: true })
	).toBeDisabled();
	await page.getByRole('button', { name: 'Load latest rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('275');
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Save current rules', exact: true })).toBeEnabled();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('350');
	const resume = backend.pauseNextRulesUpdate();
	await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toBeDisabled();
	await other.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await other.getByLabel('Score cutoff', { exact: true }).fill('400');
	await other.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await expect(other.getByLabel('Score cutoff', { exact: true })).toHaveValue('400');
	resume();
	await expect(
		page.getByRole('alert').filter({ hasText: /\S/ }).filter({ hasText: 'Could not complete' })
	).toBeVisible();
	await expect(
		page
			.getByRole('alert')
			.filter({ hasText: /\S/ })
			.filter({ hasText: 'Applied rules changed elsewhere' })
	).toBeVisible();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('350');
	await expect(page.getByLabel('Configuration name', { exact: true })).toHaveValue('My draft');
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toBeDisabled();
	await page.reload();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('400');
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
});
