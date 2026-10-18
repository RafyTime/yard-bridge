import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { rulesValidator } from './rules';
import { cardValidator, openingValidator, suitValidator } from './cards';

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
		rules: rulesValidator,
		version: v.number()
	}),
	rounds: defineTable({
		gameId: v.id('games'),
		number: v.number(),
		rules: rulesValidator,
		drawPile: v.array(cardValidator),
		playedPile: v.array(cardValidator),
		starterSeatId: v.id('seats'),
		currentSeatId: v.id('seats'),
		activeSuit: v.union(suitValidator, v.null()),
		opening: openingValidator,
		handCounts: v.array(v.object({ seatId: v.id('seats'), cardCount: v.number() }))
	}).index('by_gameId', ['gameId']),
	roundHands: defineTable({
		roundId: v.id('rounds'),
		seatId: v.id('seats'),
		cards: v.array(cardValidator)
	}).index('by_roundId_and_seatId', ['roundId', 'seatId']),
	savedRules: defineTable({
		ownerId: v.id('users'),
		name: v.string(),
		rules: rulesValidator
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
