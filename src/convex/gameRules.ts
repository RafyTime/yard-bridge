import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requirePlayer } from './access';
import { rulesValidator } from './rules';

export const saved = query({
	args: {},
	returns: v.array(v.object({ id: v.id('savedRules'), name: v.string(), rules: rulesValidator })),
	handler: async (ctx) => {
		const player = await requirePlayer(ctx);
		const configurations = await ctx.db
			.query('savedRules')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', player.id))
			.order('desc')
			.take(100);
		return configurations.map((item) => ({ id: item._id, name: item.name, rules: item.rules }));
	}
});

export const save = mutation({
	args: { gameId: v.id('games'), expectedVersion: v.number(), name: v.string() },
	returns: v.id('savedRules'),
	handler: async (ctx, { gameId, expectedVersion, name }) => {
		const player = await requirePlayer(ctx);
		const game = await ctx.db.get('games', gameId);
		if (!game || game.hostId !== player.id) throw new ConvexError('Host only');
		if (game.version !== expectedVersion)
			throw new ConvexError('Game changed. Review the latest rules');
		const trimmed = name.trim();
		if (!trimmed || trimmed.length > 80)
			throw new ConvexError('Name must contain 1 to 80 characters');
		return await ctx.db.insert('savedRules', {
			ownerId: player.id,
			name: trimmed,
			rules: game.rules
		});
	}
});

export const update = mutation({
	args: { gameId: v.id('games'), expectedVersion: v.number(), rules: rulesValidator },
	returns: v.null(),
	handler: async (ctx, { gameId, expectedVersion, rules }) => {
		const player = await requirePlayer(ctx);
		const game = await ctx.db.get('games', gameId);
		if (!game || game.hostId !== player.id) throw new ConvexError('Host only');
		if (game.status !== 'lobby') throw new ConvexError('Rules locked');
		if (game.version !== expectedVersion)
			throw new ConvexError('Game changed. Review the latest rules');
		if (!Number.isSafeInteger(rules.scoreCutoff) || rules.scoreCutoff < 1)
			throw new ConvexError('Score cutoff must be a positive whole number');
		if (!Number.isInteger(rules.handSize) || rules.handSize < 2 || rules.handSize > 9)
			throw new ConvexError('Hand size must be 2 to 9 cards');
		const seats = await ctx.db
			.query('seats')
			.withIndex('by_gameId', (q) => q.eq('gameId', gameId))
			.take(4);
		for (const seat of seats) await ctx.db.patch('seats', seat._id, { ready: false });
		await ctx.db.patch('games', gameId, { rules, version: game.version + 1 });
		return null;
	}
});

export const ready = mutation({
	args: { gameId: v.id('games'), expectedVersion: v.number() },
	returns: v.null(),
	handler: async (ctx, { gameId, expectedVersion }) => {
		const player = await requirePlayer(ctx);
		const seat = await ctx.db
			.query('seats')
			.withIndex('by_gameId_and_userId', (q) => q.eq('gameId', gameId).eq('userId', player.id))
			.unique();
		if (!seat) throw new ConvexError('Game unavailable');
		const game = await ctx.db.get('games', gameId);
		if (!game) throw new ConvexError('Game unavailable');
		if (game.status !== 'lobby') throw new ConvexError('Lobby closed');
		if (game.version !== expectedVersion)
			throw new ConvexError('Game changed. Review the latest rules');
		await ctx.db.patch('seats', seat._id, { ready: true });
		return null;
	}
});
