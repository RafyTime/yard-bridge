import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { requirePlayer } from './access';
import {
	cardValidator,
	openingValidator,
	ranks,
	sameCard,
	shuffle,
	suits,
	suitValidator
} from './cards';
import { initializeRound } from './round-initialization';
import {
	canPlay,
	drawUntilPlayable,
	nextSeatId,
	openingBlocksMoves,
	playableCards,
	withCardCount
} from './round-turns';

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
		const deck = shuffle(suits.flatMap((suit) => ranks.map((rank) => ({ suit, rank }))));
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
			canDraw: isTurn && !openingBlocksMoves(round) && !playable.length,
			drawnCard: isTurn ? round.drawnCard : null,
			topCard: round.playedPile[round.playedPile.length - 1],
			drawCount: round.drawPile.length,
			starterSeatId: round.starterSeatId,
			currentSeatId: round.currentSeatId,
			activeSuit: round.activeSuit,
			mustCover: round.mustCover,
			opening: round.opening,
			openingEffects: round.rules.openingEffects,
			seats: round.handCounts
		};
	}
});

const turnArgs = { roundId: v.id('rounds'), expectedVersion: v.number() };

// Load the caller's hand for an ordinary move, rejecting stale versions, other Seats' turns,
// and pending opening states that later rule tickets resolve.
async function ordinaryTurn(
	ctx: MutationCtx,
	{ roundId, expectedVersion }: { roundId: Id<'rounds'>; expectedVersion: number }
) {
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
	if (round.opening.kind !== 'none')
		throw new ConvexError('The opening card must be resolved first');
	const hand = await ctx.db
		.query('roundHands')
		.withIndex('by_roundId_and_seatId', (q) => q.eq('roundId', round._id).eq('seatId', seat._id))
		.unique();
	if (!hand) throw new ConvexError('Game unavailable');
	return { round, hand };
}

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
		const cards = [...hand.cards];
		for (const card of group) {
			const index = cards.findIndex((held) => sameCard(held, card));
			if (index < 0) throw new ConvexError('Card not in your hand');
			cards.splice(index, 1);
		}
		if (!canPlay(round, first)) throw new ConvexError('Card does not match the table');
		if (top.rank === 'J' && !suit) throw new ConvexError('Choose a suit for the Jack');
		if (top.rank !== 'J' && suit) throw new ConvexError('Only a Jack chooses a suit');
		await ctx.db.patch('roundHands', hand._id, { cards });
		await ctx.db.patch('rounds', round._id, {
			playedPile: [...round.playedPile, ...group],
			activeSuit: suit ?? top.suit,
			currentSeatId: nextSeatId(round),
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
			// With nothing left to draw or recycle, the turn passes.
			currentSeatId: playable ? round.currentSeatId : nextSeatId(round),
			drawnCard: playable,
			handCounts: withCardCount(round, hand.seatId, cards.length),
			version: round.version + 1
		});
		return null;
	}
});
