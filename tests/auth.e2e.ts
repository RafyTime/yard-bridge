import { expect, test as base, type Page } from '@playwright/test';
import { authBackend } from './fixtures/auth-backend';
import {
	card,
	cards,
	choice,
	dealDeck,
	orderedDeck,
	shuffleValues
} from './fixtures/controlled-random';

const test = base.extend<{ backend: Backend }>({
	backend: async ({ context }, use) => {
		const backend = await authBackend(context);
		try {
			await use(backend);
		} finally {
			backend.restore();
		}
	}
});

// Reads the mock identity name on the Seat row that shows `label` (a badge or Seat number).
function seatIdentity(page: Page, label: string) {
	return page
		.getByRole('region', { name: 'Players', exact: true })
		.getByRole('listitem')
		.filter({ has: page.getByText(label, { exact: true }) })
		.getByRole('paragraph')
		.first();
}

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

type Backend = Awaited<ReturnType<typeof authBackend>>;

async function signInAs(page: Page, backend: Backend, email: string) {
	await page.getByLabel('Email address').fill(email);
	await page.getByRole('button', { name: 'Send code', exact: true }).click();
	await expect(page.getByLabel('Sign-in code')).toBeVisible();
	await page.getByLabel('Sign-in code').fill(backend.code);
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'You are signed in', exact: true })).toBeVisible();
}

// Hands the browser to another account at `url`, as a second player on the same device would.
async function switchAccount(page: Page, backend: Backend, url: string, email: string) {
	await signOut(page);
	await page.goto(url);
	await signInAs(page, backend, email);
}

// Opens the current Game's invitation sheet and returns its link.
async function invitationLink(page: Page) {
	await page.getByRole('button', { name: 'Get invitation link' }).click();
	const link = await page.getByLabel('Invitation link', { exact: true }).inputValue();
	await page.getByRole('button', { name: 'Done', exact: true }).click();
	return link;
}

