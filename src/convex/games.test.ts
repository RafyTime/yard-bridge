/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vite-plus/test';
import { api } from './_generated/api';
import schema from './schema';
import { createPlayer } from '../../tests/fixtures/convex-player';

const modules = import.meta.glob(['./**/*.{ts,js}', '!./**/*.test.ts', '!./**/*.d.ts']);

test('a player creates private games and resumes the same host seat in a new session', async () => {
	const t = convexTest(schema, modules);
	const [first, second] = await t.run(async (ctx) => {
		const userId = await ctx.db.insert('users', {
			email: 'leo@example.com',
			emailVerificationTime: 1
		});
		const first = await ctx.db.insert('authSessions', {
			userId,
			expirationTime: Date.now() + 100000
		});
		const second = await ctx.db.insert('authSessions', {
			userId,
			expirationTime: Date.now() + 100000
		});
		return [`${userId}|${first}`, `${userId}|${second}`];
	});
	const player = t.withIdentity({ subject: first });
	const gameId = await player.mutation(api.games.create, { name: '  Evening game  ' });
	const otherId = await player.mutation(api.games.create, { name: 'Weekend' });
	const game = await player.query(api.games.view, { gameId });
	expect(game.name).toBe('Evening game');
	expect(game.status).toBe('lobby');
	expect(game.isHost).toBe(true);
	expect(game.rules).toEqual({
		scoreCutoff: 200,
		kingOfSpades: false,
		handSize: 5,
		openingEffects: true,
		bridgeDeclaration: true,
		aceBehavior: 'skip',
		recycleMultiplier: 2,
		starterPolicy: 'highest-score'
	});
	expect(game.seats).toHaveLength(1);
	expect(game.seats[0]).toMatchObject({ id: game.viewerSeatId, score: 0, ready: false });
	const returning = t.withIdentity({ subject: second });
	expect((await returning.query(api.games.list, {})).map((item) => item.id)).toEqual([
		otherId,
		gameId
	]);
	expect(await returning.query(api.games.view, { gameId })).toEqual(game);
	await expect(t.query(api.games.view, { gameId })).rejects.toThrow('Sign in to continue');
	const outsider = await createPlayer(t, 'other@example.com');
	expect(await outsider.query(api.games.list, {})).toEqual([]);
	await expect(outsider.query(api.games.view, { gameId })).rejects.toThrow('Game unavailable');
	await expect(player.mutation(api.games.create, { name: '  ' })).rejects.toThrow(
		'Name must contain'
	);
	await expect(t.mutation(api.games.create, { name: 'Private' })).rejects.toThrow(
		'Sign in to continue'
	);
});
