# 11: End and score ordinary Rounds

Type: task
Status: ready-for-agent
Blocked by: 10 (Resolve Ace effects)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

When a player empties their hand, the final card effect resolves, the Round ends, every remaining hand is scored, and the table can continue into the next Round.

## Acceptance criteria

- [ ] Final-card effects resolve before the Round result and cannot be lost or applied twice.
- [ ] Remaining cards use the approved point values, including the Queen of Spades and both King of Spades modes.
- [ ] Every player sees the completed Round's final hands, point calculation, and accumulated Game score while active hands stayed private before the result.
- [ ] The next Round uses the configured starter policy; under the default, ties use previous-Round results and then a random choice.

