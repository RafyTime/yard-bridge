import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { storedRulesValidator } from './rules';
import { cardValidator, effectValidator, openingValidator, suitValidator } from './cards';
import { recentMoveValidator } from './roundEvents';
import { finishValidator, roundResultValidator } from './roundScoring';

export default defineSchema({
	...authTables,
	games: defineTable({
		name: v.string(),
		hostId: v.id('users'),
		status: v.union(
			v.literal('lobby'),
			v.literal('active'),
			v.literal('finished'),
			v.literal('abandoned')
		),
		rules: storedRulesValidator,
		version: v.number()
	}),
	rounds: defineTable({
		gameId: v.id('games'),
		number: v.number(),
		rules: storedRulesValidator,
		drawPile: v.array(cardValidator),
		playedPile: v.array(cardValidator),
		starterSeatId: v.id('seats'),
		currentSeatId: v.id('seats'),
		activeSuit: v.union(suitValidator, v.null()),
		opening: openingValidator,
		effect: v.union(effectValidator, v.null()),
		// A Draw that found a playable card leaves it here until the current Seat plays it.
		drawnCard: v.union(cardValidator, v.null()),
		// The current Seat placed the top 6 and must cover it before play passes.
		mustCover: v.boolean(),
		// Counts recycles of the played pile; scoring applies the multiplier after the first.
		recycles: v.number(),
		// Increases with every accepted turn command so stale or repeated moves cannot commit.
		version: v.number(),
		handCounts: v.array(v.object({ seatId: v.id('seats'), cardCount: v.number() })),
		// The Finish that ends the Round once its Pending effect resolves, with the Jacks that ended
		// its Batch when it emptied the hand.
		finish: v.optional(finishValidator),
		// Consecutive passes with nothing left to draw or recycle; the Round ends once every Seat has.
		exhaustedPasses: v.number(),
		// Set once the Round ends; every later turn command is rejected.
		result: v.union(roundResultValidator, v.null())
	}).index('by_gameId', ['gameId']),
	roundHands: defineTable({
		roundId: v.id('rounds'),
		seatId: v.id('seats'),
		cards: v.array(cardValidator)
	}).index('by_roundId_and_seatId', ['roundId', 'seatId']),
	// One public event per accepted Round command, saved with the move it describes.
	roundEvents: defineTable({
		roundId: v.id('rounds'),
		...recentMoveValidator.fields
	}).index('by_roundId_and_version', ['roundId', 'version']),
	savedRules: defineTable({
		ownerId: v.id('users'),
		name: v.string(),
		rules: storedRulesValidator
	}).index('by_ownerId', ['ownerId']),
	seats: defineTable({
		gameId: v.id('games'),
		userId: v.id('users'),
		score: v.number(),
		ready: v.boolean()
	})
		.index('by_userId', ['userId'])
		.index('by_gameId', ['gameId'])
		.index('by_gameId_and_userId', ['gameId', 'userId']),
	invitations: defineTable({ gameId: v.id('games'), token: v.string() })
		.index('by_gameId', ['gameId'])
		.index('by_token', ['token']),
	seatRequests: defineTable({
		gameId: v.id('games'),
		userId: v.id('users'),
		email: v.string(),
		status: v.union(v.literal('pending'), v.literal('rejected'))
	})
		.index('by_gameId', ['gameId'])
		.index('by_gameId_and_userId', ['gameId', 'userId'])
		.index('by_gameId_and_status', ['gameId', 'status']),
	// Temporary shared data for the foundation connection check.
	smokeCounters: defineTable({
		name: v.literal('foundation'),
		value: v.number()
	}).index('by_name', ['name'])
});
