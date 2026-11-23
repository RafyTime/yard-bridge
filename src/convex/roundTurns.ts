import type { Doc, Id } from './_generated/dataModel';
import { sameCard, shuffle } from './cards';
import type { Card, Suit } from './cards';
import type { RulesConfiguration } from './rules';

// A Round whose frozen rules have been read through `currentRules`.
export type Round = Omit<Doc<'rounds'>, 'rules'> & { rules: RulesConfiguration };

// What the next card must match: the top card, the active suit, and any 6 awaiting a cover.
export type Table = { top: Card; activeSuit: Suit | null; mustCover: boolean };

export const tableOf = (round: Pick<Round, 'playedPile' | 'activeSuit' | 'mustCover'>): Table => ({
	top: round.playedPile[round.playedPile.length - 1],
	activeSuit: round.activeSuit,
	mustCover: round.mustCover
});

// Suit-or-rank matching against the top card and the active suit. A 6 or Jack is wild, but a
// cover for the top 6 must be its suit or another 6.
export function canPlay(table: Table, card: Card) {
	if (card.suit === table.activeSuit || card.rank === table.top.rank) return true;
	return !table.mustCover && (card.rank === '6' || card.rank === 'J');
}

// Why an ordered batch cannot be played on the table, or null when it can. The first card must be
// playable, and a freshly drawn card must start the batch. In Match rank or suit, each later card
// must be playable on the one before it, so a 6 needs its cover next. A Jack ends the batch, so
// only another Jack may follow it. The caller checks that the cards are held.
export function batchProblem(
	table: Table & { drawnCard: Card | null },
	batch: readonly Card[],
	rules: Pick<RulesConfiguration, 'groupingMode' | 'drawnCardGrouping'>
) {
	const [first] = batch;
	if (!first) return 'Choose a card to play';
	if (table.drawnCard && !sameCard(table.drawnCard, first)) return 'Play the card you drew';
	if (batch.length > 1) {
		if (table.drawnCard && !rules.drawnCardGrouping) return 'Play the card you drew alone';
		if (rules.groupingMode === 'single') return 'Play one card at a time';
	}
	let current: Table = table;
	for (const [index, card] of batch.entries()) {
		if (index && rules.groupingMode === 'same-rank' && card.rank !== first.rank)
			return 'A batch must share the same rank';
		if (index && batch[index - 1].rank === 'J' && card.rank !== 'J') return 'A Jack ends the batch';
		if (!canPlay(current, card)) return 'Card does not match the table';
		current = { top: card, activeSuit: card.suit, mustCover: card.rank === '6' };
	}
	return null;
}

function cardEffect(card: Card, rules: Pick<RulesConfiguration, 'kingOfSpades' | 'aceBehavior'>) {
	if (card.rank === 'A') return rules.aceBehavior === 'skip' ? { drawCount: 0, skip: true } : null;
	if (card.rank === '7') return { drawCount: 1, skip: false };
	if (card.rank === '8') return { drawCount: 2, skip: true };
	if (card.suit === 'spades' && card.rank === 'Q') return { drawCount: 5, skip: true };
	if (card.suit === 'spades' && card.rank === 'K' && rules.kingOfSpades)
		return { drawCount: 7, skip: true };
	return null;
}

// The Pending effect of an ordered batch, resolved once by the next Seat. Consecutive draw or skip
// cards add their draws and keep any skip; a card with neither, including a 6 or Jack, clears the
// penalty so far. 7 is draw one, 8 draw two and skip, the Queen and enabled King of Spades draw
// five and seven and skip. Under the default Ace rule an Ace is a zero-draw skip; under
// cancellation it has no effect of its own and serves only as the target's reaction (see `cancel`
// in rounds.ts).
export function drawEffect(
	batch: readonly Card[],
	rules: Pick<RulesConfiguration, 'kingOfSpades' | 'aceBehavior'>
) {
	return batch.reduce<{ drawCount: number; skip: boolean } | null>((total, card) => {
		const effect = cardEffect(card, rules);
		if (!effect) return null;
		return {
			drawCount: (total?.drawCount ?? 0) + effect.drawCount,
			skip: !!total?.skip || effect.skip
		};
	}, null);
}

// A batch declares Bridge when it ends in four cards of an eligible rank and leaves no 6 to cover.
// Single card play cannot form one, whatever Bridge setting the Host chose.
export function declaresBridge(
	batch: readonly Card[],
	rules: Pick<RulesConfiguration, 'groupingMode' | 'bridgeDeclaration'>
) {
	if (rules.groupingMode === 'single' || rules.bridgeDeclaration === 'off') return false;
	const last = batch.slice(-4);
	const { rank } = last[0] ?? {};
	if (last.length < 4 || rank === '6' || last.some((card) => card.rank !== rank)) return false;
	return rules.bridgeDeclaration === 'four-of-a-kind' || rank === 'J';
}

// Jacks at the end of a batch, each deducted from a finishing hand.
export function trailingJacks(batch: readonly Card[]) {
	const index = batch.findLastIndex((card) => card.rank !== 'J');
	return batch.length - 1 - index;
}

// Pending states that Play and Draw cannot resolve, with the reason shown to the mover.
export function blockedReason(round: Pick<Round, 'opening' | 'effect' | 'result'>) {
	if (round.result) return 'The Round is over';
	if (round.opening.kind === 'choose-suit') return 'The opening card must be resolved first';
	if (round.effect) return 'Accept the pending effect first';
	return null;
}

// Cards that may start the Seat's batch now: only the drawn card after a Draw, otherwise every
// match in hand.
export function playableCards(
	round: Pick<
		Round,
		| 'currentSeatId'
		| 'drawnCard'
		| 'opening'
		| 'effect'
		| 'result'
		| 'playedPile'
		| 'activeSuit'
		| 'mustCover'
	>,
	seatId: Id<'seats'>,
	hand: readonly Card[]
) {
	if (round.currentSeatId !== seatId || blockedReason(round)) return [];
	if (round.drawnCard) return [round.drawnCard];
	return hand.filter((card) => canPlay(tableOf(round), card));
}

// Aces the Seat may play to cancel the pending effect aimed at it, under the cancellation rule.
export function cancelAces(
	round: Pick<Round, 'rules' | 'effect'>,
	seatId: Id<'seats'>,
	hand: readonly Card[]
) {
	if (round.rules.aceBehavior !== 'cancel' || round.effect?.targetSeatId !== seatId) return [];
	return hand.filter((card) => card.rank === 'A');
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

// The draw of a Seat with no playable card. An ordinary turn takes one card. A Seat that
// owes a 6 cover keeps drawing until a cover appears. `playable` is the last drawn card when it
// can be played, otherwise null and the turn passes.
export function drawForTurn(round: Piles & Pick<Round, 'activeSuit' | 'mustCover'>) {
	const playable = (card?: Card) => (card && canPlay(tableOf(round), card) ? card : null);
	const result = round.mustCover
		? drawWhile(round, (drawn) => !playable(drawn.at(-1)))
		: drawCards(round, 1);
	return { ...result, playable: playable(result.drawn.at(-1)) };
}
