import { self as worker } from '$app/service-worker';
import { version } from '$app/env';
import { immutable, assets, prerendered } from '$app/manifest';
import { resolve } from '$app/paths';
import type { Path } from '$app/types';

const cachePrefix = 'yard-bridge-shell-';
const cacheName = `${cachePrefix}${version}`;
const shellPaths = new Set<string>(
	[...immutable, ...assets, ...prerendered].map(({ path }) => resolve(path as Path))
);

worker.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(cacheName);
			await cache.addAll([...shellPaths]);
		})()
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames
					.filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
					.map((name) => caches.delete(name))
			);
			await worker.clients.claim();
		})()
	);
});

worker.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only serve known build output. Backend traffic and unknown routes use the network.
	if (request.method !== 'GET' || url.origin !== worker.location.origin) return;
	if (!shellPaths.has(url.pathname)) return;
	// Query parameters on non-navigation requests can change the response's meaning.
	if (url.search && request.mode !== 'navigate') return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(cacheName);
			// Use one build's HTML and assets together, including while offline.
			return (await cache.match(url.pathname)) ?? fetch(request);
		})()
	);
});
