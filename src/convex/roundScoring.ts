import { v } from 'convex/values';
import type { Infer } from 'convex/values';
import type { Card } from './cards';
import { cardValidator } from './cards';
import type { RulesConfiguration } from './rules';

// A completed Round's final hands, Penalty points, and accumulated Game scores, shown to
// every Seat once the Round ends.
export const roundResultValidator = v.object({
	hands: v.array(
		v.object({
			seatId: v.id('seats'),
			cards: v.array(cardValidator),
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
