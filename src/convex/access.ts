import { getAuthSessionId, getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';
import type { QueryCtx } from './_generated/server';

// Verify the durable session so a signed-out token cannot read private game data.
export async function requirePlayer(ctx: QueryCtx) {
	const userId = await getAuthUserId(ctx);
	const sessionId = await getAuthSessionId(ctx);
	if (userId === null || sessionId === null) throw new ConvexError('Sign in to continue');
	const session = await ctx.db.get('authSessions', sessionId);
	if (session?.userId !== userId) throw new ConvexError('Sign in to continue');
	const user = await ctx.db.get('users', userId);
	if (!user?.email || user.emailVerificationTime === undefined)
		throw new ConvexError('Sign in to continue');
	return { id: user._id, email: user.email };
}
