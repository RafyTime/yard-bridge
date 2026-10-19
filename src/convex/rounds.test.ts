/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from './_generated/api';
import schema from './schema';
import { createPlayer } from '../../tests/fixtures/convex-player';

const modules = import.meta.glob(['./**/*.{ts,js}', '!./**/*.test.ts', '!./**/*.d.ts']);
afterEach(() => vi.restoreAllMocks());

async function table(count = 2, handSize = 5, openingEffects = true) {
	const t = convexTest(schema, modules);
	const player = (index: number) => createPlayer(t, `player${index}@example.com`);
	const players = await Promise.all(Array.from({ length: count }, (_, index) => player(index)));
	const host = players[0];
	const gameId = await host.mutation(api.games.create, { name: 'Opening table' });
	const token = await host.mutation(api.games.invite, { gameId });
	for (const guest of players.slice(1)) {
		await guest.mutation(api.games.requestSeat, { token });
		const [request] = await host.query(api.games.requests, { gameId });
		await host.mutation(api.games.decideSeat, { requestId: request.id, approve: true });
	}
	let game = await host.query(api.games.view, { gameId });
	await host.mutation(api.gameRules.update, {
		gameId,
		expectedVersion: game.version,
		rules: { ...game.rules, handSize, openingEffects }
	});
	game = await host.query(api.games.view, { gameId });
	for (const player of players)
		await player.mutation(api.gameRules.ready, { gameId, expectedVersion: game.version });
	return { t, players, host, gameId, game, player, token };
}

test('the Host opens one durable private deal and freezes the reviewed rules', async () => {
	const { t, host, players, gameId, game, player, token } = await table();
	// A draw near one leaves a Fisher-Yates deck in its canonical order and selects the last Seat.
	vi.spyOn(Math, 'random').mockReturnValue(0.999999);
	await host.mutation(api.rounds.start, { gameId, expectedGameVersion: game.version });
	const guest = players[1];
	const hostView = await host.query(api.rounds.view, { gameId });
	const guestView = await guest.query(api.rounds.view, { gameId });
	expect(await guest.query(api.games.invitation, { token })).toEqual({
		name: 'Opening table',
		status: 'approved',
		gameId
	});
	await guest.mutation(api.games.requestSeat, { token });
	expect(await guest.query(api.rounds.view, { gameId })).toEqual(guestView);
	expect(hostView).toMatchObject({
		starterSeatId: game.seats[1].id,
		topCard: { rank: 'A', suit: 'clubs' },
		drawCount: 26,
		openingEffects: true
	});
	expect(hostView.hand).toEqual([
		{ rank: '7', suit: 'clubs' },
		{ rank: '9', suit: 'clubs' },
		{ rank: 'J', suit: 'clubs' },
		{ rank: 'K', suit: 'clubs' },
		{ rank: '6', suit: 'diamonds' }
	]);
	expect(guestView.hand).toEqual([
		{ rank: '6', suit: 'clubs' },
		{ rank: '8', suit: 'clubs' },
		{ rank: '10', suit: 'clubs' },
		{ rank: 'Q', suit: 'clubs' }
	]);
	expect(hostView.seats.map((seat) => seat.cardCount)).toEqual([5, 4]);
	expect(hostView).not.toHaveProperty('drawPile');
	expect(hostView).not.toHaveProperty('hands');
	expect(await host.query(api.rounds.view, { gameId })).toEqual(hostView);
	const viewer = await host.query(api.players.viewer, {});
	const sessionId = await t.run((ctx) =>
		ctx.db.insert('authSessions', { userId: viewer.id, expirationTime: Date.now() + 100000 })
	);
	const returning = t.withIdentity({ subject: `${viewer.id}|${sessionId}` });
	expect(await returning.query(api.rounds.view, { gameId })).toEqual(hostView);
	expect((await host.query(api.games.view, { gameId })).status).toBe('active');
	await expect(
		host.mutation(api.gameRules.update, {
			gameId,
			expectedVersion: game.version + 1,
			rules: game.rules
		})
	).rejects.toThrow('Rules locked');
	await expect(
		host.mutation(api.rounds.start, { gameId, expectedGameVersion: game.version })
	).rejects.toThrow('Round already started');
	await expect(t.query(api.rounds.view, { gameId })).rejects.toThrow('Sign in');
	const outsider = await player(9);
	await expect(outsider.query(api.games.invitation, { token })).rejects.toThrow('Lobby closed');
	await expect(outsider.mutation(api.games.requestSeat, { token })).rejects.toThrow('Lobby closed');
	await expect(outsider.query(api.rounds.view, { gameId })).rejects.toThrow('Game unavailable');
	await expect(
		outsider.mutation(api.rounds.start, { gameId, expectedGameVersion: game.version })
	).rejects.toThrow('Host only');
});

