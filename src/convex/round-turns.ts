import type { Doc, Id } from './_generated/dataModel';
import { shuffle } from './cards';
import type { Card } from './cards';
import type { RulesConfiguration } from './rules';

type Round = Doc<'rounds'>;

// Suit-or-rank matching against the top card and the active suit. A 6 or Jack is wild, but a
// cover for the top 6 must be its suit or another 6.
export function canPlay(round: Pick<Round, 'playedPile' | 'activeSuit' | 'mustCover'>, card: Card) {
	const top = round.playedPile[round.playedPile.length - 1];
	if (card.suit === round.activeSuit || card.rank === top.rank) return true;
	return !round.mustCover && (card.rank === '6' || card.rank === 'J');
}

// The draw effect of a played group's top card. Same-rank 7s and 8s add their draws; any other
// group fires only its top card. The Queen and enabled King of Spades also skip their target.
// Played Aces arrive with ticket 10.
export function drawEffect(
	group: readonly Card[],
	rules: Pick<RulesConfiguration, 'kingOfSpades'>
) {
	const top = group[group.length - 1];
	if (top.rank === '7') return { drawCount: group.length, skip: false };
	if (top.rank === '8') return { drawCount: 2 * group.length, skip: true };
	if (top.suit === 'spades' && top.rank === 'Q') return { drawCount: 5, skip: true };
	if (top.suit === 'spades' && top.rank === 'K' && rules.kingOfSpades)
		return { drawCount: 7, skip: true };
	return null;
}

// Pending states that Play and Draw cannot resolve, with the reason shown to the mover.
export function blockedReason(round: Pick<Round, 'opening' | 'effect'>) {
	if (round.opening.kind === 'choose-suit') return 'The opening card must be resolved first';
	if (round.effect) return 'Accept the pending effect first';
	return null;
}

// Cards the Seat may play now: only the drawn card after a Draw, otherwise every match in hand.
export function playableCards(
	round: Pick<
		Round,
		'currentSeatId' | 'drawnCard' | 'opening' | 'effect' | 'playedPile' | 'activeSuit' | 'mustCover'
	>,
	seatId: Id<'seats'>,
	hand: readonly Card[]
) {
	if (round.currentSeatId !== seatId || blockedReason(round)) return [];
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

type Piles = Pick<Round, 'drawPile' | 'playedPile' | 'recycles'>;

// Take the next card, recycling the played pile below its top card when the draw pile is empty.
// `card` is null when nothing more can be drawn or recycled.
function takeCard({ drawPile, playedPile, recycles }: Piles) {
	if (!drawPile.length) {
		if (playedPile.length < 2) return { card: null, drawPile, playedPile, recycles };
		drawPile = shuffle(playedPile.slice(0, -1));
		playedPile = playedPile.slice(-1);
		recycles++;
	}
	const [card, ...rest] = drawPile;
	return { card, drawPile: rest, playedPile, recycles };
}

// Draw while `more` accepts the cards drawn so far. Stops early when nothing more can be drawn
// or recycled.
function drawWhile(
	{ drawPile, playedPile, recycles }: Piles,
	more: (drawn: readonly Card[]) => boolean
) {
	let piles: Piles = { drawPile, playedPile, recycles };
	const drawn: Card[] = [];
	while (more(drawn)) {
		const { card, ...next } = takeCard(piles);
		if (!card) break;
		piles = next;
		drawn.push(card);
	}
	return { drawn, ...piles };
}

// Draw up to `count` cards. A short pile yields only what can be drawn after recycling.
export function drawCards(piles: Piles, count: number) {
	return drawWhile(piles, (drawn) => drawn.length < count);
}

// Draw until a playable card appears. `playable` is null when nothing more can be drawn or recycled.
export function drawUntilPlayable(
	round: Piles & Pick<Round, 'playedPile' | 'activeSuit' | 'mustCover'>
) {
	const playable = (card?: Card) => (card && canPlay(round, card) ? card : null);
	const result = drawWhile(round, (drawn) => !playable(drawn.at(-1)));
	return { ...result, playable: playable(result.drawn.at(-1)) };
}
