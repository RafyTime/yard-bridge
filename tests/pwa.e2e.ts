import { expect, test } from '@playwright/test';

test('installs an app shell that reloads offline in every configured language', async ({
	page,
	context
}) => {
	await page.goto('/');
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
		if (!navigator.serviceWorker.controller) {
			await new Promise<void>((resolve) => {
				navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
					once: true
				});
			});
		}
	});

	const manifest = await page.evaluate(async () => {
		const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href;
		return (await fetch(href)).json();
	});
	expect(manifest.name).toBe('Yard Bridge');
	expect(manifest.display).toBe('standalone');
	expect(manifest.icons).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
			expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
			expect.objectContaining({ sizes: '512x512', purpose: 'maskable' })
		])
	);
	for (const icon of manifest.icons) {
		const dimensions = await page.evaluate(async (src: string) => {
			const image = new Image();
			image.src = src;
			await image.decode();
			return `${image.naturalWidth}x${image.naturalHeight}`;
		}, icon.src);
		expect(dimensions).toBe(icon.sizes);
	}

	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	for (const path of ['/es', '/uk', '/uk/demo/paraglide']) {
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	}
	expect(await page.locator('html').getAttribute('lang')).toBe('uk');

	// No cached app shell may masquerade as a backend response.
	const backendUnavailable = await page.evaluate(async () => {
		try {
			await fetch('/api/pwa-test', { method: 'POST' });
			return false;
		} catch {
			return true;
		}
	});
	expect(backendUnavailable).toBe(true);
	const cachedPaths = await page.evaluate(async () => {
		const names = await caches.keys();
		const paths = await Promise.all(
			names
				.filter((name) => name.startsWith('yard-bridge-shell-'))
				.map(async (name) => {
					const cache = await caches.open(name);
					return (await cache.keys()).map((request) => new URL(request.url).pathname);
				})
		);
		return paths.flat();
	});
	expect(cachedPaths).not.toContain('/api/pwa-test');
});
