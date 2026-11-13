import type { Infer } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { openingValidator } from './cards';
import type { Card, Effect } from './cards';
import { drawEffect } from './roundTurns';
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
	let effect: Effect | null = null;
	// An opening 6 leaves the starter to cover it, as a played 6 does.
	const mustCover = rules.openingEffects && topCard.rank === '6';
	if (rules.openingEffects) {
		if (topCard.rank === 'J') opening = { kind: 'choose-suit', seatId: starter._id };
		// An opening Ace is a zero-draw skip that its target accepts.
		const pending =
			topCard.rank === 'A' ? { drawCount: 0, skip: true } : drawEffect([topCard], rules);
		if (pending) effect = { targetSeatId: next._id, ...pending };
	}
	return {
		rules,
		drawPile: deck.slice(dealt),
		playedPile: [topCard],
		starterSeatId: starter._id,
		currentSeatId: opening.kind === 'choose-suit' || mustCover ? starter._id : next._id,
		activeSuit: opening.kind === 'choose-suit' ? null : topCard.suit,
		opening,
		effect,
		drawnCard: null,
		mustCover,
		recycles: 0,
		version: 0,
		handCounts: seats.map((seat, index) => ({ seatId: seat._id, cardCount: hands[index].length })),
		hands: seats.map((seat, index) => ({ seatId: seat._id, cards: hands[index] }))
	};
}
