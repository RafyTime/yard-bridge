# 09: Resolve draw-card effects

Type: task
Status: ready-for-agent
Blocked by: 08 (Play wild cards and ordered groups)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Playing a 7, 8, Queen of Spades, or enabled King of Spades applies its draw and skip effect to the next active player, including same-rank 7 and 8 stacks.

## Acceptance criteria

- [ ] A 7 draws one then allows play; an 8 draws two and skips; the Queen of Spades draws five; enabled King of Spades draws seven without skipping.
- [ ] Same-rank 7s and 8s in one ordered play add their draw amounts. Other same-rank plays fire only the top card's special effect.
- [ ] Effects target the next active Seat around a two-, three-, or four-player table and do not carry into a later turn.
- [ ] An opening 7, 8, Queen of Spades, or enabled King of Spades fires or remains inert according to the frozen Rules configuration; tests cover both settings and the King toggle.
