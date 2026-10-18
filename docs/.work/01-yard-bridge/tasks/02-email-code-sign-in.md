# 02: Sign in with an email code

Type: task
Status: resolved
Blocked by: 01 (Establish the project foundation)
Spec: [Approved Yard Bridge spec](../yard-bridge-spec.md)

## What to build

A player can request an email code, sign in, and return to a signed-in mobile view later. This proves the SvelteKit and Convex Auth integration before Game behavior depends on it.

## Acceptance criteria

- [x] A player can request and enter a code, sign out, and return after closing or refreshing the app without signing in again while the session remains valid.
- [x] Invalid or expired codes fail clearly without granting an authenticated view.
- [x] A signed-in view reads the player's identity through the authenticated backend boundary; an unsigned player cannot read it.
- [x] The flow is usable in the target phone browsers and has an automated command-and-view check. Record the integration result before extending auth to Seats.

## Integration result

Implemented locally on 18 October 2026. Convex Auth 0.0.96 and the client-only
Svelte adapter 0.1.4 work with the static SvelteKit 3 build in isolated tests.
The adapter has outdated peer ranges; it stays pinned. Owner verification below
confirms hosted operation.

- The public auth command and protected identity query tests verify signed JWTs,
  separate players, unsigned access rejection, wrong/expired/replaced/reused codes,
  wrong-email rejection, refresh, sign-out revocation, and delivery failure.
- Eight browser checks pass in desktop Chromium, Pixel emulation, Firefox, and
  iPhone WebKit emulation. They use the real adapter and public backend functions
  with in-memory Convex transport and stubbed email delivery. They cover code
  requests, invalid-code feedback, resend, sign-in, reload and tab reopening,
  sign-out persistence, delivery failure, and narrow English/Ukrainian layouts.
- The unsigned and revoked-session cases never receive a player identity. The
  signed-in heading waits for the protected backend query, not just a stored token.
- Separate Standards and Spec reviews found no actionable implementation issues.
- `bun run quality` passed with `PUBLIC_CONVEX_URL=https://ci.invalid` and
  `RUN_CONVEX_SMOKE=0`: formatting, lint, frontend/backend/worker typechecks, seven
  unit/component/backend tests, static build, and ten browser checks. The live
  counter check was skipped. Auth key-generation output format was also verified
  without displaying or persisting its private key.

## Owner verification

On 18 October 2026, the owner confirmed all remaining checks passed:

- Configured Resend delivery, signing keys, and `SITE_URL` on the development
  Convex deployment and synced the backend.
- Received a real sign-in code and signed in. An initial request failure was
  resolved by adding the missing URL scheme to `SITE_URL`.
- Verified session persistence after refresh and closing/reopening, sign-out
  persistence, and rejection of incorrect and expired codes.
- Verified the hosted flow in the target Pixel and iPhone browsers, including
  installed PWA mode.

These are owner-reported results, supplementing the automated checks above.
Resend currently uses `onboarding@resend.dev` and delivers only to the account
email. A verified sender domain remains deferred until other players need codes;
it is a release provisioning requirement, not an open integration check here.

## Answer

The SvelteKit, Convex Auth, and Resend email-code integration is verified and this
task is resolved. Authentication can now be used by the Game and Seat tasks.

## Comments

- The user authorized implementation while independently setting up Resend.
- During implementation, no production or shared testing-channel deployment,
  commit, push, or PR was made. The owner subsequently synced the development
  backend and verified the hosted app.
- The owner confirmed all verification passed and requested closure on 18 October 2026.
