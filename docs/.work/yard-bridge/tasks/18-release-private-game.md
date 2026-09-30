# 18: Release the private Game

Type: task
Status: ready-for-agent
Blocked by: 15 (Export and restore Games), 17 (Complete English and Ukrainian UI)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

The couple can open the Railway-provided URL, sign in by email code, install the PWA, play a private Game, and resume it later with recoverable history.

## Acceptance criteria

- [ ] The production Railway app and Ireland-region Convex deployment use the reviewed configuration and keep credentials out of source control.
- [ ] The selected sender domain is verified, Resend delivers real sign-in codes to the players, and the owner has domain auto-renew and account recovery configured.
- [ ] Two-player and four-player smoke Games work across Pixel Chrome or Firefox-family browsers, iPhone Safari or Chrome, and desktop web.
- [ ] Cold-start recovery, reconnection, private hands, stale-command handling, English and Ukrainian, and offline read-only behavior pass final checks.
- [ ] A recent export can be restored in a test deployment before the surprise launch.
