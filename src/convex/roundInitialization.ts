import type { Infer } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { openingValidator } from './cards';
import type { Card, Effect } from './cards';
import { drawEffect } from './roundTurns';
import type { RulesConfiguration } from './rules';

// The starter of a later Round under the frozen policy. The default picks the highest
// accumulated score, then the most points in the finished Round, then at random. `seats` follows
// table order, so a random tie-break is reproducible under a supplied random choice.
export function laterStarter(
	policy: RulesConfiguration['starterPolicy'],
	previousStarterId: Id<'seats'>,
	seats: readonly { seatId: Id<'seats'>; score: number; points: number }[]
) {
	if (policy === 'previous-starter') return previousStarterId;
	const tied = policy === 'highest-score' ? highest(highest(seats, 'score'), 'points') : seats;
	if (tied.length === 1) return tied[0].seatId;
	return tied[Math.floor(Math.random() * tied.length)].seatId;
}

function highest<Seat extends Record<Key, number>, Key extends string>(
	seats: readonly Seat[],
	key: Key
) {
	const best = Math.max(...seats.map((seat) => seat[key]));
	return seats.filter((seat) => seat[key] === best);
}

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
		const pending = drawEffect([topCard], rules);
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
		result: null,
		handCounts: seats.map((seat, index) => ({ seatId: seat._id, cardCount: hands[index].length })),
		hands: seats.map((seat, index) => ({ seatId: seat._id, cards: hands[index] }))
	};
}
