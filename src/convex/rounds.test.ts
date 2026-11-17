/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
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
	const [inert, open] = await disabled.views();
	for (const seat of [inert, open])
		expect(seat).toMatchObject({ effect: null, currentSeatId: disabled.seatIds[1] });
	expect(open.playable).toEqual(cards('10h 7d'));
});

test.each(['6h', 'Jh'])(
	'with opening effects off, an opening %s sets no obligation and the next Seat plays on',
	async (top) => {
		const { players, views, seatIds } = await opened(
			[cards('10c 10d Ks Kd'), cards('10h 9s Qc Ac 7d')],
			card(top),
			[],
			{ openingEffects: false }
		);
		let [host, guest] = await views();
		for (const seat of [host, guest])
			expect(seat).toMatchObject({
				openingEffects: false,
				opening: { kind: 'none' },
				mustCover: false,
				effect: null,
				activeSuit: 'hearts',
				currentSeatId: seatIds[1]
			});
		expect(host).toMatchObject({ playable: [], canDraw: false });
		expect(guest).toMatchObject({ playable: cards('10h'), canDraw: false });
		await players[1].mutation(api.rounds.play, {
			roundId: guest.id,
			expectedVersion: guest.version,
			cards: cards('10h')
		});
		[host, guest] = await views();
		for (const seat of [host, guest])
			expect(seat).toMatchObject({ topCard: card('10h'), currentSeatId: seatIds[0] });
		expect(host.playable).toEqual(cards('10c 10d'));
	}
);

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
			opening: { kind: 'none' },
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
	{ top: 'Ks', rules: { kingOfSpades: true, openingEffects: false }, effect: null },
	{ top: 'Ah', rules: { aceBehavior: 'cancel' as const }, effect: null }
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
	const [, target] = await views();
	expect(target).toMatchObject({
		effect: { targetSeatId: seatIds[1], drawCount: 0, skip: true },
		playable: [],
		canDraw: false
	});
	const turn = { roundId: target.id, expectedVersion: target.version };
	await expect(
		players[1].mutation(api.rounds.play, { ...turn, cards: cards('Ac') })
	).rejects.toThrow('Accept the pending effect first');
	await players[1].mutation(api.rounds.accept, turn);
	const [host, guest] = await views();
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

test('starting a Round and playing a group or a Jack record public events every Seat sees', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 10d Kc Kd'), cards('10h 10s Jc 9s 7d')],
		card('9h')
	);
	let [view] = await views();
	expect(view.recentMoves).toEqual([
		{
			version: 0,
			seatId: seatIds[0],
			event: { kind: 'start', topCard: card('9h') }
		}
	]);
	await players[1].mutation(api.rounds.play, {
		roundId: view.id,
		expectedVersion: view.version,
		cards: cards('10h 10s')
	});
	const after = await views();
	for (const seat of after)
		expect(seat.recentMoves[0]).toEqual({
			version: 1,
			seatId: seatIds[1],
			event: { kind: 'play', cards: cards('10h 10s'), activeSuit: 'spades' }
		});
	expect(after[0].recentMoves).toEqual(after[1].recentMoves);
	await players[0].mutation(api.rounds.play, {
		roundId: view.id,
		expectedVersion: 1,
		cards: cards('10c')
	});
	await players[1].mutation(api.rounds.play, {
		roundId: view.id,
		expectedVersion: 2,
		cards: cards('Jc'),
		suit: 'hearts'
	});
	[view] = await views();
	expect(view.recentMoves[0]).toEqual({
		version: 3,
		seatId: seatIds[1],
		event: { kind: 'play', cards: cards('Jc'), activeSuit: 'hearts' }
	});
});

