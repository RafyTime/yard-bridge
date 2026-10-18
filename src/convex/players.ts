import { v } from 'convex/values';
import { query } from './_generated/server';
import { requirePlayer } from './access';

export const viewer = query({
	args: {},
	returns: v.object({ id: v.id('users'), email: v.string() }),
	handler: requirePlayer
});
