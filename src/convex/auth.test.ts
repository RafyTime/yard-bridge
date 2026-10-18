/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { exportPKCS8, generateKeyPair, jwtVerify } from 'jose';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob(['./**/*.{ts,js}', '!./**/*.test.ts', '!./**/*.d.ts']);
const issuer = 'https://auth-test.convex.site';
const keys = await generateKeyPair('RS256', { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
let deliveredCode = '';

beforeEach(() => {
	vi.stubEnv('JWT_PRIVATE_KEY', privateKey);
	vi.stubEnv('CONVEX_SITE_URL', issuer);
	vi.stubEnv('SITE_URL', 'http://localhost:5173');
	vi.stubEnv('AUTH_RESEND_KEY', 'test-key');
	vi.stubEnv('AUTH_EMAIL_FROM', 'Yard Bridge <signin@example.com>');
	vi.stubGlobal(
		'fetch',
		vi.fn<typeof fetch>(async (_url, init) => {
			const message: { text: string } = JSON.parse(String(init?.body));
			deliveredCode = message.text.match(/\b\d{8}\b/)![0];
			return Response.json({ id: 'test-email' });
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

test('an unsigned player cannot read a player identity', async () => {
	const t = convexTest(schema, modules);
	await expect(t.query(api.players.viewer, {})).rejects.toThrow('Sign in to continue');
});

test('a delivered code grants only its player identity, refreshes, and cannot be reused', async () => {
	const t = convexTest(schema, modules);
	const email = 'leo@example.com';
	await t.action(api.auth.signIn, { provider: 'resend-otp', params: { email } });
	expect(deliveredCode).toMatch(/^\d{8}$/);
	const code = deliveredCode;
	const result = await t.action(api.auth.signIn, {
		provider: 'resend-otp',
		params: { email, code }
	});
	expect(result.tokens).toBeTruthy();
	const { payload } = await jwtVerify(result.tokens!.token, keys.publicKey, {
		issuer,
		audience: 'convex'
	});
	const player = t.withIdentity({ subject: payload.sub!, issuer });
	const viewer = await player.query(api.players.viewer, {});
	expect(viewer.email).toBe(email);
	await t.action(api.auth.signIn, {
		provider: 'resend-otp',
		params: { email: 'guest@example.com' }
	});
	const guestTokens = await t.action(api.auth.signIn, {
		provider: 'resend-otp',
		params: { email: 'guest@example.com', code: deliveredCode }
	});
	const guest = await jwtVerify(guestTokens.tokens!.token, keys.publicKey, {
		issuer,
		audience: 'convex'
	});
	const guestViewer = await t
		.withIdentity({ subject: guest.payload.sub!, issuer })
		.query(api.players.viewer, {});
	expect(guestViewer.email).toBe('guest@example.com');
	expect(guestViewer.id).not.toBe(viewer.id);
	expect(await player.query(api.players.viewer, {})).toEqual(viewer);
	await expect(t.query(api.players.viewer, {})).rejects.toThrow('Sign in to continue');
	await expect(
		t.action(api.auth.signIn, {
			provider: 'resend-otp',
			params: { email, code }
		})
	).rejects.toThrow('Could not verify code');
	const refreshed = await t.action(api.auth.signIn, { refreshToken: result.tokens!.refreshToken });
	expect(refreshed.tokens).toBeTruthy();
	await player.action(api.auth.signOut, {});
	await expect(player.query(api.players.viewer, {})).rejects.toThrow('Sign in to continue');
	expect(await t.action(api.auth.signIn, { refreshToken: refreshed.tokens!.refreshToken })).toEqual(
		{ tokens: null }
	);
});

test('wrong, expired, replaced, and wrong-email codes never grant a session', async () => {
	const t = convexTest(schema, modules);
	const email = 'leo@example.com';
	const request = () => t.action(api.auth.signIn, { provider: 'resend-otp', params: { email } });
	const verify = (code: string, address = email) =>
		t.action(api.auth.signIn, {
			provider: 'resend-otp',
			params: { email: address, code }
		});
	await request();
	const previous = deliveredCode;
	await expect(verify('not-a-code')).rejects.toThrow('Could not verify code');
	await expect(verify(previous, 'someone-else@example.com')).rejects.toThrow(
		'Could not verify code'
	);
	await request();
	await expect(verify(previous)).rejects.toThrow('Could not verify code');
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(Date.now() + 16 * 60 * 1000);
	await expect(verify(deliveredCode)).rejects.toThrow('Could not verify code');
	await expect(t.query(api.players.viewer, {})).rejects.toThrow('Sign in to continue');
});

test('a provider delivery failure does not report a sent code or authenticate the player', async () => {
	const t = convexTest(schema, modules);
	vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
	await expect(
		t.action(api.auth.signIn, {
			provider: 'resend-otp',
			params: { email: 'leo@example.com' }
		})
	).rejects.toThrow('Could not send the sign-in email');
	await expect(t.query(api.players.viewer, {})).rejects.toThrow('Sign in to continue');
});
