/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from './_generated/api';
import type { Card } from './cards';
import schema from './schema';
import { createPlayer } from '../../tests/fixtures/convex-player';
import {
	card,
	cards,
	choice,
	dealDeck,
	orderedDeck,
	scriptedMath,
	shuffleValues
} from '../../tests/fixtures/controlled-random';

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

afterEach(() => {
	vi.unstubAllGlobals();
});

// Opens a Round from a controlled deal with Seat 1 as the starter, so Seat 2 moves first.
async function opened(hands: Card[][], top: Card, draw: Card[] = [], openingEffects = true) {
	const setup = await table(hands.length, hands[1].length, openingEffects);
	const { host, players, gameId, game } = setup;
	const deck = dealDeck(hands, top, draw);
	vi.stubGlobal(
		'Math',
		scriptedMath([...shuffleValues(orderedDeck, deck), choice(0, hands.length)])
	);
	await host.mutation(api.rounds.start, { gameId, expectedGameVersion: game.version });
	vi.unstubAllGlobals();
	const views = () =>
		Promise.all(players.map((player) => player.query(api.rounds.view, { gameId })));
	return { ...setup, views, seatIds: game.seats.map((seat) => seat.id) };
}

test('the active player plays a matching card and every Seat sees the next turn', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 10d Kc Kd'), cards('10h 9s Qc Ac 7d')],
		card('9h')
	);
	const [before] = await views();
	await players[1].mutation(api.rounds.play, {
		roundId: before.id,
		expectedVersion: before.version,
		cards: [card('10h')]
	});
	const [host, guest] = await views();
	for (const view of [host, guest]) {
		expect(view.topCard).toEqual(card('10h'));
		expect(view.activeSuit).toBe('hearts');
		expect(view.currentSeatId).toBe(seatIds[0]);
		expect(view.version).toBe(before.version + 1);
		expect(view.drawCount).toBe(before.drawCount);
		expect(view.seats).toEqual([
			{ seatId: seatIds[0], cardCount: 4 },
			{ seatId: seatIds[1], cardCount: 4 }
		]);
	}
	expect(guest.hand).toEqual(cards('9s Qc Ac 7d'));
	await players[0].mutation(api.rounds.play, {
		roundId: host.id,
		expectedVersion: host.version,
		cards: [card('10c')]
	});
	const [, next] = await views();
	expect(next.topCard).toEqual(card('10c'));
	expect(next.activeSuit).toBe('clubs');
	expect(next.currentSeatId).toBe(seatIds[1]);
});

test('other Seats, outsiders, and illegal cards cannot change the Round', async () => {
	const { players, player, views } = await opened(
		[cards('10c 10d Kc Kd'), cards('10h 9s Qc Ac 7d')],
		card('9h')
	);
	const before = await views();
	const { id: roundId, version: expectedVersion } = before[0];
	const [host, guest] = players;
	await expect(
		host.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('10c')] })
	).rejects.toThrow('Not your turn');
	await expect(host.mutation(api.rounds.draw, { roundId, expectedVersion })).rejects.toThrow(
		'Not your turn'
	);
	await expect(
		guest.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('Qc')] })
	).rejects.toThrow('Card does not match');
	await expect(
		guest.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('9d')] })
	).rejects.toThrow('Card not in your hand');
	await expect(guest.mutation(api.rounds.draw, { roundId, expectedVersion })).rejects.toThrow(
		'already have a playable card'
	);
	const outsider = await player(9);
	await expect(
		outsider.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('10h')] })
	).rejects.toThrow('Game unavailable');
	expect(await views()).toEqual(before);
	expect(before[1]).toMatchObject({ playable: cards('10h 9s'), canDraw: false, drawnCard: null });
	expect(before[0]).toMatchObject({ playable: [], canDraw: false });
});

test('a stale, repeated, or simultaneous move commits only once', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 10d Kc Kd'), cards('10h 9s Qc Ac 7d')],
		card('9h')
	);
	const [, guest] = players;
	const [{ id: roundId, version: expectedVersion }] = await views();
	const results = await Promise.allSettled([
		guest.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('10h')] }),
		guest.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('9s')] })
	]);
	expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
	await expect(
		guest.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('10h')] })
	).rejects.toThrow('Round changed');
	// 10♣ is legal on either new top card, but the Host chose it from an outdated table.
	await expect(
		players[0].mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('10c')] })
	).rejects.toThrow('Round changed');
	const [host, after] = await views();
	expect(after.hand).toHaveLength(4);
	expect(after.version).toBe(expectedVersion + 1);
	expect(host.seats).toEqual([
		{ seatId: seatIds[0], cardCount: 4 },
		{ seatId: seatIds[1], cardCount: 4 }
	]);
	expect(host.currentSeatId).toBe(seatIds[0]);
});

