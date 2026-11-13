# 07: Play ordinary turns

Type: task
Status: resolved
Blocked by: 06 (Open a Round with private hands)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Players can take turns playing a card that matches suit or rank, or drawing until they can play. The table stays consistent across reconnects and concurrent submissions.

## Acceptance criteria

- [x] The active player can play a matching card; other players and illegal moves cannot change the Round.
- [x] A player without a legal play draws until one appears and must play a newly drawn playable card immediately.
- [x] When the draw pile empties, played cards below its top card recycle into the draw pile.
- [x] A stale, repeated, or simultaneous move cannot commit twice; each Seat sees the resulting turn and card counts through authorized views.

## Answer

The current Seat plays a card that matches the active suit or the top card's rank
through an authenticated, version-checked command. A Seat without a match uses one
Draw command. The server draws in deck order until a playable card appears, and the
player must then play that drawn card alone. When the draw pile runs out, the played
cards below the top card are shuffled back into it. If nothing can be drawn or
recycled, the turn passes. Drawn cards stay in the hand.

Each Round now stores a turn version, the pending drawn card, and its recycle count.
Every accepted move increments the version, and each command carries the version the
player saw. A stale, repeated, or simultaneous move is rejected and cannot commit
twice. Pending opening obligations and effects block ordinary moves with a clear
error until tickets 08 to 10 resolve them. Authorized views show the turn version,
the viewer's playable cards and Draw option, the drawn card only to its holder, and
updated turn and card counts for every Seat.

Public command-and-view tests script the server's shuffle and starter choice. They
cover matching plays and turn advance, another Seat's turn, unmatched and missing
cards, outsiders, Draw while holding a match, stale and simultaneous moves, drawing
until a match, the forced drawn-card play, passing on an empty draw pile, recycling
below the top card, and blocking pending openings. The browser flow scripts the
deal, draws and plays the drawn card across a reload, then shows the Host's next
move. English and Ukrainian phone screenshots were inspected at 390px and 320px.

See the [map's Decisions-so-far](../yard-bridge-map.md#decisions-so-far).

Verification: `PUBLIC_CONVEX_URL=https://ci.invalid RUN_CONVEX_SMOKE=0 bun run quality`
on 12 November 2026. Formatting, linting, and type checks passed, and 41 unit tests
passed. In the browser suite, 36 tests passed and 1 was skipped. The new turn flow
passed on Chromium, Pixel Chrome, Firefox, and iPhone WebKit. Two iPhone WebKit focus
checks failed, in the sign-in and rules-drawer tests. They fail the same way on the
integration base `006b84e`, so this ticket did not cause them. The command therefore
exits non-zero until they are fixed. No deployment or shared channel was changed.

## Comments

- 2026-11-12 (owner decisions): One Draw command draws on the server until a playable card appears, recycling the played pile below its top card when needed. The player must then play that drawn card, and only that card. If nothing can be drawn or recycled, the turn passes.
- Possible future rule: a configurable option that lets the newly drawn card be played together with same-rank cards from hand as an ordered group. For now the drawn card is played alone.
- The UI scope is a minimal playable table in `game-round.svelte` with EN/UK messages and one browser flow.
