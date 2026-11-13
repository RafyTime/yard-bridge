import { ConvexError, v } from 'convex/values';
import type { ObjectType } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { requirePlayer } from './access';
import {
	cardValidator,
	effectValidator,
	openingValidator,
	orderedDeck,
	sameCard,
	shuffle,
	suitValidator
} from './cards';
import { initializeRound } from './roundInitialization';
import {
	blockedReason,
	canPlay,
	drawCards,
	drawEffect,
	drawUntilPlayable,
	nextSeatId,
	playableCards,
	withCardCount
} from './roundTurns';

export const start = mutation({
	args: { gameId: v.id('games'), expectedGameVersion: v.number() },
	returns: v.null(),
	handler: async (ctx, { gameId, expectedGameVersion }) => {
		const player = await requirePlayer(ctx);
		const game = await ctx.db.get('games', gameId);
		if (!game || game.hostId !== player.id) throw new ConvexError('Host only');
		if (game.status !== 'lobby') throw new ConvexError('Round already started');
		if (game.version !== expectedGameVersion)
			throw new ConvexError('Game changed. Review the latest rules');
		const seats = await ctx.db
			.query('seats')
			.withIndex('by_gameId', (q) => q.eq('gameId', gameId))
			.take(5);
		if (seats.length < 2 || seats.length > 4 || seats.some((seat) => !seat.ready))
			throw new ConvexError('Every player must review the rules');
		const deck = shuffle(orderedDeck);
		const starterIndex = Math.floor(Math.random() * seats.length);
		const { hands, ...round } = initializeRound({
			deck,
			seats,
			starterSeatId: seats[starterIndex]._id,
			rules: game.rules
		});
		const roundId = await ctx.db.insert('rounds', { gameId, number: 1, ...round });
		for (const hand of hands) await ctx.db.insert('roundHands', { roundId, ...hand });
		await ctx.db.patch('games', gameId, { status: 'active', version: game.version + 1 });
		return null;
	}
});

export const view = query({
	args: { gameId: v.id('games') },
	returns: v.object({
		id: v.id('rounds'),
		number: v.number(),
		version: v.number(),
		hand: v.array(cardValidator),
		// Server-decided moves for this viewer; both stay empty outside the viewer's turn.
		playable: v.array(cardValidator),
		canDraw: v.boolean(),
		drawnCard: v.union(cardValidator, v.null()),
		topCard: cardValidator,
		drawCount: v.number(),
		starterSeatId: v.id('seats'),
		currentSeatId: v.id('seats'),
		activeSuit: v.union(suitValidator, v.null()),
		opening: openingValidator,
		effect: v.union(effectValidator, v.null()),
		mustCover: v.boolean(),
		openingEffects: v.boolean(),
		seats: v.array(v.object({ seatId: v.id('seats'), cardCount: v.number() }))
	}),
	handler: async (ctx, { gameId }) => {
		const player = await requirePlayer(ctx);
		const seat = await ctx.db
			.query('seats')
			.withIndex('by_gameId_and_userId', (q) => q.eq('gameId', gameId).eq('userId', player.id))
			.unique();
		if (!seat) throw new ConvexError('Game unavailable');
		const round = await ctx.db
			.query('rounds')
			.withIndex('by_gameId', (q) => q.eq('gameId', gameId))
			.order('desc')
			.first();
		if (!round) throw new ConvexError('Round unavailable');
		const hand = await ctx.db
			.query('roundHands')
			.withIndex('by_roundId_and_seatId', (q) => q.eq('roundId', round._id).eq('seatId', seat._id))
			.unique();
		if (!hand) throw new ConvexError('Game unavailable');
		const playable = playableCards(round, seat._id, hand.cards);
		const isTurn = round.currentSeatId === seat._id;
		return {
			id: round._id,
			number: round.number,
			version: round.version,
			hand: hand.cards,
			playable,
			canDraw: isTurn && !blockedReason(round) && !playable.length,
			drawnCard: isTurn ? round.drawnCard : null,
			topCard: round.playedPile[round.playedPile.length - 1],
			drawCount: round.drawPile.length,
			starterSeatId: round.starterSeatId,
			currentSeatId: round.currentSeatId,
			activeSuit: round.activeSuit,
			mustCover: round.mustCover,
			opening: round.opening,
			effect: round.effect,
			openingEffects: round.rules.openingEffects,
			seats: round.handCounts
		};
	}
});

const turnArgs = { roundId: v.id('rounds'), expectedVersion: v.number() };
type Turn = ObjectType<typeof turnArgs>;

// Load the Round for the caller's turn, rejecting outsiders, stale versions, and other Seats.
async function currentTurn(ctx: MutationCtx, { roundId, expectedVersion }: Turn) {
	const player = await requirePlayer(ctx);
	const round = await ctx.db.get('rounds', roundId);
	const seat =
		round &&
		(await ctx.db
			.query('seats')
			.withIndex('by_gameId_and_userId', (q) =>
				q.eq('gameId', round.gameId).eq('userId', player.id)
			)
			.unique());
	if (!round || !seat) throw new ConvexError('Game unavailable');
	if (round.version !== expectedVersion)
		throw new ConvexError('Round changed. Review the latest table');
	if (round.currentSeatId !== seat._id) throw new ConvexError('Not your turn');
	return round;
}

