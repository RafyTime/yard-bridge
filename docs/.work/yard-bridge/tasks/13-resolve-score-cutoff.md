# 13: Resolve the Score cutoff

Type: task
Status: ready-for-agent
Blocked by: 12 (Add Bridge and scoring edge rules)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

After scoring a Round, the Game applies its cutoff, gives the remaining group a continuation choice when appropriate, and shows a final ranking when play ends.

## Acceptance criteria

- [ ] An exact cutoff hit resets that player's score to zero; crossing the cutoff triggers loss. The cutoff and King of Spades toggle stay independent.
- [ ] In group play, remaining active players see and vote on continuing after a loss. Continuation requires unanimity; one active survivor ends the Game.
- [ ] Continuing players outrank Eliminated players, later eliminations outrank earlier ones, points order players within an elimination wave, and tied scores share rank.
- [ ] If all active players cross together, the Game ends and ranks them by score. Tests cover two-player endings and simultaneous group losses.

