# Yard Bridge

Yard Bridge is the local shedding card game this project aims to let friends play remotely. The couple's remembered variant is the starting point for its rules.

## Language

**Game**:
A continuing contest made up of rounds whose scores carry forward until play ends with a final winner or ranking. In a group game, some players may leave after losing while the others continue.

**Match**:
Another name for a game.

**Round**:
One deal of cards, ending when a player goes out or another selected ending condition occurs.

**Round event**:
The saved public record of one accepted move in a round, which every Seat sees the same way. Drawn cards and hands never appear in it. See [ADR 0002](docs/adr/0002-round-events.md).

**Batch**:
An ordered group of cards played together as one move.

**Bridge declaration**:
Ending a Round by finishing a batch with all four cards of an eligible rank, even if the declaring player still holds other cards.

**Penalty points**:
The net points assigned to a player's game score at the end of a round. A finish bonus can make that round's net points negative. The accumulated score helps determine losses and ranking.

**Pending effect**:
The draw or skip from a played or opening special card, waiting on the next Seat. That player must resolve it before doing anything else: they accept it, or, under the cancellation Ace rule, cancel it with an Ace. It never carries into a later turn.

**Rules configuration**:
The selected values and optional rules that govern one game. A saved configuration can be reused for another game.

**Host**:
The player with authority to invite players, approve seats, and choose rules before the game starts. The creator holds this role first, but it can pass to another player.

**Seat**:
A player's place in a game, approved by the host and retained when that player reconnects.

**Score cutoff**:
The point total a player may reach exactly to reset their score; crossing it triggers the game's loss rule.

**Eliminated player**:
A player who crossed the score cutoff and left active play after the remaining players chose to continue the game.
