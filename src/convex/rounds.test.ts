/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from './_generated/api';
import type { Card } from './cards';
import type { RulesConfiguration } from './rules';
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

async function table(count = 2, rules: Partial<RulesConfiguration> = {}) {
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
		rules: { ...game.rules, ...rules }
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
async function opened(
	hands: Card[][],
	top: Card,
	draw: Card[] = [],
	rules: Partial<RulesConfiguration> = {}
) {
	const setup = await table(hands.length, { handSize: hands[1].length, ...rules });
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

test('a pending opening effect blocks ordinary moves until its target accepts it', async () => {
	const { players, views } = await opened(
		[cards('10c 10d Ks Kd'), cards('10h 9s Qc Ac 7d')],
		card('7h')
	);
	const [, guestView] = await views();
	expect(guestView).toMatchObject({ playable: [], canDraw: false });
	const turn = { roundId: guestView.id, expectedVersion: guestView.version };
	await expect(
		players[1].mutation(api.rounds.play, { ...turn, cards: [card('10h')] })
	).rejects.toThrow('Accept the pending effect first');
	await expect(players[1].mutation(api.rounds.draw, turn)).rejects.toThrow(
		'Accept the pending effect first'
	);
	const disabled = await opened(
		[cards('10c 10d Ks Kd'), cards('10h 9s Qc Ac 7d')],
		card('7h'),
		[],
		{ openingEffects: false }
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

test('a player places an ordered same-rank group and its last card becomes the top', async () => {
	const { players, views, seatIds } = await opened(
		[cards('Kc Kd Ks Ad'), cards('10h 10s 10c Qc 7d')],
		card('9h')
	);
	const [, guest] = players;
	const [before] = await views();
	const turn = { roundId: before.id, expectedVersion: before.version };
	for (const [group, error] of [
		['10h Qc', 'same rank'],
		['10s 10h', 'does not match'],
		['10h 10h', 'not in your hand']
	])
		await expect(guest.mutation(api.rounds.play, { ...turn, cards: cards(group) })).rejects.toThrow(
			error
		);
	expect(await views()).toEqual([before, expect.anything()]);
	await guest.mutation(api.rounds.play, { ...turn, cards: cards('10h 10s 10c') });
	const [host, after] = await views();
	for (const view of [host, after])
		expect(view).toMatchObject({
			topCard: card('10c'),
			activeSuit: 'clubs',
			currentSeatId: seatIds[0],
			seats: [
				{ seatId: seatIds[0], cardCount: 4 },
				{ seatId: seatIds[1], cardCount: 2 }
			]
		});
	expect(after.hand).toEqual(cards('Qc 7d'));
	expect(host.playable).toEqual(cards('Kc'));
});

test('a played 6 keeps the turn until it is covered by its suit or another 6', async () => {
	const { players, views, seatIds } = await opened(
		[cards('Kc Kd Ks Ad'), cards('6s 6d 9d Jc 7s')],
		card('9h')
	);
	const [, guest] = players;
	let [host, view] = await views();
	const roundId = host.id;
	await guest.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('6s')
	});
	[host, view] = await views();
	for (const seat of [host, view])
		expect(seat).toMatchObject({ topCard: card('6s'), mustCover: true, currentSeatId: seatIds[1] });
	expect(host.playable).toEqual([]);
	expect(view).toMatchObject({ playable: cards('6d 7s'), canDraw: false });
	await expect(
		guest.mutation(api.rounds.play, {
			roundId,
			expectedVersion: view.version,
			cards: cards('Jc'),
			suit: 'spades'
		})
	).rejects.toThrow('does not match');
	await guest.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('6d')
	});
	[host, view] = await views();
	for (const seat of [host, view])
		expect(seat).toMatchObject({
			activeSuit: 'diamonds',
			mustCover: true,
			currentSeatId: seatIds[1]
		});
	expect(view.playable).toEqual(cards('9d'));
	await guest.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('9d')
	});
	[host, view] = await views();
	for (const seat of [host, view])
		expect(seat).toMatchObject({
			topCard: card('9d'),
			mustCover: false,
			currentSeatId: seatIds[0]
		});
	expect(host.playable).toEqual(cards('Kd Ad'));
});