test('a draw and an accepted effect record only counts, and rejected commands record nothing', async () => {
	const { players, views, seatIds } = await opened(
		[cards('10c 10d Ks Kd'), cards('Qc Ac 7d 8s Qd')],
		card('9h'),
		cards('7c 8c 7h Jd')
	);
	const [host, guest] = players;
	const [view] = await views();
	const roundId = view.id;
	await guest.mutation(api.rounds.draw, { roundId, expectedVersion: view.version });
	await expect(guest.mutation(api.rounds.draw, { roundId, expectedVersion: 0 })).rejects.toThrow(
		'Round changed'
	);
	await expect(guest.mutation(api.rounds.draw, { roundId, expectedVersion: 1 })).rejects.toThrow(
		'Play the card you drew'
	);
	await guest.mutation(api.rounds.play, { roundId, expectedVersion: 1, cards: cards('7h') });
	await expect(
		host.mutation(api.rounds.play, { roundId, expectedVersion: 2, cards: cards('10c') })
	).rejects.toThrow('Accept the pending effect first');
	const accepts = await Promise.allSettled([
		host.mutation(api.rounds.accept, { roundId, expectedVersion: 2 }),
		host.mutation(api.rounds.accept, { roundId, expectedVersion: 2 })
	]);
	expect(accepts.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
	const all = await views();
	// The drawn 7♣, 8♣, and J♦ stay private: the shared events carry only how many moved.
	for (const seat of all)
		expect(seat.recentMoves).toEqual([
			{
				version: 3,
				seatId: seatIds[0],
				event: { kind: 'accept', count: 1, recycles: 0, skipped: false }
			},
			{
				version: 2,
				seatId: seatIds[1],
				event: { kind: 'play', cards: cards('7h'), activeSuit: 'hearts' }
			},
			{
				version: 1,
				seatId: seatIds[1],
				event: { kind: 'draw', count: 3, recycles: 0, passed: false, coverWaived: false }
			},
			{
				version: 0,
				seatId: seatIds[0],
				event: { kind: 'start', topCard: card('9h') }
			}
		]);
	expect(all[0].hand).toContainEqual(card('Jd'));
});

test('an empty draw records a pass, then a recycle, and the feed keeps the latest five', async () => {
	const pass = await opened(
		[
			cards('7c 7h 8h Qh Kh Ah 9c 9d'),
			cards('Kc Kd Ks Ac Ad As Qc Qd Qs'),
			cards('10h 6h 7d 10c 8c 8d 10d 6c 6d'),
			cards('10s Jc Jd Js 6s 9s 7s 8s Jh')
		],
		card('9h')
	);
	const [host, second, third, fourth] = pass.players;
	const roundId = (await pass.views())[0].id;
	await second.mutation(api.rounds.draw, { roundId, expectedVersion: 0 });
	await third.mutation(api.rounds.play, { roundId, expectedVersion: 1, cards: [card('10h')] });
	await fourth.mutation(api.rounds.play, { roundId, expectedVersion: 2, cards: [card('10s')] });
	const recycled = cards('9h 10h');
	vi.stubGlobal('Math', scriptedMath(shuffleValues(recycled, recycled)));
	await host.mutation(api.rounds.draw, { roundId, expectedVersion: 3 });
	vi.unstubAllGlobals();
	const [view] = await pass.views();
	expect(view.recentMoves.map(({ seatId, event }) => ({ seatId, event }))).toEqual([
		{
			seatId: pass.seatIds[0],
			event: { kind: 'draw', count: 2, recycles: 1, passed: false, coverWaived: false }
		},
		{
			seatId: pass.seatIds[3],
			event: { kind: 'play', cards: cards('10s'), activeSuit: 'spades' }
		},
		{
			seatId: pass.seatIds[2],
			event: { kind: 'play', cards: cards('10h'), activeSuit: 'hearts' }
		},
		{
			seatId: pass.seatIds[1],
			event: { kind: 'draw', count: 0, recycles: 0, passed: true, coverWaived: false }
		},
		{
			seatId: pass.seatIds[0],
			event: { kind: 'start', topCard: card('9h') }
		}
	]);
	// A sixth move pushes the start event out of the five-move feed.
	await host.mutation(api.rounds.play, { roundId, expectedVersion: 4, cards: [card('10h')] });
	const [after] = await pass.views();
	expect(after.recentMoves.map(({ version }) => version)).toEqual([5, 4, 3, 2, 1]);
	expect(after.recentMoves[0].event).toEqual({
		kind: 'play',
		cards: cards('10h'),
		activeSuit: 'hearts'
	});
});

test('a 6 cover that cannot be drawn records a waived cover and a pass', async () => {
	const waived = await opened(
		[
			cards('Kc Ks Kd 9c 9s 9d 10c 10s'),
			cards('7h 8h 9h 10h Jh Qh Kh Ah 6c'),
			cards('6d 6s 7c 8c Jc Qc Ac 7s 8s'),
			cards('Js Qs As 7d 8d 10d Jd Qd Ad')
		],
		card('6h')
	);
	await waived.players[0].mutation(api.rounds.draw, {
		roundId: (await waived.views())[0].id,
		expectedVersion: 0
	});
	const [, next] = await waived.views();
	expect(next.recentMoves[0]).toEqual({
		version: 1,
		seatId: waived.seatIds[0],
		event: { kind: 'draw', count: 0, recycles: 0, passed: true, coverWaived: true }
	});
});

test('choosing an opening Jack suit and accepting an opening skip record their events', async () => {
	const jack = await opened([cards('Kc Ks Kd Ad'), cards('Qc Ac 7d 8s 10s')], card('Jh'));
	const [jackView] = await jack.views();
	await jack.players[0].mutation(api.rounds.chooseSuit, {
		roundId: jackView.id,
		expectedVersion: jackView.version,
		suit: 'spades'
	});
	const [, guest] = await jack.views();
	expect(guest.recentMoves[0]).toEqual({
		version: 1,
		seatId: jack.seatIds[0],
		event: { kind: 'chooseSuit', suit: 'spades' }
	});

	const ace = await opened([cards('10c 9h 9c 9d'), cards('10h 9s Qc Ac 7d')], card('Ah'));
	const [aceView] = await ace.views();
	await ace.players[1].mutation(api.rounds.accept, {
		roundId: aceView.id,
		expectedVersion: aceView.version
	});
	const [host] = await ace.views();
	expect(host.recentMoves[0]).toEqual({
		version: 1,
		seatId: ace.seatIds[1],
		event: { kind: 'accept', count: 0, recycles: 0, skipped: true }
	});
});

test.each([
	{ count: 2, skipped: 0, next: 1 },
	{ count: 4, skipped: 2, next: 3 }
])(
	'a played Ace skips exactly the next Seat of $count once they accept it',
	async ({ count, skipped, next }) => {
		const hands = [
			cards('10c Ks Qc 9s'),
			cards('Ah 9d Kc Kd Ac'),
			cards('9c Qh Qs 10s 10d'),
			cards('8c 8d 7s Js Jh')
		];
		const { players, views, seatIds } = await opened(hands.slice(0, count), card('9h'));
		let [view] = await views();
		await players[1].mutation(api.rounds.play, {
			roundId: view.id,
			expectedVersion: view.version,
			cards: cards('Ah')
		});
		[view] = await views();
		expect(view).toMatchObject({
			topCard: card('Ah'),
			effect: { targetSeatId: seatIds[skipped], drawCount: 0, skip: true },
			currentSeatId: seatIds[skipped]
		});
		await players[skipped].mutation(api.rounds.accept, {
			roundId: view.id,
			expectedVersion: view.version
		});
		const after = await views();
		for (const seat of after)
			expect(seat).toMatchObject({
				effect: null,
				currentSeatId: seatIds[next],
				drawCount: view.drawCount
			});
		expect(after[skipped].hand).toEqual(hands[skipped]);
	}
);

test.each([
	{ count: 2, target: 0, ace: 'As', next: 1 },
	{ count: 4, target: 2, ace: 'Ah', next: 3 }
])(
	'with Ace cancellation the targeted Seat of $count cancels a stacked 8 with the $ace',
	async ({ count, target, ace, next }) => {
		const hands = [
			cards('10c Ks Qc As'),
			cards('8c 8d Kc Kd 9d'),
			cards('9s Qh Ah 10s 10d'),
			cards('7c 7d 7s Js Jh')
		];
		const { players, views, seatIds } = await opened(hands.slice(0, count), card('9c'), [], {
			aceBehavior: 'cancel'
		});
		let all = await views();
		const roundId = all[0].id;
		await players[1].mutation(api.rounds.play, {
			roundId,
			expectedVersion: all[0].version,
			cards: cards('8c 8d')
		});
		all = await views();
		expect(all[target]).toMatchObject({
			effect: { targetSeatId: seatIds[target], drawCount: 4, skip: true },
			cancelWith: cards(ace)
		});
		for (const seat of all.filter((_, index) => index !== target))
			expect(seat.cancelWith).toEqual([]);
		const turn = { roundId, expectedVersion: all[0].version };
		await expect(
			players[next].mutation(api.rounds.cancel, { ...turn, card: card('Ac') })
		).rejects.toThrow('Not your turn');
		await expect(
			players[target].mutation(api.rounds.cancel, { ...turn, card: hands[target][0] })
		).rejects.toThrow('Cancel with an Ace from your hand');
		await players[target].mutation(api.rounds.cancel, { ...turn, card: card(ace) });
		const after = await views();
		for (const seat of after)
			expect(seat).toMatchObject({
				effect: null,
				topCard: card(ace),
				activeSuit: card(ace).suit,
				currentSeatId: seatIds[next],
				drawCount: all[0].drawCount,
				recentMoves: [
					{
						version: turn.expectedVersion + 1,
						seatId: seatIds[target],
						event: { kind: 'cancel', card: card(ace) }
					},
					expect.anything(),
					expect.anything()
				]
			});
		expect(after[target].hand).toEqual(hands[target].filter((held) => held.rank !== 'A'));
	}
);

test('the default Ace rule offers no cancellation', async () => {
	const { players, views } = await opened(
		[cards('10c Ks Qc As'), cards('8c Kc Kd 9d 10d')],
		card('9c')
	);
	let [view] = await views();
	await players[1].mutation(api.rounds.play, {
		roundId: view.id,
		expectedVersion: view.version,
		cards: cards('8c')
	});
	[view] = await views();
	expect(view.cancelWith).toEqual([]);
	await expect(
		players[0].mutation(api.rounds.cancel, {
			roundId: view.id,
			expectedVersion: view.version,
			card: card('As')
		})
	).rejects.toThrow('Ace cancellation is off');
});

test('emptying a hand ends the Round, scores every hand, and reveals the final hands', async () => {
	const { players, views, seatIds, gameId } = await opened(
		[cards('Qs Ah Jd'), cards('10h 10s 10d Kc')],
		card('9h')
	);
	const [host, guest] = players;
	const roundId = (await views())[0].id;
	await guest.mutation(api.rounds.play, {
		roundId,
		expectedVersion: 0,
		cards: cards('10h 10s 10d')
	});
	await host.mutation(api.rounds.play, {
		roundId,
		expectedVersion: 1,
		cards: cards('Jd'),
		suit: 'clubs'
	});
	for (const seat of await views()) expect(seat.result).toBeNull();
	await guest.mutation(api.rounds.play, { roundId, expectedVersion: 2, cards: cards('Kc') });
	const after = await views();
	const result = {
		hands: [
			{ seatId: seatIds[0], cards: cards('Qs Ah'), points: 65, score: 65 },
			{ seatId: seatIds[1], cards: [], points: 0, score: 0 }
		]
	};
	for (const seat of after) expect(seat).toMatchObject({ result, playable: [], canDraw: false });
	const game = await guest.query(api.games.view, { gameId });
	expect(game.seats.map(({ id, score }) => ({ id, score }))).toEqual([
		{ id: seatIds[0], score: 65 },
		{ id: seatIds[1], score: 0 }
	]);
	await expect(
		host.mutation(api.rounds.draw, { roundId, expectedVersion: after[0].version })
	).rejects.toThrow('The Round is over');
});

test('a final draw effect resolves on its target before the Round is scored, and only once', async () => {
	const { players, views, seatIds } = await opened(
		[cards('Ah'), cards('8h 8d')],
		card('9h'),
		cards('Qs 10c 9d 7s Kd')
	);
	const [host, guest] = players;
	const roundId = (await views())[0].id;
	await guest.mutation(api.rounds.play, { roundId, expectedVersion: 0, cards: cards('8h 8d') });
	for (const seat of await views())
		expect(seat).toMatchObject({
			result: null,
			effect: { targetSeatId: seatIds[0], drawCount: 4, skip: true }
		});
	const accepts = await Promise.allSettled([
		host.mutation(api.rounds.accept, { roundId, expectedVersion: 1 }),
		host.mutation(api.rounds.accept, { roundId, expectedVersion: 1 })
	]);
	expect(accepts.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
	await expect(host.mutation(api.rounds.accept, { roundId, expectedVersion: 2 })).rejects.toThrow(
		'The Round is over'
	);
	for (const seat of await views())
		expect(seat.result).toEqual({
			hands: [
				{ seatId: seatIds[0], cards: cards('Ah Qs 10c 9d 7s'), points: 75, score: 75 },
				{ seatId: seatIds[1], cards: [], points: 0, score: 0 }
			]
		});
});

test('a final draw effect at a four-player table resolves on the next Seat, then scores all four hands', async () => {
	const { players, views, seatIds, gameId } = await opened(
		[cards('Kc'), cards('8h 8d'), cards('Qd Jc'), cards('10s 9c')],
		card('9h'),
		cards('Qs 10c 9d 7s Kd')
	);
	const [, second, third, fourth] = players;
	const roundId = (await views())[0].id;
	await second.mutation(api.rounds.play, { roundId, expectedVersion: 0, cards: cards('8h 8d') });
	for (const seat of await views())
		expect(seat).toMatchObject({
			result: null,
			effect: { targetSeatId: seatIds[2], drawCount: 4, skip: true }
		});
	const accepts = await Promise.allSettled([
		third.mutation(api.rounds.accept, { roundId, expectedVersion: 1 }),
		third.mutation(api.rounds.accept, { roundId, expectedVersion: 1 })
	]);
	expect(accepts.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
	await expect(fourth.mutation(api.rounds.draw, { roundId, expectedVersion: 2 })).rejects.toThrow(
		'The Round is over'
	);
	const result = {
		hands: [
			{ seatId: seatIds[0], cards: cards('Kc'), points: 10, score: 10 },
			{ seatId: seatIds[1], cards: [], points: 0, score: 0 },
			{ seatId: seatIds[2], cards: cards('Qd Jc Qs 10c 9d 7s'), points: 90, score: 90 },
			{ seatId: seatIds[3], cards: cards('10s 9c'), points: 10, score: 10 }
		]
	};
	for (const seat of await views()) expect(seat).toMatchObject({ result, drawCount: 24 });
	const game = await second.query(api.games.view, { gameId });
	expect(game.seats.map((seat) => seat.score)).toEqual([10, 0, 90, 10]);
});

test('a final 6 cannot finish a Round uncovered, so its player draws a cover first', async () => {
	const { players, views, seatIds } = await opened(
		[cards('Kc'), cards('6d 6h')],
		card('9h'),
		cards('Qh 10c')
	);
	const [, guest] = players;
	const roundId = (await views())[0].id;
	await guest.mutation(api.rounds.play, { roundId, expectedVersion: 0, cards: cards('6d 6h') });
	for (const seat of await views())
		expect(seat).toMatchObject({ result: null, mustCover: true, currentSeatId: seatIds[1] });
	expect((await views())[1]).toMatchObject({ hand: [], playable: [], canDraw: true });
	await guest.mutation(api.rounds.draw, { roundId, expectedVersion: 1 });
	for (const seat of await views()) expect(seat.result).toBeNull();
	await guest.mutation(api.rounds.play, { roundId, expectedVersion: 2, cards: cards('Qh') });
	for (const seat of await views())
		expect(seat.result).toEqual({
			hands: [
				{ seatId: seatIds[0], cards: cards('Kc'), points: 10, score: 10 },
				{ seatId: seatIds[1], cards: [], points: 0, score: 0 }
			]
		});
});

test.each([
	{ kingOfSpades: false, points: 10 },
	{ kingOfSpades: true, points: 80 }
])(
	'a King of Spades left in hand scores $points when its effect is $kingOfSpades',
	async ({ kingOfSpades, points }) => {
		const { players, views } = await opened([cards('Ks'), cards('10h 10s')], card('9h'), [], {
			kingOfSpades
		});
		await players[1].mutation(api.rounds.play, {
			roundId: (await views())[0].id,
			expectedVersion: 0,
			cards: cards('10h 10s')
		});
		const [view] = await views();
		expect(view.result?.hands[0]).toMatchObject({ cards: cards('Ks'), points, score: points });
	}
);

// Deals the next Round from `deck`, then answers any starter tie with `choices`.
async function nextRound(
	caller: Awaited<ReturnType<typeof createPlayer>>,
	{ id, version }: { id: Id<'rounds'>; version: number },
	deck: readonly Card[],
	choices: number[] = []
) {
	vi.stubGlobal('Math', scriptedMath([...shuffleValues(orderedDeck, deck), ...choices]));
	try {
		await caller.mutation(api.rounds.next, { roundId: id, expectedVersion: version });
	} finally {
		vi.unstubAllGlobals();
	}
}

test('the default starter policy picks the highest score, then previous-Round points, then at random', async () => {
	const { players, views, seatIds, gameId, player } = await opened(
		[cards('Kh'), cards('10h 10s'), cards('10c 9c')],
		card('9h')
	);
	const [, second, third] = players;
	let [view] = await views();
	await second.mutation(api.rounds.play, {
		roundId: view.id,
		expectedVersion: 0,
		cards: cards('10h 10s')
	});
	[view] = await views();
	const finished = view;
	// Seats 1 and 3 tie on 10 points overall and in the previous Round, so a random choice decides.
	await nextRound(
		third,
		finished,
		dealDeck([cards('Kd'), cards('10h 10s'), cards('Jc 9d')], card('9h')),
		[choice(1, 2)]
	);
	const round2 = await views();
	for (const seat of round2)
		expect(seat).toMatchObject({
			number: 2,
			starterSeatId: seatIds[2],
			currentSeatId: seatIds[0],
			result: null,
			recentMoves: [
				{ version: 0, seatId: seatIds[2], event: { kind: 'start', topCard: card('9h') } }
			]
		});
	expect(round2.map((seat) => seat.hand)).toEqual([cards('10h 10s'), cards('Jc 9d'), cards('Kd')]);
	await expect(nextRound(second, finished, orderedDeck)).rejects.toThrow('Round changed');
	await expect(nextRound(await player(9), finished, orderedDeck)).rejects.toThrow(
		'Game unavailable'
	);
	await expect(nextRound(second, round2[0], orderedDeck)).rejects.toThrow(
		'The Round is still in play'
	);
	await players[0].mutation(api.rounds.play, {
		roundId: round2[0].id,
		expectedVersion: 0,
		cards: cards('10h 10s')
	});
	[view] = await views();
	expect(view.result?.hands.map(({ points, score }) => ({ points, score }))).toEqual([
		{ points: 0, score: 10 },
		{ points: 20, score: 20 },
		{ points: 10, score: 20 }
	]);
	// Seats 2 and 3 tie on 20 overall; Seat 2 scored more last Round, so no random choice is needed.
	await nextRound(players[0], view, orderedDeck);
	[view] = await views();
	expect(view).toMatchObject({ number: 3, starterSeatId: seatIds[1] });
	const game = await players[0].query(api.games.view, { gameId });
	expect(game.seats.map((seat) => seat.score)).toEqual([10, 20, 20]);
});

test.each([
	{ starterPolicy: 'previous-starter', choices: [], starter: 0 },
	{ starterPolicy: 'random', choices: [choice(1, 2)], starter: 1 }
] as const)(
	'the $starterPolicy starter policy picks Seat $starter for the next Round',
	async ({ starterPolicy, choices, starter }) => {
		const { players, views, seatIds } = await opened(
			[cards('Kh'), cards('10h 10s')],
			card('9h'),
			[],
			{ starterPolicy }
		);
		let [view] = await views();
		await players[1].mutation(api.rounds.play, {
			roundId: view.id,
			expectedVersion: 0,
			cards: cards('10h 10s')
		});
		[view] = await views();
		await nextRound(players[1], view, orderedDeck, [...choices]);
		[view] = await views();
		expect(view).toMatchObject({ number: 2, starterSeatId: seatIds[starter] });
	}
);
