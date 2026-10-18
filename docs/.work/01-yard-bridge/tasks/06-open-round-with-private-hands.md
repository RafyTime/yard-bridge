# 06: Open a Round with private hands

Type: task
Status: resolved
Blocked by: 05 (Configure rules and ready the table)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Once everyone is ready, the Host can start a Round. Each player sees the common table and only their own dealt hand, and the opening remains intact across reconnection.

## Acceptance criteria

- [x] The server shuffles one 36-card deck, deals the configured hand size to two to four active Seats, and randomly chooses the first starter.
- [x] The starter has four cards in hand under the default deal and their fifth dealt card becomes the face-up opening card; the selected opening-effect setting is recorded with the Round.
- [x] Rules freeze when the first Round starts. Each Seat sees only its own active hand, the shared top card, starter, and current opening state.
- [x] A reconnect shows the same deck, hands, and opening state. Command-and-view tests use controlled card order and random choice without exposing the real deck to players.

## Answer

The Host starts the first Round through an authenticated, version-checked command
after two to four approved Seats review the current rules. The server shuffles
the 36-card deck, chooses the starter, deals in table order, and places the
starter's last dealt card face up. Under the default deal, the starter holds four
cards and each other player holds five.

The Round stores its rules snapshot, deck, played pile, starter, current player,
active suit, and pending opening obligations or effects. Turn commands in later
tickets will resolve those pending states. Hands are stored separately, and the
authorized Round query returns only the viewer's hand and shared table data.
Starting freezes rule edits and persists the complete opening for reconnection.

Public command-and-view tests cover controlled deals, two-to-four-player tables,
configured hand sizes, opening Jack and 6 obligations, a draw effect, disabled
opening effects, private access, stale starts, readiness, rules locking, duplicate
starts, and return in a new session. The browser flow starts the Round and
compares the player's cards after reload. English and Ukrainian active-table
phone screenshots were inspected at 390px and 320px widths.

See the [map's Decisions-so-far](../yard-bridge-map.md#decisions-so-far).

Verification: `PUBLIC_CONVEX_URL=https://unused.convex.cloud RUN_CONVEX_SMOKE=0 bun run quality`
passed on 18 October 2026. Twenty unit tests and 22 browser tests passed across
Chromium, Pixel Chrome, Firefox, and iPhone WebKit. The hosted Convex smoke test
was intentionally skipped. No deployment or shared channel was changed.