// Load the caller's hand for the turn.
async function currentHand(ctx: MutationCtx, round: Doc<'rounds'>) {
	const hand = await ctx.db
		.query('roundHands')
		.withIndex('by_roundId_and_seatId', (q) =>
			q.eq('roundId', round._id).eq('seatId', round.currentSeatId)
		)
		.unique();
	if (!hand) throw new ConvexError('Game unavailable');
	return hand;
}

// Load the turn for Play or Draw, rejecting pending states these moves cannot resolve.
async function ordinaryTurn(ctx: MutationCtx, turn: Turn) {
	const round = await currentTurn(ctx, turn);
	const blocked = blockedReason(round);
	if (blocked) throw new ConvexError(blocked);
	return { round, hand: await currentHand(ctx, round) };
}

// The starter of an opening Jack sets the active suit, then play passes on.
export const chooseSuit = mutation({
	args: { ...turnArgs, suit: suitValidator },
	returns: v.null(),
	handler: async (ctx, { suit, ...turn }) => {
		const round = await currentTurn(ctx, turn);
		if (round.opening.kind !== 'choose-suit') throw new ConvexError('No suit to choose');
		await ctx.db.patch('rounds', round._id, {
			activeSuit: suit,
			opening: { kind: 'none' },
			currentSeatId: nextSeatId(round),
			version: round.version + 1
		});
		return null;
	}
});

export const play = mutation({
	// `cards` is an ordered same-rank group placed first to last; the last card is the new top.
	// A Jack on top needs the chosen `suit`.
	args: { ...turnArgs, cards: v.array(cardValidator), suit: v.optional(suitValidator) },
	returns: v.null(),
	handler: async (ctx, { cards: group, suit, ...turn }) => {
		const { round, hand } = await ordinaryTurn(ctx, turn);
		const [first] = group;
		const top = group.at(-1);
		if (!first || !top) throw new ConvexError('Choose a card to play');
		if (round.drawnCard && (group.length > 1 || !sameCard(round.drawnCard, first)))
			throw new ConvexError('Play the card you drew');
		if (group.some((card) => card.rank !== first.rank))
			throw new ConvexError('A group must share the same rank');
		const cards = [...hand.cards];
		for (const card of group) {
			const index = cards.findIndex((held) => sameCard(held, card));
			if (index < 0) throw new ConvexError('Card not in your hand');
			cards.splice(index, 1);
		}
		if (!canPlay(round, first)) throw new ConvexError('Card does not match the table');
		if (top.rank === 'J' && !suit) throw new ConvexError('Choose a suit for the Jack');
		if (top.rank !== 'J' && suit) throw new ConvexError('Only a Jack chooses a suit');
		// A 6 on top keeps the turn until the same Seat covers it.
		const mustCover = top.rank === '6';
		const next = nextSeatId(round);
		const effect = drawEffect(group, round.rules);
		await ctx.db.patch('roundHands', hand._id, { cards });
		await ctx.db.patch('rounds', round._id, {
			playedPile: [...round.playedPile, ...group],
			activeSuit: suit ?? top.suit,
			currentSeatId: mustCover ? round.currentSeatId : next,
			mustCover,
			effect: effect && { targetSeatId: next, ...effect },
			drawnCard: null,
			handCounts: withCardCount(round, hand.seatId, cards.length),
			version: round.version + 1
		});
		return null;
	}
});

export const draw = mutation({
	args: turnArgs,
	returns: v.null(),
	handler: async (ctx, turn) => {
		const { round, hand } = await ordinaryTurn(ctx, turn);
		if (round.drawnCard) throw new ConvexError('Play the card you drew');
		if (hand.cards.some((card) => canPlay(round, card)))
			throw new ConvexError('You already have a playable card');
		const { drawn, playable, ...piles } = drawUntilPlayable(round);
		const cards = [...hand.cards, ...drawn];
		await ctx.db.patch('roundHands', hand._id, { cards });
		await ctx.db.patch('rounds', round._id, {
			...piles,
			// With nothing left to draw or recycle, the turn passes and any 6 cover is waived.
			currentSeatId: playable ? round.currentSeatId : nextSeatId(round),
			drawnCard: playable,
			mustCover: playable ? round.mustCover : false,
			handCounts: withCardCount(round, hand.seatId, cards.length),
			version: round.version + 1
		});
		return null;
	}
});

// The target of a pending effect draws its cards, or what remains after recycling, then plays
// on unless the effect skips them. A zero-draw skip, such as an opening Ace, is a plain skip.
export const accept = mutation({
	args: turnArgs,
	returns: v.null(),
	handler: async (ctx, turn) => {
		const round = await currentTurn(ctx, turn);
		const { effect } = round;
		if (!effect) throw new ConvexError('No effect to accept');
		const hand = await currentHand(ctx, round);
		const { drawn, ...piles } = drawCards(round, effect.drawCount);
		const cards = [...hand.cards, ...drawn];
		await ctx.db.patch('roundHands', hand._id, { cards });
		await ctx.db.patch('rounds', round._id, {
			...piles,
			effect: null,
			currentSeatId: effect.skip ? nextSeatId(round) : round.currentSeatId,
			handCounts: withCardCount(round, hand.seatId, cards.length),
			version: round.version + 1
		});
		return null;
	}
});
