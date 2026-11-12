import type { Infer } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { openingValidator } from './cards';
import type { Card } from './cards';
import type { RulesConfiguration } from './rules';

// Initialize the complete deal and pending opening effect from server-selected inputs.
export function initializeRound({
	deck,
	seats,
	starterSeatId,
	rules
}: {
	deck: readonly Card[];
	seats: readonly Pick<Doc<'seats'>, '_id'>[];
	starterSeatId: Id<'seats'>;
	rules: RulesConfiguration;
}) {
	const starterIndex = seats.findIndex((seat) => seat._id === starterSeatId);
	const starter = seats[starterIndex];
	const next = seats[(starterIndex + 1) % seats.length];
	const hands = seats.map<Card[]>(() => []);
	let dealt = 0;
	for (let card = 0; card < rules.handSize; card++) {
		for (let offset = 0; offset < seats.length; offset++)
			hands[(starterIndex + offset) % seats.length].push(deck[dealt++]);
	}
	const topCard = hands[starterIndex].pop()!;
	let opening: Infer<typeof openingValidator> = { kind: 'none' };
	if (rules.openingEffects) {
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
		else if (topCard.rank === 'K' && topCard.suit === 'spades' && rules.kingOfSpades)
			opening = { kind: 'effect', targetSeatId: next._id, drawCount: 7, skip: false };
	}
	return {
		rules,
		drawPile: deck.slice(dealt),
		playedPile: [topCard],
		starterSeatId: starter._id,
		currentSeatId:
			opening.kind === 'choose-suit' || opening.kind === 'cover-six' ? starter._id : next._id,
		activeSuit: opening.kind === 'choose-suit' ? null : topCard.suit,
		opening,
		drawnCard: null,
		recycles: 0,
		version: 0,
		handCounts: seats.map((seat, index) => ({ seatId: seat._id, cardCount: hands[index].length })),
		hands: seats.map((seat, index) => ({ seatId: seat._id, cards: hands[index] }))
	};
}
