import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requirePlayer } from './access';
import { defaultRules, rulesValidator } from './rules';
import schema from './schema';

const gameStatus = schema.tables.games.validator.fields.status;
const gameSummary = v.object({ id: v.id('games'), name: v.string(), status: gameStatus });
const seatView = v.object({
	id: v.id('seats'),
	isHost: v.boolean(),
	score: v.number(),
	ready: v.boolean()
});
const gameView = gameSummary.extend({
	rules: rulesValidator,
	version: v.number(),
	isHost: v.boolean(),
	viewerSeatId: v.id('seats'),
	seats: v.array(seatView)
});

export const create = mutation({
	args: { name: v.string() },
	returns: v.id('games'),
	handler: async (ctx, args) => {
		const player = await requirePlayer(ctx);
		const name = args.name.trim();
		if (name.length < 1 || name.length > 80)
			throw new ConvexError('Name must contain 1 to 80 characters');
		const gameId = await ctx.db.insert('games', {
			name,
			hostId: player.id,
			status: 'lobby',
			rules: defaultRules,
			version: 0
		});
		await ctx.db.insert('seats', { gameId, userId: player.id, score: 0, ready: false });
		return gameId;
	}
});

export const list = query({
	args: {},
	returns: v.array(gameSummary),
	handler: async (ctx) => {
		const player = await requirePlayer(ctx);
		const seats = await ctx.db
			.query('seats')
			.withIndex('by_userId', (q) => q.eq('userId', player.id))
			.order('desc')
			.take(100);
		const games = await Promise.all(seats.map((seat) => ctx.db.get('games', seat.gameId)));
		return games
			.filter((game) => game !== null)
			.filter((game) => game.status === 'lobby' || game.status === 'active')
			.map((game) => ({ id: game._id, name: game.name, status: game.status }));
	}
});

export const view = query({
	args: { gameId: v.id('games') },
	returns: gameView,
	handler: async (ctx, { gameId }) => {
		const player = await requirePlayer(ctx);
		const seat = await ctx.db
			.query('seats')
			.withIndex('by_gameId_and_userId', (q) => q.eq('gameId', gameId).eq('userId', player.id))
			.unique();
		if (!seat) throw new ConvexError('Game unavailable');
		const game = await ctx.db.get('games', gameId);
		if (!game) throw new ConvexError('Game unavailable');
		const seats = await ctx.db
			.query('seats')
			.withIndex('by_gameId', (q) => q.eq('gameId', gameId))
			.take(4);
		return {
			id: game._id,
			name: game.name,
			status: game.status,
			rules: game.rules,
			version: game.version,
			isHost: game.hostId === player.id,
			viewerSeatId: seat._id,
			seats: seats.map((item) => ({
				id: item._id,
				isHost: item.userId === game.hostId,
				score: item.score,
				ready: item.ready
			}))
		};
	}
});
