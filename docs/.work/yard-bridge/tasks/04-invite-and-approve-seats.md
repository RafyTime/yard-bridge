# 04: Invite and approve Seats

Type: task
Status: ready-for-agent
Blocked by: 03 (Create and resume a Game)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

The Host can invite people to a private Game, approve each new Seat once, and welcome returning players without another approval. The lobby supports two to four players.

## Acceptance criteria

- [ ] An invitee can open an invitation and request a Seat; only the Host can approve or reject that request.
- [ ] An approved player returns to the same Seat after signing in again, and duplicate or excess Seats cannot enter the Game.
- [ ] Invitation possession alone does not authorize private Game or Seat data.
- [ ] The lobby works for two, three, and four Seats, with command-and-view tests for approval and access boundaries.

