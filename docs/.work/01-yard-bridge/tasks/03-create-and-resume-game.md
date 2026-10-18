# 03: Create and resume a Game

Type: task
Status: ready-for-agent
Blocked by: 02 (Sign in with an email code)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

A signed-in player can create a named private Game, become its Host, see it among unfinished Games, and reopen the same Seat on another device.

## Acceptance criteria

- [ ] Creating a Game gives its creator the Host Seat and persists its name, default Rules configuration, and unfinished status.
- [ ] The player's Game list shows multiple unfinished Games and reopens the selected one after a new session or device sign-in.
- [ ] Another identity cannot claim the Host Seat or read private Game data.
- [ ] Public command-and-view tests cover create, list, and resume behavior.
