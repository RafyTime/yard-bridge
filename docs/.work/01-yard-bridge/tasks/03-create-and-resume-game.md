# 03: Create and resume a Game

Type: task
Status: resolved
Blocked by: 02 (Sign in with an email code)
Spec: [Approved Yard Bridge spec](../yard-bridge-spec.md)

## What to build

A signed-in player can create a named private Game, become its Host, see it among unfinished Games, and reopen the same Seat on another device.

## Acceptance criteria

- [x] Creating a Game gives its creator the Host Seat and persists its name, default Rules configuration, and unfinished status.
- [x] The player's Game list shows multiple unfinished Games and reopens the selected one after a new session or device sign-in.
- [x] Another identity cannot claim the Host Seat or read private Game data.
- [x] Public command-and-view tests cover create, list, and resume behavior.

## Answer

Authenticated players can create named private Games, list their unfinished tables,
and reopen their approved Host Seat after another session signs in. Games persist
the default Rules configuration, lobby status, version, and approved Seats.
The English and Ukrainian UI supports creation and a reusable game URL.

Public command-and-view tests verify persistence across sessions and reject another
identity's access. Browser tests exercise creation, multiple Games, and resuming
after reload on the configured desktop and phone browsers.

See the [map's Decisions-so-far](../yard-bridge-map.md#decisions-so-far).

Verification: `PUBLIC_CONVEX_URL=https://ci.invalid RUN_CONVEX_SMOKE=0 bun run quality` passed on 18 October 2026. Eight unit tests and 14 browser tests passed; the hosted Convex connection smoke test was intentionally skipped. No deployment or shared channel was changed.
