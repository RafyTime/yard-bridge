# 08: Play wild cards and ordered groups

Type: task
Status: resolved
Blocked by: 07 (Play ordinary turns)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Players can place a 6 or Jack regardless of the top card, cover a 6 before passing, choose a suit after a Jack, and order same-rank cards in one play.

## Acceptance criteria

- [x] A 6 or Jack can be played outside ordinary suit-or-rank matching; a Jack establishes the active suit shown to every player.
- [x] A 6 requires a valid cover before play passes, including chained 6s. A player cannot end on an uncovered 6; an impossible cover is waived when no card can be drawn or recycled.
- [x] A player can arrange a same-rank group before committing it, and the last card placed is the top card used for later effects.
- [x] Opening 6 and Jack states follow the chosen opening-effect rule, with command-and-view tests for each Seat.

## Answer

A 6 or Jack can now be played on any top card. The Play command takes an ordered same-rank
group, placed first to last. Only the first card has to match the table, and the last card
becomes the top card. When a Jack ends the play, the command must include the chosen suit,
and every Seat sees that active suit. A newly drawn card is still played alone.

A 6 on top keeps the turn with the same Seat until it is covered. The Round records this in
`mustCover`, and every view shows it. A cover must match the 6's suit or be another 6, and
another 6 continues the obligation. A Jack of a different suit cannot cover, because the
spec allows only the suit or another 6. A Seat without a cover uses Draw, which continues
until a cover appears. A drawn 6 must be played, and then it needs its own cover. If
nothing can be drawn or recycled, the cover is waived and the turn passes.

An opening 6 starts the Round with the starter's cover obligation already set. Their first
Play or Draw resolves the opening. After an opening Jack, the starter uses a new
version-checked `chooseSuit` command, and play then passes to the next Seat. Opening
7, 8, Ace, Q♠ and K♠ effects still block Play and Draw until tickets 09 and 10.

Command-and-view tests script the deal. They check every Seat's view of wild plays and
the Jack suit, a group with its last card on top, rejected groups, chained 6 covers, a
Jack refused as a cover, an opening 6 covered through Draw, a waived cover on an empty
deck, a drawn card played alone, a drawn 6 that needs a cover, and the opening Jack suit
choice. In the table UI, a player taps cards to arrange a group, sees the group in order,
picks a suit when a Jack ends the play, and gets a cover prompt. The browser flow plays a
two-card group, a 6 with its cover, and a Jack with a chosen suit. English and Ukrainian
phone screenshots were inspected at 390px and 320px.

See the [map's Decisions-so-far](../yard-bridge-map.md#decisions-so-far).

Verification: `PUBLIC_CONVEX_URL=https://ci.invalid RUN_CONVEX_SMOKE=0 bun run quality`
on 12 November 2026. Formatting, linting, and type checks passed, and 47 unit tests
passed. In the browser suite, 40 tests passed and 1 was skipped. The two iPhone WebKit
focus checks that already failed before this ticket still fail, in the sign-in and
rules-drawer tests. No deployment or shared channel was changed.

## Comments

- 2026-11-12 (owner decision): A newly drawn playable card is played alone, never as part of an ordered same-rank group. A future configurable rule may allow grouping it with same-rank cards from hand.
- The UI scope is a minimal playable table with EN/UK messages and one browser flow.