test('an opening 6 is covered through Draw, and a cover that cannot be drawn is waived', async () => {
	const { players, views, seatIds } = await opened(
		[cards('Kc Ks Kd 9c'), cards('Qc Ac 7d 8s Qd')],
		card('6h'),
		cards('7c 8h')
	);
	const [host] = players;
	let [view, guest] = await views();
	for (const seat of [view, guest])
		expect(seat).toMatchObject({
			opening: { kind: 'cover-six', seatId: seatIds[0] },
			mustCover: true,
			activeSuit: 'hearts',
			currentSeatId: seatIds[0]
		});
	expect(view).toMatchObject({ playable: [], canDraw: true });
	expect(guest).toMatchObject({ playable: [], canDraw: false });
	await host.mutation(api.rounds.draw, { roundId: view.id, expectedVersion: view.version });
	[view] = await views();
	expect(view).toMatchObject({ drawnCard: card('8h'), mustCover: true });
	await host.mutation(api.rounds.play, {
		roundId: view.id,
		expectedVersion: view.version,
		cards: cards('8h')
	});
	[view, guest] = await views();
	for (const seat of [view, guest])
		expect(seat).toMatchObject({
			opening: { kind: 'none' },
			mustCover: false,
			topCard: card('8h'),
			currentSeatId: seatIds[1]
		});

	const exhausted = await opened(
		[
			cards('Kc Ks Kd 9c 9s 9d 10c 10s'),
			cards('7h 8h 9h 10h Jh Qh Kh Ah 6c'),
			cards('6d 6s 7c 8c Jc Qc Ac 7s 8s'),
			cards('Js Qs As 7d 8d 10d Jd Qd Ad')
		],
		card('6h')
	);
	const [starter] = await exhausted.views();
	expect(starter).toMatchObject({ drawCount: 0, canDraw: true });
	await exhausted.players[0].mutation(api.rounds.draw, {
		roundId: starter.id,
		expectedVersion: starter.version
	});
	const [after, next] = await exhausted.views();
	for (const seat of [after, next])
		expect(seat).toMatchObject({
			opening: { kind: 'none' },
			mustCover: false,
			topCard: card('6h'),
			currentSeatId: exhausted.seatIds[1]
		});
	expect(next.playable).toEqual(next.hand);
});

test('a drawn card is played alone, and a drawn 6 still must be covered', async () => {
	const { players, views, seatIds } = await opened(
		[cards('Kc Ks Kd Ad'), cards('Qc Ac 7d 8s 10c')],
		card('9h'),
		cards('7c 10h 7s 6c')
	);
	const [host, guest] = players;
	let [, view] = await views();
	const roundId = view.id;
	await guest.mutation(api.rounds.draw, { roundId, expectedVersion: view.version });
	[, view] = await views();
	expect(view.drawnCard).toEqual(card('10h'));
	await expect(
		guest.mutation(api.rounds.play, {
			roundId,
			expectedVersion: view.version,
			cards: cards('10h 10c')
		})
	).rejects.toThrow('Play the card you drew');
	await guest.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('10h')
	});
	let [hostView] = await views();
	expect(hostView).toMatchObject({ currentSeatId: seatIds[0], canDraw: true });
	await host.mutation(api.rounds.draw, { roundId, expectedVersion: hostView.version });
	[hostView] = await views();
	expect(hostView.drawnCard).toEqual(card('6c'));
	await host.mutation(api.rounds.play, {
		roundId,
		expectedVersion: hostView.version,
		cards: cards('6c')
	});
	[hostView, view] = await views();
	for (const seat of [hostView, view])
		expect(seat).toMatchObject({ mustCover: true, activeSuit: 'clubs', currentSeatId: seatIds[0] });
	expect(hostView).toMatchObject({ drawnCard: null, playable: cards('Kc') });
});

