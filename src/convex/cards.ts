import { v } from 'convex/values';
import type { Infer } from 'convex/values';

export const suits = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export const ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export const suitValidator = v.union(...suits.map((suit) => v.literal(suit)));
export const cardValidator = v.object({
	suit: suitValidator,
	rank: v.union(...ranks.map((rank) => v.literal(rank)))
});
export type Card = Infer<typeof cardValidator>;

export const openingValidator = v.union(
	v.object({ kind: v.literal('none') }),
	v.object({ kind: v.literal('choose-suit'), seatId: v.id('seats') }),
	v.object({ kind: v.literal('cover-six'), seatId: v.id('seats') }),
	v.object({
		kind: v.literal('effect'),
		targetSeatId: v.id('seats'),
		drawCount: v.number(),
		skip: v.boolean()
	})
);
