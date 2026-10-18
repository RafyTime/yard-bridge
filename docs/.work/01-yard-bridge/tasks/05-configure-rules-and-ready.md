# 05: Configure rules and ready the table

Type: task
Status: resolved
Blocked by: 04 (Invite and approve Seats)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

The Host can use default rules or save and reuse a Rules configuration. Invited players can review the core rules and deviations, then mark ready before the first Round.

## Acceptance criteria

- [x] Only the Host can edit pre-game rules; core settings remain visible and detailed settings can expand.
- [x] The Host can save a configuration and select it for a later Game without changing the original Game.
- [x] Every approved player sees the base rules and changed values, can mark ready, and loses ready status after a Host edit.
- [x] The Game cannot be marked ready to start while an approved player has not reviewed the latest rules. Tests check Host-only editing and readiness reset.

## Answer

The Host edits the Score cutoff, King of Spades, and hand size directly, with
expandable advanced settings. Every approved player can inspect the current
settings, defaults, deviations, and base rules in English or Ukrainian. Rule
updates clear all Seat readiness in the same mutation. Readiness and edits check
the Game version so an old review cannot acknowledge new rules. The table is
ready to start only with two to four approved, ready Seats.

Saved configurations are private snapshots owned by the Host. Applying one copies
its values into the selected Game and clears readiness, without changing the
saved configuration or source Game. Hand size accepts two to nine cards so the
36-card deck can support four players; the Score cutoff is a positive safe integer.

Authenticated public command-and-view tests cover Host-only edits and saves,
private configuration lists, snapshot reuse, stale reviews and edits, readiness
reset, and the two-player minimum. Browser checks cover invited-player readiness,
Host edits, advanced rules, saved configuration reuse, and phone layouts in both
languages. English and Ukrainian phone screenshots were inspected.

See the [map's Decisions-so-far](../yard-bridge-map.md#decisions-so-far).

Verification: `PUBLIC_CONVEX_URL=https://unused.convex.cloud RUN_CONVEX_SMOKE=0 bun run quality`
passed on 18 October 2026. Twelve unit tests and 22 browser tests passed across
Chromium, Pixel Chrome, Firefox, and iPhone WebKit. The hosted Convex smoke test
was intentionally skipped. No deployment or shared channel was changed.
