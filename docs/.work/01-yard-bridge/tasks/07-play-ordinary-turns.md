# 07: Play ordinary turns

Type: task
Status: claimed
Blocked by: 06 (Open a Round with private hands)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Players can take turns playing a card that matches suit or rank, or drawing until they can play. The table stays consistent across reconnects and concurrent submissions.

## Acceptance criteria

- [ ] The active player can play a matching card; other players and illegal moves cannot change the Round.
- [ ] A player without a legal play draws until one appears and must play a newly drawn playable card immediately.
- [ ] When the draw pile empties, played cards below its top card recycle into the draw pile.
- [ ] A stale, repeated, or simultaneous move cannot commit twice; each Seat sees the resulting turn and card counts through authorized views.

## Comments

- 2026-11-12 (owner decisions): One Draw command draws on the server until a playable card appears, recycling the played pile below its top card when needed. The player must then play that drawn card, and only that card. If nothing can be drawn or recycled, the turn passes.
- Possible future rule: a configurable option that lets the newly drawn card be played together with same-rank cards from hand as an ordered group. For now the drawn card is played alone.
- The UI scope is a minimal playable table in `game-round.svelte` with EN/UK messages and one browser flow.
