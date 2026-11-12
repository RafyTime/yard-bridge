# 08: Play wild cards and ordered groups

Type: task
Status: claimed
Blocked by: 07 (Play ordinary turns)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Players can place a 6 or Jack regardless of the top card, cover a 6 before passing, choose a suit after a Jack, and order same-rank cards in one play.

## Acceptance criteria

- [ ] A 6 or Jack can be played outside ordinary suit-or-rank matching; a Jack establishes the active suit shown to every player.
- [ ] A 6 requires a valid cover before play passes, including chained 6s. A player cannot end on an uncovered 6; an impossible cover is waived when no card can be drawn or recycled.
- [ ] A player can arrange a same-rank group before committing it, and the last card placed is the top card used for later effects.
- [ ] Opening 6 and Jack states follow the chosen opening-effect rule, with command-and-view tests for each Seat.

## Comments

- 2026-11-12 (owner decision): A newly drawn playable card is played alone, never as part of an ordered same-rank group. A future configurable rule may allow grouping it with same-rank cards from hand.
- The UI scope is a minimal playable table with EN/UK messages and one browser flow.
