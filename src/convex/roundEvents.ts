import { v } from 'convex/values';
import type { Infer } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { cardValidator, suitValidator } from './cards';

// The public facts of one accepted Round command, shared with every Seat. Drawn cards and hands
// are private, so a draw records only how many cards moved.
//
// To record a new command: add its member here, commit the command through `commitTurn` in
// rounds.ts (or `recordEvent` for a command outside a turn), and describe the new kind in the
// recent-moves feed in game-round.svelte, whose exhaustive switch fails to compile until it does.
export const roundEventValidator = v.union(
	v.object({ kind: v.literal('start'), topCard: cardValidator }),
	v.object({ kind: v.literal('chooseSuit'), suit: suitValidator }),
	v.object({ kind: v.literal('play'), cards: v.array(cardValidator), activeSuit: suitValidator }),
	v.object({
		kind: v.literal('draw'),
		count: v.number(),
		recycles: v.number(),
		// Nothing playable could be drawn, so the turn passed and any 6 cover was waived.
		passed: v.boolean(),
		coverWaived: v.boolean()
	}),
	v.object({
		kind: v.literal('accept'),
		count: v.number(),
		recycles: v.number(),
		skipped: v.boolean()
	}),
	// The target played this Ace to cancel the whole pending effect.
	v.object({ kind: v.literal('cancel'), card: cardValidator })
);
export type RoundEvent = Infer<typeof roundEventValidator>;

export const recentMoveValidator = v.object({
	// The Round version the command produced; it orders the feed and is unique per Round.
	version: v.number(),
	seatId: v.id('seats'),
	event: roundEventValidator
});

const recentMoveLimit = 5;

// Save an accepted command's event. Call it in the mutation that commits the move, so a rejected
// or stale command records nothing.
export async function recordEvent(
	ctx: MutationCtx,
	roundId: Id<'rounds'>,
	move: Infer<typeof recentMoveValidator>
) {
	await ctx.db.insert('roundEvents', { roundId, ...move });
}

// The latest moves of the Round, newest first.
export async function recentMoves(ctx: QueryCtx, round: Pick<Doc<'rounds'>, '_id'>) {
	const events = await ctx.db
		.query('roundEvents')
		.withIndex('by_roundId_and_version', (q) => q.eq('roundId', round._id))
		.order('desc')
		.take(recentMoveLimit);
	return events.map(({ version, seatId, event }) => ({ version, seatId, event }));
}
