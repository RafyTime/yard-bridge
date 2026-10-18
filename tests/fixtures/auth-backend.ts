import type { BrowserContext } from '@playwright/test';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import type { Value } from 'convex/values';
import { exportPKCS8, generateKeyPair, jwtVerify } from 'jose';
import schema from '../../src/convex/schema';

// Exercise the real browser adapter and public backend functions without a hosted deployment.
// Only the Convex wire transport and Resend delivery are replaced.
export async function authBackend(context: BrowserContext) {
	const keys = await generateKeyPair('RS256', { extractable: true });
	const issuer = 'https://auth-test.convex.site';
	const environment = {
		JWT_PRIVATE_KEY: await exportPKCS8(keys.privateKey),
		CONVEX_SITE_URL: issuer,
		SITE_URL: 'http://localhost:4173',
		AUTH_RESEND_KEY: 'test-key',
		AUTH_EMAIL_FROM: 'Yard Bridge <signin@example.com>'
	};
	const previousEnvironment = Object.fromEntries(
		Object.keys(environment).map((key) => [key, process.env[key]])
	);
	Object.assign(process.env, environment);
	const backend = convexTest(schema, {
		'./_generated/server.js': () => import('../../src/convex/_generated/server.js'),
		'./auth.ts': () => import('../../src/convex/auth'),
		'./players.ts': () => import('../../src/convex/players')
	});
	let code = '';
	let deliveryFails = false;
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (input, init) => {
		if (String(input) !== 'https://api.resend.com/emails') return originalFetch(input, init);
		if (deliveryFails) return new Response(null, { status: 503 });
		const email: { text: string } = JSON.parse(String(init?.body));
		code = email.text.match(/\b\d{8}\b/)![0];
		return Response.json({ id: 'test-email' });
	};

	await context.routeWebSocket(/\/api\/.*\/sync/, (socket) => {
		let identity: { subject: string; issuer: string } | null = null;
		let version = { querySet: 0, identity: 0, ts: 'AAAAAAAAAAA=' };
		let clock = 0n;
		const queries = new Map<number, string>();
		const session = () => (identity ? backend.withIdentity(identity) : backend);
		async function transition(querySet = version.querySet, identityVersion = version.identity) {
			const modifications = await Promise.all(
				[...queries].map(async ([queryId, path]) => {
					try {
						const value = await session().query(makeFunctionReference<'query'>(path), {});
						return { type: 'QueryUpdated', queryId, value, logLines: [], journal: null };
					} catch {
						return {
							type: 'QueryFailed',
							queryId,
							errorMessage: 'Sign in to continue',
							errorData: 'Sign in to continue',
							logLines: [],
							journal: null
						};
					}
				})
			);
			const bytes = Buffer.alloc(8);
			bytes.writeBigUInt64LE(++clock);
			const endVersion = { querySet, identity: identityVersion, ts: bytes.toString('base64') };
			socket.send(
				JSON.stringify({ type: 'Transition', startVersion: version, endVersion, modifications })
			);
			version = endVersion;
		}
		// Serialize messages so auth acknowledgment and query versions retain wire order.
		let work = Promise.resolve();
		socket.onMessage((raw) => {
			work = work
				.then(async () => {
					const message: ClientMessage = JSON.parse(String(raw));
					if (message.type === 'Authenticate') {
						identity = null;
						if (message.tokenType === 'User') {
							const { payload } = await jwtVerify(message.value, keys.publicKey, {
								issuer,
								audience: 'convex'
							});
							identity = { subject: payload.sub!, issuer };
						}
						await transition(version.querySet, message.baseVersion + 1);
					} else if (message.type === 'ModifyQuerySet') {
						for (const modification of message.modifications) {
							if (modification.type === 'Add')
								queries.set(modification.queryId, modification.udfPath);
							else queries.delete(modification.queryId);
						}
						await transition(message.newVersion);
					} else if (message.type === 'Action') {
						try {
							const result = await session().action(
								makeFunctionReference<'action'>(message.udfPath),
								message.args[0]
							);
							socket.send(
								JSON.stringify({
									type: 'ActionResponse',
									requestId: message.requestId,
									success: true,
									result,
									logLines: []
								})
							);
						} catch {
							socket.send(
								JSON.stringify({
									type: 'ActionResponse',
									requestId: message.requestId,
									success: false,
									result: 'Could not complete sign-in',
									logLines: []
								})
							);
						}
					}
				})
				.catch((error) => socket.close({ code: 1011, reason: String(error) }));
		});
	});
	return {
		get code() {
			return code;
		},
		failDelivery() {
			deliveryFails = true;
		},
		restore() {
			globalThis.fetch = originalFetch;
			for (const [key, value] of Object.entries(previousEnvironment)) {
				if (value === undefined) delete process.env[key];
				else process.env[key] = value;
			}
		}
	};
}

type ClientMessage =
	| { type: 'Connect' | 'Event' }
	| { type: 'Authenticate'; tokenType: 'User'; value: string; baseVersion: number }
	| { type: 'Authenticate'; tokenType: 'None'; baseVersion: number }
	| {
			type: 'ModifyQuerySet';
			newVersion: number;
			modifications: Array<
				{ type: 'Add'; queryId: number; udfPath: string } | { type: 'Remove'; queryId: number }
			>;
	  }
	| { type: 'Action'; requestId: number; udfPath: string; args: [Record<string, Value>] };
