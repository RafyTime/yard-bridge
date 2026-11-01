/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vite-plus/test';
import { api } from './_generated/api';
import schema from './schema';
import { createPlayer } from '../../tests/fixtures/convex-player';

const modules = import.meta.glob(['./**/*.{ts,js}', '!./**/*.test.ts', '!./**/*.d.ts']);

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
	expect(hostView.drawCount).toBe(26);
	expect(hostView.openingEffects).toBe(true);
	expect(game.seats.map((seat) => seat.id)).toContain(hostView.starterSeatId);
	expect(hostView.hand.length + guestView.hand.length).toBe(9);
	expect(hostView.hand).toHaveLength(
		hostView.seats.find((seat) => seat.seatId === game.viewerSeatId)!.cardCount
	);
	expect(guestView.hand).toHaveLength(
		guestView.seats.find((seat) => seat.seatId !== game.viewerSeatId)!.cardCount
	);
	const visibleCards = [...hostView.hand, ...guestView.hand, hostView.topCard];
	expect(new Set(visibleCards.map((card) => `${card.rank}:${card.suit}`)).size).toBe(10);
	expect(hostView.topCard).toEqual(guestView.topCard);
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
