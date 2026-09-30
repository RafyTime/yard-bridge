# 14: Handle Host interventions

Type: task
Status: ready-for-agent
Blocked by: 04 (Invite and approve Seats), 11 (End and score ordinary Rounds)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

The Host can stop the current Round and remove a player when real life interrupts the table. The group can also abandon an unfinished Game by unanimous choice.

## Acceptance criteria

- [ ] Only the Host can stop a Round or remove a player; the stopped Round adds no points and prior Game scores remain.
- [ ] History identifies administrative removal separately from a score loss. A sole remaining player wins by forfeit.
- [ ] If the Host leaves, Host control passes to the longest-seated remaining player.
- [ ] Unanimous abandonment ends an unfinished Game without presenting it as a scored win. Tests cover unauthorized attempts and reconnection after intervention.
