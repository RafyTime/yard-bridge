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
	return { t, player };
}
test('an invitation requests host approval before it grants a seat or private game view', async () => {
	const { t, player } = await table();
	const host = await player('host@example.com');
	const guest = await player('guest@example.com');
	const gameId = await host.mutation(api.games.create, { name: 'Evening' });
	const token = await host.mutation(api.games.invite, { gameId });
	expect(await guest.query(api.games.invitation, { token })).toEqual({
		name: 'Evening',
		status: 'invited',
		gameId: null
	});
	await expect(guest.query(api.games.view, { gameId })).rejects.toThrow('Game unavailable');
	await guest.mutation(api.games.requestSeat, { token });
	await guest.mutation(api.games.requestSeat, { token });
	expect(await guest.query(api.games.list, {})).toEqual([]);
	const requests = await host.query(api.games.requests, { gameId });
	expect(requests).toHaveLength(1);
	expect(requests[0].email).toBe('guest@example.com');
	await expect(guest.query(api.games.requests, { gameId })).rejects.toThrow('Host only');
	await expect(
		guest.mutation(api.games.decideSeat, { requestId: requests[0].id, approve: true })
	).rejects.toThrow('Host only');
	await host.mutation(api.games.decideSeat, { requestId: requests[0].id, approve: true });
	const view = await guest.query(api.games.view, { gameId });
	expect(view.seats).toHaveLength(2);
	expect(view.isHost).toBe(false);
	expect(await guest.query(api.games.invitation, { token })).toEqual({
		name: 'Evening',
		status: 'approved',
		gameId
	});
	await guest.mutation(api.games.requestSeat, { token });
	expect((await guest.query(api.games.view, { gameId })).viewerSeatId).toBe(view.viewerSeatId);
	await expect(t.query(api.games.invitation, { token })).rejects.toThrow('Sign in to continue');
});

test('only the host admits two to four players and rejected or excess requests grant no access', async () => {
	const { t, player } = await table();
	const host = await player('host@example.com');
	const gameId = await host.mutation(api.games.create, { name: 'Four seats' });
	const token = await host.mutation(api.games.invite, { gameId });
	const guests = await Promise.all(
		['two', 'three', 'four', 'five', 'rejected'].map((name) => player(`${name}@example.com`))
	);
	await expect(guests[0].mutation(api.games.invite, { gameId })).rejects.toThrow('Host only');
	for (const guest of guests) await guest.mutation(api.games.requestSeat, { token });
	let requests = await host.query(api.games.requests, { gameId });
	const rejected = requests.find((request) => request.email === 'rejected@example.com')!;
	await host.mutation(api.games.decideSeat, { requestId: rejected.id, approve: false });
	expect((await guests[4].query(api.games.invitation, { token })).status).toBe('rejected');
	await expect(guests[4].query(api.games.view, { gameId })).rejects.toThrow('Game unavailable');
	for (let i = 0; i < 3; i++) {
		requests = await host.query(api.games.requests, { gameId });
		await host.mutation(api.games.decideSeat, { requestId: requests[0].id, approve: true });
		expect((await host.query(api.games.view, { gameId })).seats).toHaveLength(i + 2);
	}
	requests = await host.query(api.games.requests, { gameId });
	await expect(
		host.mutation(api.games.decideSeat, { requestId: requests[0].id, approve: true })
	).rejects.toThrow('Table full');
	expect((await host.query(api.games.view, { gameId })).seats).toHaveLength(4);
	const guest = guests[0];
	const viewer = await guest.query(api.players.viewer, {});
	const oldView = await guest.query(api.games.view, { gameId });
	const subject = await t.run(async (ctx) => {
		const sessionId = await ctx.db.insert('authSessions', {
			userId: viewer.id,
			expirationTime: Date.now() + 100000
		});
		return `${viewer.id}|${sessionId}`;
	});
	expect((await t.withIdentity({ subject }).query(api.games.view, { gameId })).viewerSeatId).toBe(
		oldView.viewerSeatId
	);
});
