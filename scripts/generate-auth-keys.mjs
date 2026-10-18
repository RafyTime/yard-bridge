import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

// Redirect stdout to an ignored local file. These values belong on the Convex backend.
const keys = await generateKeyPair('RS256', { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
console.log(`JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, ' ')}"`);
console.log(`JWKS=${JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] })}`);
