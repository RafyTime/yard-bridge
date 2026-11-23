import { v } from 'convex/values';
import type { Infer } from 'convex/values';
import type { Card } from './cards';
import { cardValidator } from './cards';
import type { RulesConfiguration } from './rules';

// How a Round ended: a hand emptied, a Bridge was declared, or every Seat passed with nothing
// left to draw or recycle.
export const roundEndingValidator = v.union(
	v.object({ kind: v.literal('emptyHand'), seatId: v.id('seats') }),
	v.object({ kind: v.literal('bridge'), seatId: v.id('seats') }),
	v.object({ kind: v.literal('exhausted') })
);

// A Batch that ends the Round once it resolves: it emptied a hand or declared a Bridge. `jacks`
// counts the Jacks ending a Batch that emptied the hand, each earning the Finish bonus.
export const finishValidator = v.object({
	kind: v.union(v.literal('emptyHand'), v.literal('bridge')),
	seatId: v.id('seats'),
	jacks: v.number()
});

// Points deducted per Jack ending the Batch that empties a hand.
export const finishBonusPerJack = 20;

// A completed Round's final hands, Penalty points, and accumulated Game scores, shown to
// every Seat once the Round ends. Results scored before Bridge and exhausted-table endings omit
// `ending`, `multiplier`, and `finishBonus`; they all ended on an empty hand without either.
export const roundResultValidator = v.object({
	ending: v.optional(roundEndingValidator),
	// Applied to held-card points once the played pile has been recycled.
	multiplier: v.optional(v.number()),
	hands: v.array(
		v.object({
			seatId: v.id('seats'),
			cards: v.array(cardValidator),
			// The Finish bonus, subtracted after the multiplier.
			finishBonus: v.optional(v.number()),
			points: v.number(),
			score: v.number()
		})
	)
});
export type RoundResult = Infer<typeof roundResultValidator>;

// Remaining-card values. The King of Spades is an ordinary King unless its effect is enabled.
export function cardPoints(card: Card, rules: Pick<RulesConfiguration, 'kingOfSpades'>) {
	if (card.suit === 'spades' && card.rank === 'Q') return 50;
	if (card.suit === 'spades' && card.rank === 'K' && rules.kingOfSpades) return 80;
	switch (card.rank) {
		case '6':
		case '7':
		case '8':
		case '9':
			return 0;
		case '10':
		case 'Q':
		case 'K':
			return 10;
		case 'A':
			return 15;
		case 'J':
			return 20;
	}
}

export function handPoints(
	cards: readonly Card[],
	rules: Pick<RulesConfiguration, 'kingOfSpades'>
) {
	return cards.reduce((total, card) => total + cardPoints(card, rules), 0);
}
