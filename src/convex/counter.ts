import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// This unauthenticated demo is for the development deployment only.
export const get = query({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const counter = await ctx.db
			.query('smokeCounters')
			.withIndex('by_name', (q) => q.eq('name', 'foundation'))
			.unique();
		return counter?.value ?? 0;
	}
});

export const increment = mutation({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const counter = await ctx.db
			.query('smokeCounters')
			.withIndex('by_name', (q) => q.eq('name', 'foundation'))
			.unique();
		const value = (counter?.value ?? 0) + 1;
		if (counter) {
			await ctx.db.patch('smokeCounters', counter._id, { value });
		} else {
			await ctx.db.insert('smokeCounters', { name: 'foundation', value });
		}
		return value;
	}
});
