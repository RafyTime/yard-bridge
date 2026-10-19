import type { TestConvex } from 'convex-test';
import type schema from '../../src/convex/schema';

// Seed verified identity and a durable session; scenarios still use public commands and views.
export async function createPlayer(t: TestConvex<typeof schema>, email: string) {
	const subject = await t.run(async (ctx) => {
		const userId = await ctx.db.insert('users', { email, emailVerificationTime: 1 });
		const sessionId = await ctx.db.insert('authSessions', {
			userId,
			expirationTime: Date.now() + 100000
		});
		return `${userId}|${sessionId}`;
	});
	return t.withIdentity({ subject });
}