test('email code signs in, returns after reload and reopening, then signs out', async ({
	page,
	context,
	backend
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Pull up a chair', exact: true })).toBeVisible();
	await expect(page.getByLabel('Email address')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Send code', exact: true })).toBeVisible();
	await page.screenshot({ path: test.info().outputPath('sign-in.png') });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.getByLabel('Email address').fill('Leo@example.com');
	const deliver = backend.pauseNextDelivery();
	await page.getByRole('button', { name: 'Send code', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Sending code…', exact: true })).toBeDisabled();
	deliver();
	await expect(page.getByLabel('Sign-in code')).toBeVisible();
	await expect(page.getByLabel('Sign-in code')).toBeFocused();
	await expect(page.getByRole('heading', { name: 'Check your email', exact: true })).toBeVisible();
	await expect(page.getByText('leo@example.com', { exact: true })).toBeVisible();
	await page.screenshot({ path: test.info().outputPath('sign-in-code.png') });
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
	// Requesting the fixture installs the mock backend; the test never signs in.
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
	await page.getByRole('link', { name: 'Your games', exact: true }).click();
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Weekend table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await expect(page.getByRole('heading', { name: 'Weekend table' })).toBeVisible();
	await page.getByRole('link', { name: 'Your games', exact: true }).click();
	const weekend = page.getByRole('listitem').filter({ hasText: 'Weekend table' });
	const evening = page.getByRole('listitem').filter({ hasText: 'Evening table' });
	await expect(weekend).toContainText('Waiting for players');
	await expect(evening).toContainText('Waiting for players');
	// The seat count is mock data, so only its shape and stability are checked.
	const seats = evening.getByText(/^[1-4] of 4 seats$/);
	await expect(seats).toBeVisible();
	const seatText = await seats.textContent();
	await page.screenshot({ path: test.info().outputPath('games-home.png') });
	await page.reload();
	await expect(seats).toHaveText(seatText ?? '');
	await evening.getByRole('link').click();
	await expect(page.getByRole('heading', { name: 'Evening table' })).toBeVisible();
	await expect(page.getByText('You are the host.', { exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('invitation waits for approval and an approved player returns without another request', async ({
	page,
	backend
}) => {
	// Eight sign-ins across three accounts; Firefox needs more than the default budget.
	test.slow();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await signInAs(page, backend, 'host@example.com');
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Private invitation table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	const invitation = await invitationLink(page);
	const gameURL = page.url();
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await expect(page.getByRole('button', { name: 'Request a seat', exact: true })).toBeVisible();
	await expect(page.getByText('Score cutoff', { exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'Request a seat', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'waiting for host approval' })
	).toBeVisible();
	await switchAccount(page, backend, gameURL, 'host@example.com');
	await expect(page.getByText('guest@example.com', { exact: true })).toBeVisible();
	await page.screenshot({ path: test.info().outputPath('seat-approval.png') });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('350');
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Configuration name', { exact: true }).fill('Unfinished table');
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	const hostName = await seatIdentity(page, 'Host').textContent();
	expect(hostName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
	await expect(
		page.getByRole('region', { name: 'Players', exact: true }).getByRole('img')
	).toHaveCount(0);
	await page.getByRole('button', { name: 'Approve', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('350');
	await expect(page.getByLabel('Configuration name', { exact: true })).toHaveValue(
		'Unfinished table'
	);
	await expect(
		page.getByRole('button', { name: 'Save configuration', exact: true })
	).toBeDisabled();
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	await expect(page.getByText('2 of 4 seats occupied', { exact: true })).toBeVisible();
	await expect(seatIdentity(page, 'Host')).toHaveText(hostName!);
	const guestName = await seatIdentity(page, 'Seat 2').textContent();
	expect(guestName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await expect(page.getByText('Your seat is saved.', { exact: true })).toBeVisible();
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	await expect(page.getByText('2 of 4 seats occupied', { exact: true })).toBeVisible();
	await expect(seatIdentity(page, 'You')).toHaveText(guestName!);
	await expect(seatIdentity(page, 'Host')).toHaveText(hostName!);
	await page.reload();
	await expect(page.getByText('Your seat is saved.', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Request a seat', exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toHaveCount(0);
	await reviewRules(page);
	await expect(
		page.getByText('You have reviewed the current rules.', { exact: true })
	).toBeVisible();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Saved configurations' })).toHaveCount(0);
	await switchAccount(page, backend, gameURL, 'host@example.com');
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
	await expect(seatIdentity(page, 'Host')).toHaveText(hostName!);
	await reviewRules(page);
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await reviewRules(page);
	await switchAccount(page, backend, gameURL, 'host@example.com');
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

test('Host reviews changed rules in a phone drawer and starts the Round', async ({
	page,
	backend
}) => {
	// Five sign-ins across two accounts; Firefox needs more than the default budget.
	test.slow();
	await page.setViewportSize({ width: 360, height: 640 });
	await page.goto('/');
	await signInAs(page, backend, 'host@example.com');
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Drawer table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('300');
	await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Players', exact: true }).click();
	const invitation = await invitationLink(page);
	const gameURL = page.url();
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await page.getByRole('button', { name: 'Request a seat', exact: true }).click();
	await switchAccount(page, backend, gameURL, 'host@example.com');
	await page.getByRole('button', { name: 'Approve', exact: true }).click();
	await reviewRules(page);
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await reviewRules(page);
	await switchAccount(page, backend, gameURL, 'host@example.com');

	const trigger = page.getByRole('button', { name: 'Review and start', exact: true });
	await trigger.click();
	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();
	// A bottom drawer spans the phone width and rests on the bottom edge.
	await expect
		.poll(async () => {
			const box = (await drawer.boundingBox())!;
			return [box.width >= 340, Math.round(box.y + box.height)];
		})
		.toEqual([true, 640]);
	expect(await drawer.evaluate((node) => node.contains(document.activeElement))).toBe(true);
	await expect(drawer.getByText('Changed', { exact: true })).toHaveCount(1);
	const start = drawer.getByRole('button', { name: 'Start first round', exact: true });
	const close = drawer.getByRole('button', { name: 'Close', exact: true });
	await drawer.getByText('Later-round starter', { exact: true }).scrollIntoViewIfNeeded();
	await expect(drawer.getByText('Later-round starter', { exact: true })).toBeInViewport();
	await expect(start).toBeInViewport();
	await expect(close).toBeInViewport();
	await page.screenshot({ path: test.info().outputPath('review-drawer-phone.png') });
	await close.click();
	await expect(drawer).toHaveCount(0);
	await expect(trigger).toBeFocused();

	// Wider screens keep a centred dialog.
	await page.setViewportSize({ width: 1024, height: 768 });
	await trigger.click();
	await expect(drawer).toBeVisible();
	await expect
		.poll(async () => {
			const box = (await drawer.boundingBox())!;
			return box.y > 0 && box.y + box.height < 768;
		})
		.toBe(true);
	await close.click();
	await expect(trigger).toBeFocused();

	await page.setViewportSize({ width: 360, height: 640 });
	await trigger.click();
	await start.click();
	await expect(page.getByRole('heading', { name: 'Round 1', exact: true })).toBeVisible();
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
	const explanation = page.getByText('Reaching this total exactly resets your score to zero.', {
		exact: false
	});
	await expect(explanation).toBeVisible();
	// The explanation sits apart from its control rather than crowding it.
	const control = await page.getByLabel('Score cutoff', { exact: true }).boundingBox();
	const help = await explanation.boundingBox();
	expect(help!.y - (control!.y + control!.height)).toBeGreaterThanOrEqual(12);
	await expect(page.getByRole('heading', { name: 'Saved configurations' })).toBeVisible();
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
	await page.getByLabel('Configuration name', { exact: true }).fill('Weekend rules');
	await page.getByRole('button', { name: 'Save configuration', exact: true }).click();
	await expect(page.getByLabel('Use a saved configuration', { exact: true })).toContainText(
		'Weekend rules'
	);
	await page.getByRole('link', { name: 'Your games', exact: true }).click();
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Next table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await reviewRules(page);
	await page.getByLabel('Use a saved configuration', { exact: true }).selectOption('Weekend rules');
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await expect(page.getByRole('button', { name: 'Apply rules', exact: true })).toBeEnabled();
	await expect(
		page.getByText('You have reviewed the current rules.', { exact: true })
	).toBeVisible();
	await page.getByLabel('Configuration name', { exact: true }).fill('Next rules');
	await expect(
		page.getByRole('button', { name: 'Save configuration', exact: true })
	).toBeDisabled();
	await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Save configuration', exact: true })).toBeEnabled();
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
	await reviewRules(page);
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(
		page.getByText('This only changes your draft. Apply rules to save it.', { exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Reset draft to defaults', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('200');
	await expect(
		page.getByText('You have reviewed the current rules.', { exact: true })
	).toBeVisible();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('200');
	await expect(
		page.getByRole('button', { name: 'Save configuration', exact: true })
	).toBeDisabled();
	await page.reload();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Configuration name', { exact: true })).toHaveValue('');
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByLabel('Score cutoff', { exact: true }).fill('500');
	await page.getByRole('link', { name: 'Your games', exact: true }).click();
	await page.getByRole('link', { name: /^Our rules/ }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await page.getByRole('link', { name: 'Your games', exact: true }).click();
	await page.getByRole('link', { name: /^Next table/ }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('300');
	await expect(
		page.getByRole('switch', { name: 'Special King of Spades', exact: true })
	).toBeChecked();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await page.getByRole('button', { name: 'How to play', exact: true }).click();
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
		page.getByRole('button', { name: 'Save configuration', exact: true })
	).toBeDisabled();
	await page.getByRole('button', { name: 'Load latest rules', exact: true }).click();
	await page.getByRole('radio', { name: 'Table rules', exact: true }).click();
	await expect(page.getByLabel('Score cutoff', { exact: true })).toHaveValue('275');
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Save configuration', exact: true })).toBeEnabled();
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

test('players take ordinary turns, drawing until the drawn card must be played', async ({
	page,
	backend
}) => {
	// Six sign-ins across two accounts; Firefox needs more than the default budget.
	test.slow();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await signInAs(page, backend, 'host@example.com');
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Turn table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	const invitation = await invitationLink(page);
	const gameURL = page.url();
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await page.getByRole('button', { name: 'Request a seat', exact: true }).click();
	await switchAccount(page, backend, gameURL, 'host@example.com');
	await page.getByRole('button', { name: 'Approve', exact: true }).click();
	await reviewRules(page);
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await reviewRules(page);
	await switchAccount(page, backend, gameURL, 'host@example.com');
	// The Host opens 9♥; the guest has no match and draws 7♣ and 8♣ before 10♥.
	const deck = dealDeck(
		[cards('10c 10d Ks Kd'), cards('Qc Ac 7d 8s Qd')],
		card('9h'),
		cards('7c 8c 10h')
	);
	backend.scriptNextRound([...shuffleValues(orderedDeck, deck), choice(0, 2)]);
	await page.getByRole('button', { name: 'Review and start', exact: true }).click();
	await page.getByRole('button', { name: 'Start first round', exact: true }).click();
	await expect(page.getByText('Current player: seat 2.', { exact: true })).toBeVisible();
	const hand = page.getByRole('list', { name: 'Your hand', exact: true });
	await expect(hand.getByRole('button', { disabled: false })).toHaveCount(0);

	await switchAccount(page, backend, gameURL, 'guest@example.com');
	await expect(page.getByRole('status').filter({ hasText: 'Your turn.' })).toBeVisible();
	await page.getByRole('button', { name: 'Draw', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'You drew the 10 of hearts. Play it now.' })
	).toBeVisible();
	await expect(page.getByText('Seat 2: 8 cards', { exact: false })).toBeVisible();
	await expect(hand.getByRole('button', { disabled: false })).toHaveCount(1);
	await page.reload();
	await page.getByRole('button', { name: 'Select 10 of hearts', exact: true }).click();
	await page.getByRole('button', { name: 'Play selected cards', exact: true }).click();
	await expect(page.getByText('Current player: seat 1.', { exact: true })).toBeVisible();
	await expect(page.getByRole('img', { name: '10 of hearts', exact: true })).toBeVisible();
	await expect(page.getByText('Seat 2: 7 cards', { exact: false })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

	await switchAccount(page, backend, gameURL, 'host@example.com');
	await page.getByRole('button', { name: 'Select 10 of clubs', exact: true }).click();
	await page.getByRole('button', { name: 'Play selected cards', exact: true }).click();
	await expect(page.getByText('Current player: seat 2.', { exact: true })).toBeVisible();
	await expect(page.getByText('Seat 1: 3 cards', { exact: false })).toBeVisible();
	await page.screenshot({
		path: test.info().outputPath('ordinary-turn-phone.png'),
		fullPage: true
	});
	await page.goto(`/uk${new URL(page.url()).search}`);
	await page.setViewportSize({ width: 320, height: 640 });
	await expect(page.getByText('Зараз ходить гравець на місці 2.', { exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({
		path: test.info().outputPath('ordinary-turn-uk-phone.png'),
		fullPage: true
	});
});

test('players arrange a same-rank group, cover a 6, and choose a Jack suit', async ({
	page,
	backend
}) => {
	// Six sign-ins across two accounts; Firefox needs more than the default budget.
	test.slow();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await signInAs(page, backend, 'host@example.com');
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Wild table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	const invitation = await invitationLink(page);
	const gameURL = page.url();
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await page.getByRole('button', { name: 'Request a seat', exact: true }).click();
	await switchAccount(page, backend, gameURL, 'host@example.com');
	await page.getByRole('button', { name: 'Approve', exact: true }).click();
	await reviewRules(page);
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await reviewRules(page);
	await switchAccount(page, backend, gameURL, 'host@example.com');
	// The Host opens 9♥ and holds 6♠ and K♠; the guest holds 10♥ 10♠ and J♣.
	const deck = dealDeck([cards('6s Ks Kd 8c'), cards('10h 10s Jc 7d Qd')], card('9h'));
	backend.scriptNextRound([...shuffleValues(orderedDeck, deck), choice(0, 2)]);
	await page.getByRole('button', { name: 'Review and start', exact: true }).click();
	await page.getByRole('button', { name: 'Start first round', exact: true }).click();
	await expect(page.getByText('Current player: seat 2.', { exact: true })).toBeVisible();

	await switchAccount(page, backend, gameURL, 'guest@example.com');
	const hand = page.getByRole('list', { name: 'Your hand', exact: true });
	await expect(hand.getByRole('button', { name: '10 of spades', exact: true })).toBeDisabled();
	await hand.getByRole('button', { name: 'Select 10 of hearts', exact: true }).click();
	await hand.getByRole('button', { name: 'Select 10 of spades', exact: true }).click();
	const group = page.getByRole('list', { name: 'Your play, first to last', exact: true });
	await expect(group.getByRole('listitem')).toHaveText(['10 of hearts', '10 of spades']);
	await page.getByRole('button', { name: 'Play selected cards', exact: true }).click();
	await expect(page.getByRole('img', { name: '10 of spades', exact: true })).toBeVisible();
	await expect(page.getByText('Active suit: spades.', { exact: true })).toBeVisible();

	await switchAccount(page, backend, gameURL, 'host@example.com');
	await hand.getByRole('button', { name: 'Select 6 of spades', exact: true }).click();
	await page.getByRole('button', { name: 'Play selected cards', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'Cover the 6 with a spades card or another 6' })
	).toBeVisible();
	await expect(hand.getByRole('button', { disabled: false })).toHaveCount(1);
	await hand.getByRole('button', { name: 'Select K of spades', exact: true }).click();
	await page.getByRole('button', { name: 'Play selected cards', exact: true }).click();
	await expect(page.getByText('Current player: seat 2.', { exact: true })).toBeVisible();

	await switchAccount(page, backend, gameURL, 'guest@example.com');
	await hand.getByRole('button', { name: 'Select J of clubs', exact: true }).click();
	const picker = page.getByRole('group', { name: 'Choose the active suit', exact: true });
	await page.screenshot({ path: test.info().outputPath('jack-suit-phone.png'), fullPage: true });
	await picker.getByRole('button', { name: 'hearts', exact: true }).click();
	await expect(page.getByText('Active suit: hearts.', { exact: true })).toBeVisible();
	await expect(page.getByRole('img', { name: 'J of clubs', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.goto(`/uk${new URL(page.url()).search}`);
	await page.setViewportSize({ width: 320, height: 640 });
	await expect(page.getByText('Активна масть: черви.', { exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({
		path: test.info().outputPath('wild-turn-uk-phone.png'),
		fullPage: true
	});
});

test('a stacked 8 effect waits on its target, who accepts the draw and is skipped', async ({
	page,
	backend
}) => {
	// Six sign-ins across two accounts; Firefox needs more than the default budget.
	test.slow();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await signInAs(page, backend, 'host@example.com');
	await page.getByRole('button', { name: 'New game', exact: true }).click();
	await page.getByLabel('Game name').fill('Draw effect table');
	await page.getByRole('button', { name: 'Create private game' }).click();
	const invitation = await invitationLink(page);
	const gameURL = page.url();
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await page.getByRole('button', { name: 'Request a seat', exact: true }).click();
	await switchAccount(page, backend, gameURL, 'host@example.com');
	await page.getByRole('button', { name: 'Approve', exact: true }).click();
	await reviewRules(page);
	await switchAccount(page, backend, invitation, 'guest@example.com');
	await reviewRules(page);
	await switchAccount(page, backend, gameURL, 'host@example.com');
	// The Host opens 9♥; the guest stacks 8♥ 8♦, so the Host draws four and is skipped.
	const deck = dealDeck([cards('10c 10d Ks Kd'), cards('8h 8d Qc Ac 7s')], card('9h'));
	backend.scriptNextRound([...shuffleValues(orderedDeck, deck), choice(0, 2)]);
	await page.getByRole('button', { name: 'Review and start', exact: true }).click();
	await page.getByRole('button', { name: 'Start first round', exact: true }).click();
	await expect(page.getByText('Current player: seat 2.', { exact: true })).toBeVisible();

	await switchAccount(page, backend, gameURL, 'guest@example.com');
	const hand = page.getByRole('list', { name: 'Your hand', exact: true });
	await hand.getByRole('button', { name: 'Select 8 of hearts', exact: true }).click();
	await hand.getByRole('button', { name: 'Select 8 of diamonds', exact: true }).click();
	await page.getByRole('button', { name: 'Play selected cards', exact: true }).click();
	await expect(
		page.getByText('Seat 1 must draw 4 and miss this turn.', { exact: true })
	).toBeVisible();
	await expect(page.getByRole('button', { name: /^Accept/ })).toHaveCount(0);

	await switchAccount(page, backend, gameURL, 'host@example.com');
	await expect(
		page.getByRole('status').filter({ hasText: 'Draw 4 and miss this turn.' })
	).toBeVisible();
	await expect(hand.getByRole('button', { disabled: false })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Draw', exact: true })).toHaveCount(0);
	await page.screenshot({ path: test.info().outputPath('draw-effect-phone.png'), fullPage: true });
	await page.goto(`/uk${new URL(page.url()).search}`);
	await page.setViewportSize({ width: 320, height: 640 });
	await expect(
		page.getByRole('status').filter({ hasText: 'Візьміть з колоди 4 шт. і пропустіть хід.' })
	).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({
		path: test.info().outputPath('draw-effect-uk-phone.png'),
		fullPage: true
	});
	await page.getByRole('button', { name: 'Прийняти й узяти 4 шт.', exact: true }).click();
	await expect(page.getByText('Зараз ходить гравець на місці 2.', { exact: true })).toBeVisible();
	await expect(page.getByText('Місце 1: 8 карт', { exact: false })).toBeVisible();
	await expect(page.getByRole('status').filter({ hasText: 'Візьміть з колоди' })).toHaveCount(0);
});
