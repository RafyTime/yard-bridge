# 02: Sign in with an email code

Type: task
Status: ready-for-agent
Blocked by: 01 (Establish the project foundation)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

A player can request an email code, sign in, and return to a signed-in mobile view later. This proves the SvelteKit and Convex Auth integration before Game behavior depends on it.

## Acceptance criteria

- [ ] A player can request and enter a code, sign out, and return after closing or refreshing the app without signing in again while the session remains valid.
- [ ] Invalid or expired codes fail clearly without granting an authenticated view.
- [ ] A signed-in view reads the player's identity through the authenticated backend boundary; an unsigned player cannot read it.
- [ ] The flow is usable in the target phone browsers and has an automated command-and-view check. Record the integration result before extending auth to Seats.

