import { query } from './_generated/server';
import { v } from 'convex/values';

export const check = query({
	args: {},
	returns: v.literal('Connected to Convex'),
	handler: () => 'Connected to Convex' as const,
});
