# 03: Games home and the way back

Type: task
Status: resolved
Blocked by: 01
Spec: [UI polish spec](../spec.md)

## What to build

The Games screen becomes a proper home: a prominent New game action and a card
per Game showing its name, lobby/active status, and a mock seat count. Inside a Game, a conspicuous
back control ("← Your games") sits beside the Game title, so the player can always
return to their Games.

## Acceptance criteria

- [ ] New game is the most prominent action on the Games screen; creating a Game works as before.
- [ ] Each Game card shows its name and a lobby or active status from the Games list.
- [ ] Each card shows a mock seat count derived from the Game id, stable across reloads, kept in one helper beside the mock identities. No backend change.
- [ ] The empty, loading, and error states remain clear.
- [ ] Inside a Game, a back control with an arrow and "Your games" label is clearly visible next to the Game heading and returns to the Games screen.
- [ ] Opening Games, reloading, and returning to the same Seat still work; the multiple-Games browser test passes with updated selectors.
- [ ] New copy exists in en, es, and uk and fits a narrow phone.

## Answer

Done in `16a62fc`. New game is a full-width primary action at the top. Each Game card shows its name, a lobby/active badge and `mockSeatCount(gameId)` from `src/lib/mocks/players.ts`, and links to the Game. Inside a Game, a "← Your games" link sits directly above the title. It isn't in the app bar, because the space beside the centred wordmark is too narrow for the es/uk labels.
