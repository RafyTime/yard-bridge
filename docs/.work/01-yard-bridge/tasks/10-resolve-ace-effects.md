# 10: Resolve Ace effects

Type: task
Status: ready-for-agent
Blocked by: 09 (Resolve draw-card effects), 20 (Record moves and show recent play)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

An Ace skips the next player by default. Under the alternative rule, a targeted player can play an Ace immediately to cancel one whole incoming draw or skip effect.

## Acceptance criteria

- [ ] The default Ace skips exactly the next active Seat, including when played as an opening effect.
- [ ] With the alternative rule enabled, a targeted player can use an Ace from hand to cancel an entire pending effect, including a stacked 7 or 8.
- [ ] A cancellation places the Ace on top, uses that player's turn, and passes play onward. A player who is not targeted cannot use the reaction.
- [ ] Command-and-view tests cover both Ace modes with two and four players.

## Comments

- 2026-11-13 (from ticket 09 review): An opening Ace with opening effects on already records a pending zero-draw skip on the next Seat, and `accept` resolves it as a plain skip (the default Ace rule). The browser table shows the target a "miss this turn" prompt with an Accept control. Played-Ace effects and the alternative cancellation rule are still this ticket's work.
