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
	canStart: v.boolean(),
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
			canStart:
				game.status === 'lobby' &&
				seats.length >= 2 &&
				seats.length <= 4 &&
				seats.every((item) => item.ready),
			seats: seats.map((item) => ({
				id: item._id,
				isHost: item.userId === game.hostId,
				score: item.score,
				ready: item.ready
			}))
		};
	}
});

// Invitation previews deliberately omit rules, seats, and all private game state.
export const invite = mutation({
	args: { gameId: v.id('games') },
	returns: v.string(),
	handler: async (ctx, { gameId }) => {
		const player = await requirePlayer(ctx);
		const game = await ctx.db.get('games', gameId);
		if (!game || game.hostId !== player.id) throw new ConvexError('Host only');
		if (game.status !== 'lobby') throw new ConvexError('Lobby closed');
		const existing = await ctx.db
			.query('invitations')
			.withIndex('by_gameId', (q) => q.eq('gameId', gameId))
			.unique();
		if (existing) return existing.token;
		const token = Array.from({ length: 32 }, () =>
			Math.floor(Math.random() * 256)
				.toString(16)
				.padStart(2, '0')
		).join('');
		await ctx.db.insert('invitations', { gameId, token });
		return token;
	}
});
export const invitation = query({
	args: { token: v.string() },
	returns: v.object({
		name: v.string(),
		status: v.union(
			v.literal('invited'),
			v.literal('pending'),
			v.literal('rejected'),
			v.literal('approved')
		),
		gameId: v.union(v.id('games'), v.null())
	}),
	handler: async (ctx, { token }) => {
		const player = await requirePlayer(ctx);
		const invitation = await ctx.db
			.query('invitations')
			.withIndex('by_token', (q) => q.eq('token', token))
			.unique();
		const game = invitation && (await ctx.db.get('games', invitation.gameId));
		if (!game) throw new ConvexError('Invitation unavailable');
		const seat = await ctx.db
			.query('seats')
			.withIndex('by_gameId_and_userId', (q) => q.eq('gameId', game._id).eq('userId', player.id))
			.unique();
		if (seat) return { name: game.name, status: 'approved' as const, gameId: game._id };
		if (game.status !== 'lobby') throw new ConvexError('Lobby closed');
		const request = await ctx.db
			.query('seatRequests')
			.withIndex('by_gameId_and_userId', (q) => q.eq('gameId', game._id).eq('userId', player.id))
			.unique();
		return { name: game.name, status: request?.status ?? ('invited' as const), gameId: null };
	}
});
export const requestSeat = mutation({
	args: { token: v.string() },
	returns: v.null(),
	handler: async (ctx, { token }) => {
		const player = await requirePlayer(ctx);
		const invitation = await ctx.db
			.query('invitations')
			.withIndex('by_token', (q) => q.eq('token', token))
			.unique();
		const game = invitation && (await ctx.db.get('games', invitation.gameId));
		if (!game) throw new ConvexError('Invitation unavailable');
		const seat = await ctx.db
			.query('seats')
			.withIndex('by_gameId_and_userId', (q) => q.eq('gameId', game._id).eq('userId', player.id))
			.unique();
		if (seat) return null;
		if (game.status !== 'lobby') throw new ConvexError('Lobby closed');
		const request = await ctx.db
			.query('seatRequests')
			.withIndex('by_gameId_and_userId', (q) => q.eq('gameId', game._id).eq('userId', player.id))
			.unique();
		if (request) return null;
		const requests = await ctx.db
			.query('seatRequests')
			.withIndex('by_gameId', (q) => q.eq('gameId', game._id))
			.take(100);
		if (requests.length >= 100) throw new ConvexError('Request limit reached');
		await ctx.db.insert('seatRequests', {
			gameId: game._id,
			userId: player.id,
			email: player.email,
			status: 'pending'
		});
		return null;
	}
});
export const requests = query({
	args: { gameId: v.id('games') },
	returns: v.array(v.object({ id: v.id('seatRequests'), email: v.string() })),
	handler: async (ctx, { gameId }) => {
		const player = await requirePlayer(ctx);
		const game = await ctx.db.get('games', gameId);
		if (!game || game.hostId !== player.id) throw new ConvexError('Host only');
		const requests = await ctx.db
			.query('seatRequests')
			.withIndex('by_gameId_and_status', (q) => q.eq('gameId', gameId).eq('status', 'pending'))
			.take(100);
		return requests.map((request) => ({ id: request._id, email: request.email }));
	}
});
export const decideSeat = mutation({
	args: { requestId: v.id('seatRequests'), approve: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { requestId, approve }) => {
		const player = await requirePlayer(ctx);
		const request = await ctx.db.get('seatRequests', requestId);
		const game = request && (await ctx.db.get('games', request.gameId));
		if (!game || game.hostId !== player.id) throw new ConvexError('Host only');
		if (game.status !== 'lobby') throw new ConvexError('Lobby closed');
		if (!request || request.status !== 'pending') throw new ConvexError('Request unavailable');
		if (!approve) {
			await ctx.db.patch('seatRequests', requestId, { status: 'rejected' });
			return null;
		}
		const seats = await ctx.db
			.query('seats')
			.withIndex('by_gameId', (q) => q.eq('gameId', game._id))
			.take(4);
		if (seats.length >= 4) throw new ConvexError('Table full');
		if (!seats.some((seat) => seat.userId === request.userId))
			await ctx.db.insert('seats', {
				gameId: game._id,
				userId: request.userId,
				score: 0,
				ready: false
			});
		await ctx.db.delete('seatRequests', requestId);
		await ctx.db.patch('games', game._id, { version: game.version + 1 });
		return null;
	}
});
