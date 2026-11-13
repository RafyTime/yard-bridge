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

// The unshuffled 36-card deck, suit by suit, that every Round shuffles.
export const orderedDeck: readonly Card[] = suits.flatMap((suit) =>
	ranks.map((rank) => ({ suit, rank }))
);

export const openingValidator = v.union(
	v.object({ kind: v.literal('none') }),
	v.object({ kind: v.literal('choose-suit'), seatId: v.id('seats') }),
	v.object({ kind: v.literal('cover-six'), seatId: v.id('seats') })
);

// A draw or skip waiting on its target Seat, from the opening card or a play. The target
// resolves it with Accept before any other move.
export const effectValidator = v.object({
	targetSeatId: v.id('seats'),
	drawCount: v.number(),
	skip: v.boolean()
});
export type Effect = Infer<typeof effectValidator>;

export const sameCard = (left: Card, right: Card) =>
	left.rank === right.rank && left.suit === right.suit;

// Convex seeds Math.random independently for each mutation and preserves it on retries.
export function shuffle(cards: readonly Card[]) {
	const shuffled = [...cards];
	for (let index = shuffled.length - 1; index > 0; index--) {
		const other = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
	}
	return shuffled;
}