test('the starter chooses the active suit for an opening Jack before play continues', async () => {
	const { players, views, seatIds } = await opened(
		[cards('Kc Ks Kd Ad'), cards('Qc Ac 7d 8s 10s')],
		card('Jh')
	);
	const [host, guest] = players;
	let [hostView, view] = await views();
	for (const seat of [hostView, view])
		expect(seat).toMatchObject({
			opening: { kind: 'choose-suit', seatId: seatIds[0] },
			activeSuit: null,
			currentSeatId: seatIds[0],
			playable: [],
			canDraw: false
		});
	const turn = { roundId: view.id, expectedVersion: view.version };
	await expect(host.mutation(api.rounds.play, { ...turn, cards: cards('Kc') })).rejects.toThrow(
		'opening card must be resolved'
	);
	await expect(host.mutation(api.rounds.draw, turn)).rejects.toThrow(
		'opening card must be resolved'
	);
	await expect(guest.mutation(api.rounds.chooseSuit, { ...turn, suit: 'spades' })).rejects.toThrow(
		'Not your turn'
	);
	await host.mutation(api.rounds.chooseSuit, { ...turn, suit: 'spades' });
	await expect(host.mutation(api.rounds.chooseSuit, { ...turn, suit: 'clubs' })).rejects.toThrow(
		'Round changed'
	);
	[hostView, view] = await views();
	for (const seat of [hostView, view])
		expect(seat).toMatchObject({
			opening: { kind: 'none' },
			activeSuit: 'spades',
			topCard: card('Jh'),
			currentSeatId: seatIds[1],
			version: turn.expectedVersion + 1
		});
	expect(view.playable).toEqual(cards('8s 10s'));
	await expect(
		guest.mutation(api.rounds.chooseSuit, {
			roundId: view.id,
			expectedVersion: view.version,
			suit: 'hearts'
		})
	).rejects.toThrow('No suit to choose');
});

test('a played 7 leaves one card pending on the next Seat, who accepts it and then plays', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 10d Ks Kd'), cards('7h 9s Qc Ac 8d')],
		card('9h'),
		cards('7c Jd')
	);
	const [host, guest] = players;
	let [, view] = await views();
	const roundId = view.id;
	await guest.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('7h')
	});
	let hostView;
	[hostView, view] = await views();
	for (const seat of [hostView, view])
		expect(seat).toMatchObject({
			effect: { targetSeatId: seatIds[0], drawCount: 1, skip: false },
			currentSeatId: seatIds[0]
		});
	expect(hostView).toMatchObject({ playable: [], canDraw: false });
	const turn = { roundId, expectedVersion: hostView.version };
	await expect(host.mutation(api.rounds.play, { ...turn, cards: cards('10c') })).rejects.toThrow(
		'Accept the pending effect first'
	);
	await expect(host.mutation(api.rounds.draw, turn)).rejects.toThrow(
		'Accept the pending effect first'
	);
	await expect(guest.mutation(api.rounds.accept, turn)).rejects.toThrow('Not your turn');
	await host.mutation(api.rounds.accept, turn);
	[hostView, view] = await views();
	for (const seat of [hostView, view])
		expect(seat).toMatchObject({
			effect: null,
			currentSeatId: seatIds[0],
			drawCount: 25,
			seats: [
				{ seatId: seatIds[0], cardCount: 5 },
				{ seatId: seatIds[1], cardCount: 4 }
			]
		});
	expect(hostView).toMatchObject({ hand: cards('10c 10d Ks Kd 7c'), playable: cards('7c') });
	// The accepted effect is spent; a new 7 starts a fresh one-card effect.
	await host.mutation(api.rounds.play, {
		roundId,
		expectedVersion: hostView.version,
		cards: cards('7c')
	});
	[, view] = await views();
	expect(view).toMatchObject({
		effect: { targetSeatId: seatIds[1], drawCount: 1, skip: false },
		currentSeatId: seatIds[1]
	});
});

test('stacked 7s and 8s add their draws for the next Seat around a four-player table', async () => {
	const { players, views, seatIds } = await opened(
		[
			cards('10c Ks Qc As'),
			cards('7h 7c Kc Kd Ac'),
			cards('9c Qh Qs 10s 10d'),
			cards('8c 8d 9d 9s Ah')
		],
		card('9h'),
		cards('Jd Js Jc Jh 6s 6h')
	);
	const [host, second, third, fourth] = players;
	let [view] = await views();
	const roundId = view.id;
	const expectAll = async (state: object) => {
		const all = await views();
		for (const seat of all) expect(seat).toMatchObject(state);
		return all;
	};
	await second.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('7h 7c')
	});
	[view] = await expectAll({
		effect: { targetSeatId: seatIds[2], drawCount: 2, skip: false },
		currentSeatId: seatIds[2]
	});
	await third.mutation(api.rounds.accept, { roundId, expectedVersion: view.version });
	const accepted = await expectAll({ effect: null, currentSeatId: seatIds[2] });
	view = accepted[0];
	expect(accepted[2].hand).toEqual(cards('9c Qh Qs 10s 10d Jd Js'));
	await third.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('9c')
	});
	[view] = await expectAll({ effect: null, currentSeatId: seatIds[3] });
	await fourth.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('8c 8d')
	});
	[view] = await expectAll({
		effect: { targetSeatId: seatIds[0], drawCount: 4, skip: true },
		currentSeatId: seatIds[0]
	});
	await host.mutation(api.rounds.accept, { roundId, expectedVersion: view.version });
	[view] = await expectAll({
		effect: null,
		currentSeatId: seatIds[1],
		seats: [
			{ seatId: seatIds[0], cardCount: 8 },
			{ seatId: seatIds[1], cardCount: 3 },
			{ seatId: seatIds[2], cardCount: 6 },
			{ seatId: seatIds[3], cardCount: 3 }
		]
	});
	expect(view.hand).toEqual(cards('10c Ks Qc As Jc Jh 6s 6h'));
});

