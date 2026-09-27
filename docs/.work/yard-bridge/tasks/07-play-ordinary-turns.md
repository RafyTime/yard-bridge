# 07: Play ordinary turns

Type: task
Status: ready-for-agent
Blocked by: 06 (Open a Round with private hands)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Players can take turns playing a card that matches suit or rank, or drawing until they can play. The table stays consistent across reconnects and concurrent submissions.

## Acceptance criteria

- [ ] The active player can play a matching card; other players and illegal moves cannot change the Round.
- [ ] A player without a legal play draws until one appears and must play a newly drawn playable card immediately.
- [ ] When the draw pile empties, played cards below its top card recycle into the draw pile.
- [ ] A stale, repeated, or simultaneous move cannot commit twice; each Seat sees the resulting turn and card counts through authorized views.

