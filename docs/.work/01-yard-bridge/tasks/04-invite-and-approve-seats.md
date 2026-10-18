# 04: Invite and approve Seats

Type: task
Status: resolved
Blocked by: 03 (Create and resume a Game)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

The Host can invite people to a private Game, approve each new Seat once, and welcome returning players without another approval. The lobby supports two to four players.

## Acceptance criteria

- [x] An invitee can open an invitation and request a Seat; only the Host can approve or reject that request.
- [x] An approved player returns to the same Seat after signing in again, and duplicate or excess Seats cannot enter the Game.
- [x] Invitation possession alone does not authorize private Game or Seat data.
- [x] The lobby works for two, three, and four Seats, with command-and-view tests for approval and access boundaries.

## Answer

The Host shares an opaque invitation link. Signed-in invitees see only the Game
name and their own request status until the Host approves a Seat. Only the Host
can inspect pending request emails or approve and reject requests. Approval
atomically caps the table at four Seats; repeated requests preserve the existing
request or approved Seat. Returning sessions recover that same approved Seat.
The lobby and invitation flow have English and Ukrainian copy.

Public command-and-view tests cover approval, rejection, private access, duplicate
requests, two-to-four-player lobbies, excess Seats, and recovery in another session.
The browser flow checks invitation entry, approval, sign-in return, and phone-width
layout in desktop Chromium, Pixel Chrome, Firefox, and iPhone WebKit. Approval
screenshots were inspected for visual layout.

See the [map's Decisions-so-far](../yard-bridge-map.md#decisions-so-far).

Verification: `PUBLIC_CONVEX_URL=https://isolated-test.convex.cloud RUN_CONVEX_SMOKE=0 bun run quality`
passed on 18 October 2026. Ten unit tests and 18 browser tests passed; the hosted
Convex connection smoke test was intentionally skipped. No deployment or shared
channel was changed.