test.each([
	{ count: 2, target: 0, next: 1 },
	{ count: 3, target: 2, next: 0 }
])(
	'an 8 makes the next Seat of $count draw two and skips their turn',
	async ({ count, target, next }) => {
		const hands = [cards('10c Ks Qc As'), cards('8h 9s Kc Kd Ac'), cards('9c Qh Qs 10s 10d')];
		const { players, views, seatIds } = await opened(
			hands.slice(0, count),
			card('9h'),
			cards('Jd Js')
		);
		let [view] = await views();
		await players[1].mutation(api.rounds.play, {
			roundId: view.id,
			expectedVersion: view.version,
			cards: cards('8h')
		});
		[view] = await views();
		expect(view).toMatchObject({
			effect: { targetSeatId: seatIds[target], drawCount: 2, skip: true },
			currentSeatId: seatIds[target]
		});
		await players[target].mutation(api.rounds.accept, {
			roundId: view.id,
			expectedVersion: view.version
		});
		const after = await views();
		for (const seat of after)
			expect(seat).toMatchObject({ effect: null, currentSeatId: seatIds[next] });
		expect(after[target].hand.slice(-2)).toEqual(cards('Jd Js'));
	}
);

test.each([
	{ group: 'Qh Qs', top: 'Qd', rules: {}, drawCount: 5 },
	{ group: 'Qs Qh', top: 'Qd', rules: {}, drawCount: 0 },
	{ group: 'Kh Ks', top: 'Kd', rules: { kingOfSpades: true }, drawCount: 7 },
	{ group: 'Kh Ks', top: 'Kd', rules: { kingOfSpades: false }, drawCount: 0 }
])(
	'playing $group with $rules fires only the top card: $drawCount to draw and a skip',
	async ({ group, top, rules, drawCount }) => {
		const { players, views, seatIds } = await opened(
			[cards('10c 10d 9c 9d'), cards(`${group} 9s 7c Ac`)],
			card(top),
			[],
			rules
		);
		const [host, guest] = players;
		let [view] = await views();
		await guest.mutation(api.rounds.play, {
			roundId: view.id,
			expectedVersion: view.version,
			cards: cards(group)
		});
		[view] = await views();
		expect(view).toMatchObject({
			effect: drawCount ? { targetSeatId: seatIds[0], drawCount, skip: true } : null,
			currentSeatId: seatIds[0]
		});
		if (!drawCount) return;
		await host.mutation(api.rounds.accept, { roundId: view.id, expectedVersion: view.version });
		[view] = await views();
		expect(view).toMatchObject({ effect: null, currentSeatId: seatIds[1] });
		expect(view.hand).toHaveLength(4 + drawCount);
	}
);

test.each([
	{ top: '7h', rules: {}, effect: { drawCount: 1, skip: false } },
	{ top: '8h', rules: {}, effect: { drawCount: 2, skip: true } },
	{ top: '8h', rules: { openingEffects: false }, effect: null },
	{ top: 'Qs', rules: {}, effect: { drawCount: 5, skip: true } },
	{ top: 'Qs', rules: { openingEffects: false }, effect: null },
	{ top: 'Ks', rules: { kingOfSpades: true }, effect: { drawCount: 7, skip: true } },
	{ top: 'Ks', rules: { kingOfSpades: false }, effect: null },
	{ top: 'Ks', rules: { kingOfSpades: true, openingEffects: false }, effect: null }
])(
	'an opening $top under $rules leaves $effect on the next Seat',
	async ({ top, rules, effect }) => {
		const { players, views, seatIds } = await opened(
			[cards('10c 10d 9c 9d'), cards('10h 9s Qc Ac 7d')],
			card(top),
			[],
			rules
		);
		let [view, guest] = await views();
		expect(view).toMatchObject({
			effect: effect && { targetSeatId: seatIds[1], ...effect },
			currentSeatId: seatIds[1]
		});
		if (!effect) {
			expect(guest.canDraw || guest.playable.length > 0).toBe(true);
			return;
		}
		await players[1].mutation(api.rounds.accept, {
			roundId: view.id,
			expectedVersion: view.version
		});
		[view, guest] = await views();
		expect(view).toMatchObject({
			effect: null,
			currentSeatId: seatIds[effect.skip ? 0 : 1]
		});
		expect(guest.hand).toHaveLength(5 + effect.drawCount);
	}
);

