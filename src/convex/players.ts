import { getAuthSessionId, getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { query } from './_generated/server';

// Identity always comes from the authenticated request, never a client-supplied player ID.
export const viewer = query({
	args: {},
	returns: v.object({ id: v.id('users'), email: v.string() }),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		const sessionId = await getAuthSessionId(ctx);
		if (userId === null || sessionId === null) throw new ConvexError('Sign in to continue');
		const session = await ctx.db.get('authSessions', sessionId);
		if (session?.userId !== userId) throw new ConvexError('Sign in to continue');
		const user = await ctx.db.get('users', userId);
		if (!user?.email || user.emailVerificationTime === undefined) {
			throw new ConvexError('Sign in to continue');
		}
		return { id: user._id, email: user.email };
	}
});
