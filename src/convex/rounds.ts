import { ConvexError, v } from 'convex/values';
import type { Infer } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requirePlayer } from './access';
import { cardValidator, openingValidator, ranks, suits, suitValidator } from './cards';
import type { Card } from './cards';

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
		const starter = seats[starterIndex];
		const next = seats[(starterIndex + 1) % seats.length];
		const hands = seats.map<Card[]>(() => []);
		let dealt = 0;
		for (let card = 0; card < game.rules.handSize; card++) {
			for (let offset = 0; offset < seats.length; offset++)
				hands[(starterIndex + offset) % seats.length].push(deck[dealt++]);
		}
		const topCard = hands[starterIndex].pop()!;
		let opening: Infer<typeof openingValidator> = { kind: 'none' };
		if (game.rules.openingEffects) {
			if (topCard.rank === 'J') opening = { kind: 'choose-suit', seatId: starter._id };
			else if (topCard.rank === '6') opening = { kind: 'cover-six', seatId: starter._id };
			else if (topCard.rank === '7')
				opening = { kind: 'effect', targetSeatId: next._id, drawCount: 1, skip: false };
			else if (topCard.rank === '8')
				opening = { kind: 'effect', targetSeatId: next._id, drawCount: 2, skip: true };
			else if (topCard.rank === 'A')
				opening = { kind: 'effect', targetSeatId: next._id, drawCount: 0, skip: true };
			else if (topCard.rank === 'Q' && topCard.suit === 'spades')
				opening = { kind: 'effect', targetSeatId: next._id, drawCount: 5, skip: false };
			else if (topCard.rank === 'K' && topCard.suit === 'spades' && game.rules.kingOfSpades)
				opening = { kind: 'effect', targetSeatId: next._id, drawCount: 7, skip: false };
		}
		const roundId = await ctx.db.insert('rounds', {
			gameId,
			number: 1,
			rules: game.rules,
			drawPile: deck.slice(dealt),
			playedPile: [topCard],
			starterSeatId: starter._id,
			currentSeatId:
				opening.kind === 'choose-suit' || opening.kind === 'cover-six' ? starter._id : next._id,
			activeSuit: opening.kind === 'choose-suit' ? null : topCard.suit,
			opening,
			handCounts: seats.map((seat, index) => ({ seatId: seat._id, cardCount: hands[index].length }))
		});
		for (let index = 0; index < seats.length; index++)
			await ctx.db.insert('roundHands', { roundId, seatId: seats[index]._id, cards: hands[index] });
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
