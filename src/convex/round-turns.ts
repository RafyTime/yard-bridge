import type { Doc, Id } from './_generated/dataModel';
import { shuffle } from './cards';
import type { Card } from './cards';

type Round = Doc<'rounds'>;

// Ordinary suit-or-rank matching against the top card and the active suit.
export function canPlay(round: Pick<Round, 'playedPile' | 'activeSuit'>, card: Card) {
	const top = round.playedPile[round.playedPile.length - 1];
	return card.suit === round.activeSuit || card.rank === top.rank;
}

// Cards the Seat may play now: only the drawn card after a Draw, otherwise every match in hand.
// Moves wait while an opening obligation or effect is pending.
export function playableCards(round: Round, seatId: Id<'seats'>, hand: readonly Card[]) {
	if (round.currentSeatId !== seatId || round.opening.kind !== 'none') return [];
	if (round.drawnCard) return [round.drawnCard];
	return hand.filter((card) => canPlay(round, card));
}

// Table order follows the Round's Seat list.
export function nextSeatId(round: Pick<Round, 'handCounts' | 'currentSeatId'>) {
	const index = round.handCounts.findIndex((seat) => seat.seatId === round.currentSeatId);
	return round.handCounts[(index + 1) % round.handCounts.length].seatId;
}

export function withCardCount(round: Round, seatId: Id<'seats'>, cardCount: number) {
	return round.handCounts.map((seat) => (seat.seatId === seatId ? { seatId, cardCount } : seat));
}

// Draw until a playable card appears, recycling the played pile below its top card when the
// draw pile runs out. `playable` is null when nothing more can be drawn or recycled.
export function drawUntilPlayable(round: Round) {
	let { drawPile, playedPile, recycles } = round;
	const drawn: Card[] = [];
	for (;;) {
		if (!drawPile.length) {
			if (playedPile.length < 2) return { drawn, drawPile, playedPile, recycles, playable: null };
			drawPile = shuffle(playedPile.slice(0, -1));
			playedPile = playedPile.slice(-1);
			recycles++;
		}
		const [card, ...rest] = drawPile;
		drawPile = rest;
		drawn.push(card);
		if (canPlay(round, card)) return { drawn, drawPile, playedPile, recycles, playable: card };
	}
}
