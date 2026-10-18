import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { rulesValidator } from './rules';

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
	seats: defineTable({
		gameId: v.id('games'),
		userId: v.id('users'),
		score: v.number(),
		ready: v.boolean()
	})
		.index('by_userId', ['userId'])
		.index('by_gameId', ['gameId'])
		.index('by_gameId_and_userId', ['gameId', 'userId']),
	// Temporary shared data for the foundation connection check.
	smokeCounters: defineTable({
		name: v.literal('foundation'),
		value: v.number()
	}).index('by_name', ['name'])
});
