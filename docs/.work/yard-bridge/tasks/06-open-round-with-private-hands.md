# 06: Open a Round with private hands

Type: task
Status: ready-for-agent
Blocked by: 05 (Configure rules and ready the table)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Once everyone is ready, the Host can start a Round. Each player sees the common table and only their own dealt hand, and the opening remains intact across reconnection.

## Acceptance criteria

- [ ] The server shuffles one 36-card deck, deals the configured hand size to two to four active Seats, and randomly chooses the first starter.
- [ ] The starter has four cards in hand under the default deal and their fifth dealt card becomes the face-up opening card; the selected opening-effect setting is recorded with the Round.
- [ ] Rules freeze when the first Round starts. Each Seat sees only its own active hand, the shared top card, starter, and current opening state.
- [ ] A reconnect shows the same deck, hands, and opening state. Command-and-view tests use controlled card order and random choice without exposing the real deck to players.

