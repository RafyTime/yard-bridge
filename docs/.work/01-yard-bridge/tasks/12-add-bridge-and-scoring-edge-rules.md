# 12: Add Bridge and scoring edge rules

Type: task
Status: ready-for-agent
Blocked by: 11 (End and score ordinary Rounds)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Players can end a Round with an enabled Bridge declaration, earn a Jack finish deduction, and see the selected recycle multiplier applied once. A Round also ends cleanly when the whole table has no move.

## Acceptance criteria

- [ ] Four cards of one rank declare Bridge only when enabled; the Round ends and the declarer scores any cards still held.
- [ ] An empty-hand finish deducts 20 per finishing Jack after other score calculations, permits a negative Game score, and gives no deduction to a Bridge declarer who still holds cards.
- [ ] The first recycle applies the selected multiplier of one, two, or three to remaining-hand points; later recycles do not compound it.
- [ ] If no draw or recycle is possible and every active Seat passes once without a legal play, the Round ends, everyone scores cards held, and nobody receives a Jack finish deduction.
- [ ] Tests exercise each ending through public commands and compare the visible score breakdown for every Seat.
