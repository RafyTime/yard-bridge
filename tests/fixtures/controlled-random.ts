import { orderedDeck, ranks, suits, type Card } from '../../src/convex/cards';

export { orderedDeck };

const key = (card: Card) => `${card.rank}:${card.suit}`;

// Math.random values that make the server's Fisher-Yates shuffle turn `from` into `to`.
export function shuffleValues(from: readonly Card[], to: readonly Card[]) {
	const cards = from.map(key);
	const values: number[] = [];
	for (let index = cards.length - 1; index > 0; index--) {
		const other = cards.indexOf(key(to[index]));
		if (other < 0 || other > index) throw new Error(`${key(to[index])} cannot reach ${index}`);
		values.push((other + 0.5) / (index + 1));
		[cards[index], cards[other]] = [cards[other], cards[index]];
	}
	return values;
}

// The Math.random value that picks `index` out of `length` choices.
export const choice = (index: number, length: number) => (index + 0.5) / length;

// A Math replacement that returns `values` in order and fails on unplanned randomness.
export function scriptedMath(values: readonly number[]): Math {
	const queue = [...values];
	return Object.create(Math, {
		random: {
			value: () => {
				if (!queue.length) throw new Error('Unplanned Math.random call');
				return queue.shift();
			}
		}
	});
}

// Deal order for a starter at Seat index 0: hands[0] holds the starter's cards before `top`.
export function dealDeck(hands: readonly Card[][], top: Card, draw: readonly Card[] = []) {
	const deck: Card[] = [];
	for (let round = 0; round <= hands[0].length; round++)
		for (const [seat, hand] of hands.entries())
			deck.push(seat === 0 && round === hands[0].length ? top : hand[round]);
	deck.push(...draw);
	const used = new Set(deck.map(key));
	if (used.size !== deck.length) throw new Error('A card appears twice in the deal');
	return [...deck, ...orderedDeck.filter((card) => !used.has(key(card)))];
}

// Parses a short card label such as `10h` or `Qs`.
export function card(label: string): Card {
	const rank = ranks.find((rank) => rank === label.slice(0, -1));
	const suit = suits.find((suit) => suit[0] === label.at(-1));
	if (!rank || !suit) throw new Error(`Unknown card ${label}`);
	return { rank, suit };
}

export const cards = (labels: string) => labels.split(' ').map(card);
