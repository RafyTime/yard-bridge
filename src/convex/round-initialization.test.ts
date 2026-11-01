import { expect, test } from 'vite-plus/test';
import type { Id } from './_generated/dataModel';
import { ranks, suits, type Card } from './cards';
import { initializeRound } from './round-initialization';
import { defaultRules } from './rules';

const seats = ['host', 'guest', 'third', 'fourth'].map((id) => ({
	_id: id as Id<'seats'>
}));
const deck = suits.flatMap((suit) => ranks.map((rank) => ({ suit, rank })));

test('the chosen starter opens their last dealt card and the complete deal preserves every card', () => {
	const round = initializeRound({
		deck,
		seats: seats.slice(0, 2),
		starterSeatId: seats[1]._id,
		rules: { ...defaultRules, handSize: 2 }
	});
	expect(round.hands).toEqual([
		{
			seatId: seats[0]._id,
			cards: [
				{ suit: 'clubs', rank: '7' },
				{ suit: 'clubs', rank: '9' }
			]
		},
		{ seatId: seats[1]._id, cards: [{ suit: 'clubs', rank: '6' }] }
	]);
	expect(round.playedPile).toEqual([{ suit: 'clubs', rank: '8' }]);
	expect(round.drawPile).toEqual(deck.slice(4));
	expect(round.starterSeatId).toBe(seats[1]._id);
	expect(round.handCounts).toEqual([
		{ seatId: seats[0]._id, cardCount: 2 },
		{ seatId: seats[1]._id, cardCount: 1 }
	]);
});

test.each([
	{
		count: 2,
		handSize: 2,
		starter: 1,
		lengths: [2, 1],
		drawCount: 32,
		top: { suit: 'clubs', rank: '8' }
	},
	{
		count: 3,
		handSize: 5,
		starter: 1,
		lengths: [5, 4, 5],
		drawCount: 21,
		top: { suit: 'diamonds', rank: '9' }
	},
	{
		count: 4,
		handSize: 9,
		starter: 0,
		lengths: [8, 9, 9, 9],
		drawCount: 0,
		top: { suit: 'spades', rank: 'J' }
	}
])(
	'a $count-Seat deal with $handSize cards preserves the whole deck',
	({ count, handSize, starter, lengths, drawCount, top }) => {
		const round = initializeRound({
			deck,
			seats: seats.slice(0, count),
			starterSeatId: seats[starter]._id,
			rules: { ...defaultRules, handSize }
		});
		expect(round.hands.map((hand) => hand.cards.length)).toEqual(lengths);
		expect(round.drawPile).toHaveLength(drawCount);
		expect(round.playedPile).toEqual([top]);
		const cards = [
			...round.hands.flatMap((hand) => hand.cards),
			...round.playedPile,
			...round.drawPile
		];
		expect(cards).toHaveLength(36);
		expect(new Set(cards.map((card) => `${card.suit}:${card.rank}`))).toEqual(
			new Set(deck.map((card) => `${card.suit}:${card.rank}`))
		);
	}
);

// Place the scenario's card at the chosen starter's final deal position.
function openingDeck(topCard: Card) {
	const ordered = deck.filter((card) => card.rank !== topCard.rank || card.suit !== topCard.suit);
	ordered.splice(2, 0, topCard);
	return ordered;
}

test.each([
	{ rank: '9', suit: 'hearts', opening: { kind: 'none' }, current: 0 },
	{ rank: 'J', suit: 'clubs', opening: { kind: 'choose-suit', seatId: seats[1]._id }, current: 1 },
	{ rank: '6', suit: 'diamonds', opening: { kind: 'cover-six', seatId: seats[1]._id }, current: 1 },
	{
		rank: '7',
		suit: 'hearts',
		opening: { kind: 'effect', targetSeatId: seats[0]._id, drawCount: 1, skip: false },
		current: 0
	},
	{
		rank: '8',
		suit: 'clubs',
		opening: { kind: 'effect', targetSeatId: seats[0]._id, drawCount: 2, skip: true },
		current: 0
	},
	{
		rank: 'A',
		suit: 'diamonds',
		opening: { kind: 'effect', targetSeatId: seats[0]._id, drawCount: 0, skip: true },
		current: 0
	},
	{
		rank: 'Q',
		suit: 'spades',
		opening: { kind: 'effect', targetSeatId: seats[0]._id, drawCount: 5, skip: false },
		current: 0
	},
	{ rank: 'Q', suit: 'hearts', opening: { kind: 'none' }, current: 0 },
	{ rank: 'K', suit: 'spades', opening: { kind: 'none' }, current: 0 }
] as const)(
	'an opening $rank of $suit records its obligation, next Seat and active suit',
	({ rank, suit, opening, current }) => {
		const round = initializeRound({
			deck: openingDeck({ rank, suit }),
			seats: seats.slice(0, 2),
			starterSeatId: seats[1]._id,
			rules: { ...defaultRules, handSize: 2 }
		});
		expect(round.playedPile).toEqual([{ rank, suit }]);
		expect(round.opening).toEqual(opening);
		expect(round.currentSeatId).toBe(seats[current]._id);
		expect(round.activeSuit).toBe(rank === 'J' ? null : suit);
	}
);

test('the optional King of Spades records seven pending draws', () => {
	const round = initializeRound({
		deck: openingDeck({ rank: 'K', suit: 'spades' }),
		seats: seats.slice(0, 2),
		starterSeatId: seats[1]._id,
		rules: { ...defaultRules, handSize: 2, kingOfSpades: true }
	});
	expect(round.opening).toEqual({
		kind: 'effect',
		targetSeatId: seats[0]._id,
		drawCount: 7,
		skip: false
	});
	expect(round.currentSeatId).toBe(seats[0]._id);
	expect(round.activeSuit).toBe('spades');
});

test.each(['J', '6', '7', '8', 'A', 'Q', 'K'] as const)(
	'disabled opening effects leave an opening $rank without an obligation',
	(rank) => {
		const round = initializeRound({
			deck: openingDeck({ rank, suit: 'spades' }),
			seats: seats.slice(0, 2),
			starterSeatId: seats[1]._id,
			rules: { ...defaultRules, handSize: 2, kingOfSpades: true, openingEffects: false }
		});
		expect(round.opening).toEqual({ kind: 'none' });
		expect(round.currentSeatId).toBe(seats[0]._id);
		expect(round.activeSuit).toBe('spades');
	}
);
