/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vite-plus/test';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob(['./**/*.{ts,js}', '!./**/*.test.ts', '!./**/*.d.ts']);
async function table() {
	const t = convexTest(schema, modules);
	async function player(email: string) {
		const subject = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', { email, emailVerificationTime: 1 });
			const sessionId = await ctx.db.insert('authSessions', {
				userId,
				expirationTime: Date.now() + 100000
			});
			return `${userId}|${sessionId}`;
		});
		return t.withIdentity({ subject });
	}
	const host = await player('host@example.com');
	const guest = await player('guest@example.com');
	const gameId = await host.mutation(api.games.create, { name: 'Evening' });
	const token = await host.mutation(api.games.invite, { gameId });
	await guest.mutation(api.games.requestSeat, { token });
	const [request] = await host.query(api.games.requests, { gameId });
	await host.mutation(api.games.decideSeat, { requestId: request.id, approve: true });
	return { t, host, guest, gameId, player };
}

test('only the Host edits rules and every approved player reviews the current version', async () => {
	const { host, guest, gameId, t } = await table();
	const initial = await host.query(api.games.view, { gameId });
	await expect(
		guest.mutation(api.gameRules.update, {
			gameId,
			expectedVersion: initial.version,
			rules: { ...initial.rules, scoreCutoff: 300 }
		})
	).rejects.toThrow('Host only');
	await expect(
		t.mutation(api.gameRules.ready, { gameId, expectedVersion: initial.version })
	).rejects.toThrow('Sign in');
	await host.mutation(api.gameRules.ready, { gameId, expectedVersion: initial.version });
	expect((await host.query(api.games.view, { gameId })).canStart).toBe(false);
	await guest.mutation(api.gameRules.ready, { gameId, expectedVersion: initial.version });
	expect((await guest.query(api.games.view, { gameId })).canStart).toBe(true);
	await host.mutation(api.gameRules.update, {
		gameId,
		expectedVersion: initial.version,
		rules: { ...initial.rules, scoreCutoff: 300, aceBehavior: 'cancel' }
	});
	const changed = await guest.query(api.games.view, { gameId });
	expect(changed.rules).toMatchObject({ scoreCutoff: 300, aceBehavior: 'cancel' });
	expect(changed.seats.map((seat) => seat.ready)).toEqual([false, false]);
	expect(changed.canStart).toBe(false);
	await expect(
		guest.mutation(api.gameRules.ready, { gameId, expectedVersion: initial.version })
	).rejects.toThrow('Game changed');
	await expect(
		host.mutation(api.gameRules.update, {
			gameId,
			expectedVersion: initial.version,
			rules: initial.rules
		})
	).rejects.toThrow('Game changed');
});

test('the Host saves a private rules snapshot and reuses it without changing the source Game', async () => {
	const { host, guest, gameId } = await table();
	const original = await host.query(api.games.view, { gameId });
	await host.mutation(api.gameRules.update, {
		gameId,
		expectedVersion: original.version,
		rules: { ...original.rules, handSize: 9, kingOfSpades: true }
	});
	const source = await host.query(api.games.view, { gameId });
	await expect(
		guest.mutation(api.gameRules.save, { gameId, expectedVersion: source.version, name: 'Ours' })
	).rejects.toThrow('Host only');
	await host.mutation(api.gameRules.save, {
		gameId,
		expectedVersion: source.version,
		name: '  Ours  '
	});
	const [saved] = await host.query(api.gameRules.saved, {});
	expect(saved.name).toBe('Ours');
	expect(await guest.query(api.gameRules.saved, {})).toEqual([]);
	const laterId = await host.mutation(api.games.create, { name: 'Later' });
	const later = await host.query(api.games.view, { gameId: laterId });
	await host.mutation(api.gameRules.ready, { gameId: laterId, expectedVersion: later.version });
	expect((await host.query(api.games.view, { gameId: laterId })).canStart).toBe(false);
	await host.mutation(api.gameRules.update, {
		gameId: laterId,
		expectedVersion: later.version,
		rules: saved.rules
	});
	expect((await host.query(api.games.view, { gameId: laterId })).rules).toEqual(source.rules);
	await host.mutation(api.gameRules.update, {
		gameId: laterId,
		expectedVersion: later.version + 1,
		rules: { ...saved.rules, scoreCutoff: 400 }
	});
	expect(await host.query(api.games.view, { gameId })).toEqual(source);
	expect((await host.query(api.gameRules.saved, {}))[0].rules.scoreCutoff).toBe(200);
});
