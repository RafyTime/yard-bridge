import type { Doc, Id } from './_generated/dataModel';
import { shuffle } from './cards';
import type { Card } from './cards';

type Round = Doc<'rounds'>;

// Suit-or-rank matching against the top card and the active suit. A 6 or Jack is wild, but a
// cover for the top 6 must be its suit or another 6.
export function canPlay(round: Pick<Round, 'playedPile' | 'activeSuit' | 'mustCover'>, card: Card) {
	const top = round.playedPile[round.playedPile.length - 1];
	if (card.suit === round.activeSuit || card.rank === top.rank) return true;
	return !round.mustCover && (card.rank === '6' || card.rank === 'J');
}

// Opening states that ordinary moves cannot resolve: the starter's suit choice after an opening
// Jack, and opening effects that later rule tickets apply.
export const openingBlocksMoves = (round: Pick<Round, 'opening'>) =>
	round.opening.kind === 'choose-suit' || round.opening.kind === 'effect';

// Cards the Seat may play now: only the drawn card after a Draw, otherwise every match in hand.
export function playableCards(round: Round, seatId: Id<'seats'>, hand: readonly Card[]) {
	if (round.currentSeatId !== seatId || openingBlocksMoves(round)) return [];
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