test('a player without a match draws until one appears and must play that card alone', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 10d Ks Kd'), cards('Qc Ac 7d 8s Qd')],
		card('9h'),
		cards('7c 8c 10h Kh')
	);
	const [host, guest] = players;
	const [before, guestBefore] = await views();
	expect(guestBefore).toMatchObject({ playable: [], canDraw: true });
	const { id: roundId } = before;
	await guest.mutation(api.rounds.draw, { roundId, expectedVersion: before.version });
	const [hostView, guestView] = await views();
	expect(guestView.hand).toEqual(cards('Qc Ac 7d 8s Qd 7c 8c 10h'));
	expect(guestView).toMatchObject({
		drawnCard: card('10h'),
		playable: [card('10h')],
		canDraw: false,
		currentSeatId: seatIds[1],
		drawCount: before.drawCount - 3
	});
	expect(hostView).toMatchObject({
		drawnCard: null,
		playable: [],
		drawCount: before.drawCount - 3
	});
	expect(hostView.seats).toEqual([
		{ seatId: seatIds[0], cardCount: 4 },
		{ seatId: seatIds[1], cardCount: 8 }
	]);
	const expectedVersion = guestView.version;
	await expect(guest.mutation(api.rounds.draw, { roundId, expectedVersion })).rejects.toThrow(
		'Play the card you drew'
	);
	await expect(
		guest.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('7c')] })
	).rejects.toThrow('Play the card you drew');
	await guest.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('10h')] });
	await expect(
		host.mutation(api.rounds.play, { roundId, expectedVersion, cards: [card('10c')] })
	).rejects.toThrow('Round changed');
	const [after] = await views();
	expect(after).toMatchObject({
		topCard: card('10h'),
		currentSeatId: seatIds[0],
		playable: cards('10c 10d'),
		drawnCard: null
	});
	expect(after.seats[1].cardCount).toBe(7);
});

test('an empty draw pile passes the turn, then recycles the played pile below its top card', async () => {
	const { players, views, seatIds } = await opened(
		[
			cards('7c 7h 8h Qh Kh Ah 9c 9d'),
			cards('Kc Kd Ks Ac Ad As Qc Qd Qs'),
			cards('10h 6h 7d 10c 8c 8d 10d 6c 6d'),
			cards('10s Jc Jd Js 6s 9s 7s 8s Jh')
		],
		card('9h')
	);
	const [host, second, third, fourth] = players;
	let [view] = await views();
	const roundId = view.id;
	expect(view.drawCount).toBe(0);
	await second.mutation(api.rounds.draw, { roundId, expectedVersion: view.version });
	[view] = await views();
	expect(view).toMatchObject({ currentSeatId: seatIds[2], topCard: card('9h'), drawCount: 0 });
	expect(view.seats[1].cardCount).toBe(9);
	await third.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: [card('10h')]
	});
	await fourth.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version + 1,
		cards: [card('10s')]
	});
	[view] = await views();
	expect(view).toMatchObject({ currentSeatId: seatIds[0], canDraw: true });
	const recycled = cards('9h 10h');
	vi.stubGlobal('Math', scriptedMath(shuffleValues(recycled, recycled)));
	await host.mutation(api.rounds.draw, { roundId, expectedVersion: view.version });
	vi.unstubAllGlobals();
	const [hostView, ...others] = await views();
	expect(hostView).toMatchObject({
		topCard: card('10s'),
		drawCount: 0,
		drawnCard: card('10h'),
		currentSeatId: seatIds[0]
	});
	expect(hostView.hand.slice(-2)).toEqual(recycled);
	for (const other of others) expect(other.seats[0].cardCount).toBe(10);
});

test('a pending opening effect blocks ordinary moves until its rules resolve it', async () => {
	const { players, views } = await opened(
		[cards('10c 10d Ks Kd'), cards('10h 9s Qc Ac 7d')],
		card('7h')
	);
	const [, guestView] = await views();
	expect(guestView).toMatchObject({ playable: [], canDraw: false });
	const turn = { roundId: guestView.id, expectedVersion: guestView.version };
	await expect(
		players[1].mutation(api.rounds.play, { ...turn, cards: [card('10h')] })
	).rejects.toThrow('opening card must be resolved');
	await expect(players[1].mutation(api.rounds.draw, turn)).rejects.toThrow(
		'opening card must be resolved'
	);
	const disabled = await opened(
		[cards('10c 10d Ks Kd'), cards('10h 9s Qc Ac 7d')],
		card('7h'),
		[],
		false
	);
	const [, open] = await disabled.views();
	expect(open.playable).toEqual(cards('10h 7d'));
});

test('a 6 or Jack plays regardless of the table, and a Jack sets the suit every Seat sees', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 10d Ks Kd'), cards('Jc 6s Qc Ac 7d')],
		card('9h')
	);
	const [, guest] = players;
	const [before, guestBefore] = await views();
	expect(guestBefore.playable).toEqual(cards('Jc 6s'));
	const turn = { roundId: before.id, expectedVersion: before.version };
	await expect(guest.mutation(api.rounds.play, { ...turn, cards: cards('Jc') })).rejects.toThrow(
		'Choose a suit for the Jack'
	);
	await expect(
		guest.mutation(api.rounds.play, { ...turn, cards: cards('6s'), suit: 'hearts' })
	).rejects.toThrow('Only a Jack chooses a suit');
	await guest.mutation(api.rounds.play, { ...turn, cards: cards('Jc'), suit: 'diamonds' });
	const [host, after] = await views();
	for (const view of [host, after])
		expect(view).toMatchObject({
			topCard: card('Jc'),
			activeSuit: 'diamonds',
			currentSeatId: seatIds[0],
			mustCover: false
		});
	expect(host.playable).toEqual(cards('10d Kd'));
});
