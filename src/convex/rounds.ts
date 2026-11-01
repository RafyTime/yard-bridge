import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requirePlayer } from './access';
import { cardValidator, openingValidator, ranks, suits, suitValidator } from './cards';
import type { Card } from './cards';
import { initializeRound } from './round-initialization';

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
		const deck: Card[] = suits.flatMap((suit) => ranks.map((rank) => ({ suit, rank })));
		// Convex seeds Math.random independently for each mutation and preserves it on retries.
		for (let index = deck.length - 1; index > 0; index--) {
			const other = Math.floor(Math.random() * (index + 1));
			[deck[index], deck[other]] = [deck[other], deck[index]];
		}
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
		hand: v.array(cardValidator),
		topCard: cardValidator,
		drawCount: v.number(),
		starterSeatId: v.id('seats'),
		currentSeatId: v.id('seats'),
		activeSuit: v.union(suitValidator, v.null()),
		opening: openingValidator,
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
		return {
			id: round._id,
			number: round.number,
			hand: hand.cards,
			topCard: round.playedPile[round.playedPile.length - 1],
			drawCount: round.drawPile.length,
			starterSeatId: round.starterSeatId,
			currentSeatId: round.currentSeatId,
			activeSuit: round.activeSuit,
			opening: round.opening,
			openingEffects: round.rules.openingEffects,
			seats: round.handCounts
		};
	}
});