test.each([
	{ count: 2, handSize: 2, drawCount: 32 },
	{ count: 3, handSize: 5, drawCount: 21 },
	{ count: 4, handSize: 9, drawCount: 0 }
])(
	'a $count-player table deals $handSize cards and preserves all 36 cards',
	async ({ count, handSize, drawCount }) => {
		const { host, players, gameId, game } = await table(count, handSize, false);
		vi.spyOn(Math, 'random').mockReturnValue(0.999999);
		await host.mutation(api.rounds.start, { gameId, expectedGameVersion: game.version });
		const views = await Promise.all(
			players.map((player) => player.query(api.rounds.view, { gameId }))
		);
		expect(views[0].drawCount).toBe(drawCount);
		expect(views.map((view) => view.hand.length)).toEqual(
			count === 2 ? [2, 1] : count === 3 ? [5, 5, 4] : [9, 9, 9, 8]
		);
		const visibleCards = [...views.flatMap((view) => view.hand), views[0].topCard];
		expect(new Set(visibleCards.map((card) => `${card.rank}:${card.suit}`)).size).toBe(
			count === 2 ? 4 : count === 3 ? 15 : 36
		);
		expect(views.every((view) => view.opening.kind === 'none')).toBe(true);
	}
);

test.each([
	{ rank: 'J', index: 5, kind: 'choose-suit' },
	{ rank: '6', index: 0, kind: 'cover-six' },
	{ rank: '7', index: 1, kind: 'effect' }
])(
	'an opening $rank records its pending state without exposing another hand',
	async ({ rank, index, kind }) => {
		const { host, gameId, game } = await table();
		let calls = 0;
		vi.spyOn(Math, 'random').mockImplementation(() => {
			const shuffleIndex = 35 - calls++;
			return shuffleIndex === 8 ? index / 9 : 0.999999;
		});
		await host.mutation(api.rounds.start, { gameId, expectedGameVersion: game.version });
		const view = await host.query(api.rounds.view, { gameId });
		expect(view.topCard).toEqual({ rank, suit: 'clubs' });
		expect(view.opening.kind).toBe(kind);
		expect(view.currentSeatId).toBe(kind === 'effect' ? game.seats[0].id : game.seats[1].id);
		expect(view.activeSuit).toBe(kind === 'choose-suit' ? null : 'clubs');
	}
);

test('a stale start, an unready table, and a guest cannot start a Round', async () => {
	const { host, players, gameId, game } = await table();
	await expect(
		host.mutation(api.rounds.start, { gameId, expectedGameVersion: game.version - 1 })
	).rejects.toThrow('Game changed');
	await expect(
		players[1].mutation(api.rounds.start, { gameId, expectedGameVersion: game.version })
	).rejects.toThrow('Host only');
	await host.mutation(api.gameRules.update, {
		gameId,
		expectedVersion: game.version,
		rules: game.rules
	});
	await expect(
		host.mutation(api.rounds.start, { gameId, expectedGameVersion: game.version + 1 })
	).rejects.toThrow('Every player');
	expect((await host.query(api.games.view, { gameId })).status).toBe('lobby');
	await expect(host.query(api.rounds.view, { gameId })).rejects.toThrow('Round unavailable');
	const solo = await table(1);
	await expect(
		solo.host.mutation(api.rounds.start, {
			gameId: solo.gameId,
			expectedGameVersion: solo.game.version
		})
	).rejects.toThrow('Every player');
});
