/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob(['./**/*.{ts,js}', '!./**/*.test.ts', '!./**/*.d.ts']);

test('starts at zero and exposes each saved increment through the public query', async () => {
	const t = convexTest(schema, modules);
	expect(await t.query(api.counter.get, {})).toBe(0);
	expect(await t.mutation(api.counter.increment, {})).toBe(1);
	expect(await t.query(api.counter.get, {})).toBe(1);
	expect(await t.mutation(api.counter.increment, {})).toBe(2);
	expect(await t.query(api.counter.get, {})).toBe(2);
});