test('an opening Ace skips the next Seat once they accept it', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 9h 9c 9d'), cards('10h 9s Qc Ac 7d')],
		card('Ah')
	);
	let [host, guest] = await views();
	expect(guest).toMatchObject({
		effect: { targetSeatId: seatIds[1], drawCount: 0, skip: true },
		playable: [],
		canDraw: false
	});
	const turn = { roundId: guest.id, expectedVersion: guest.version };
	await expect(
		players[1].mutation(api.rounds.play, { ...turn, cards: cards('Ac') })
	).rejects.toThrow('Accept the pending effect first');
	await players[1].mutation(api.rounds.accept, turn);
	[host, guest] = await views();
	for (const seat of [host, guest])
		expect(seat).toMatchObject({ effect: null, currentSeatId: seatIds[0], drawCount: 26 });
	expect(guest.hand).toEqual(cards('10h 9s Qc Ac 7d'));
	expect(host.playable).toEqual(cards('9h'));
});

test('a stale, repeated, or simultaneous accept draws the pending effect only once', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 10d Ks Kd'), cards('7h 9s Qc Ac 8d')],
		card('9h'),
		cards('Jc Jd')
	);
	const [host, guest] = players;
	let [view] = await views();
	await guest.mutation(api.rounds.play, {
		roundId: view.id,
		expectedVersion: view.version,
		cards: cards('7h')
	});
	[view] = await views();
	const turn = { roundId: view.id, expectedVersion: view.version };
	const results = await Promise.allSettled([
		host.mutation(api.rounds.accept, turn),
		host.mutation(api.rounds.accept, turn)
	]);
	expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
	await expect(host.mutation(api.rounds.accept, turn)).rejects.toThrow('Round changed');
	[view] = await views();
	await expect(
		host.mutation(api.rounds.accept, { ...turn, expectedVersion: view.version })
	).rejects.toThrow('No effect to accept');
	expect(view).toMatchObject({
		hand: cards('10c 10d Ks Kd Jc'),
		currentSeatId: seatIds[0],
		version: turn.expectedVersion + 1
	});
});

test('a pending effect larger than the draw pile recycles, then draws what remains', async () => {
	const { players, views, seatIds } = await opened(
		[
			cards('Kc Ks Kd 9c 9s 9d 10c 10s'),
			cards('Qh 8h 10h Jh Ah 6c 7c 8c Jc'),
			cards('Qs 7s 8s Js As 6d 7d 8d Jd'),
			cards('Qc Qd Ac Ad 10d 6s 6h 7h Kh')
		],
		card('9h')
	);
	const [, second, third, fourth] = players;
	let [view] = await views();
	const roundId = view.id;
	await second.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version,
		cards: cards('Qh')
	});
	await third.mutation(api.rounds.play, {
		roundId,
		expectedVersion: view.version + 1,
		cards: cards('Qs')
	});
	[view] = await views();
	expect(view).toMatchObject({
		drawCount: 0,
		effect: { targetSeatId: seatIds[3], drawCount: 5, skip: true }
	});
	const recycled = cards('9h Qh');
	vi.stubGlobal('Math', scriptedMath(shuffleValues(recycled, recycled)));
	await fourth.mutation(api.rounds.accept, { roundId, expectedVersion: view.version });
	vi.unstubAllGlobals();
	const after = await views();
	for (const seat of after)
		expect(seat).toMatchObject({
			effect: null,
			drawCount: 0,
			topCard: card('Qs'),
			currentSeatId: seatIds[0]
		});
	expect(after[3].hand.slice(-2)).toEqual(recycled);
	expect(after[3].hand).toHaveLength(11);
});
