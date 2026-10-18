import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
	...authTables,
	// Temporary shared data for the foundation connection check.
	smokeCounters: defineTable({
		name: v.literal('foundation'),
		value: v.number()
	}).index('by_name', ['name'])
});
