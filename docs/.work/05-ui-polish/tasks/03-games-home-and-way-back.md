# 03: Games home and the way back

Type: task
Status: ready-for-agent
Blocked by: 01
Spec: [UI polish spec](../spec.md)

## What to build

The Games screen becomes a proper home: a prominent New game action and a card
per Game showing its name and lobby/active status. Inside a Game, a conspicuous
back control ("← Your games") sits beside the Game title, so the player can always
return to their Games.

## Acceptance criteria

- [ ] New game is the most prominent action on the Games screen; creating a Game works as before.
- [ ] Each Game card shows its name and a lobby or active status using only data the Games list already returns.
- [ ] The empty, loading, and error states remain clear.
- [ ] Inside a Game, a back control with an arrow and "Your games" label is clearly visible next to the Game heading and returns to the Games screen.
- [ ] Opening Games, reloading, and returning to the same Seat still work; the multiple-Games browser test passes with updated selectors.
- [ ] New copy exists in en, es, and uk and fits a narrow phone.
