# 10: Resolve Ace effects

Type: task
Status: ready-for-agent
Blocked by: 09 (Resolve draw-card effects)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

An Ace skips the next player by default. Under the alternative rule, a targeted player can play an Ace immediately to cancel one whole incoming draw or skip effect.

## Acceptance criteria

- [ ] The default Ace skips exactly the next active Seat, including when played as an opening effect.
- [ ] With the alternative rule enabled, a targeted player can use an Ace from hand to cancel an entire pending effect, including a stacked 7 or 8.
- [ ] A cancellation places the Ace on top, uses that player's turn, and passes play onward. A player who is not targeted cannot use the reaction.
- [ ] Command-and-view tests cover both Ace modes with two and four players.
