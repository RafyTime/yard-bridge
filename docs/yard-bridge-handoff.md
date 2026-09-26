# Handoff: two-player yard Bridge game, rules and planning

## Next session

Run a grilling session to pressure-test the plan for a private web app that lets
two people play their familiar card game remotely. Do not start implementation
until the user chooses to move beyond planning. The user prefers short, direct answers.

## Game identity and evidence

The game is likely the Odessa/local game called "дворовый бридж" (yard/street Bridge). It is related to 101/Pharaoh/Mau-Mau style shedding games, and is not contract bridge. There is no single authoritative ruleset for the local game; variants differ substantially.

Firsthand and close-match sources:

- Odessa players describing local Bridge, Jack finishing bonus, Queen of Spades draw/penalty, and varying scores: <https://forumodua.com/showthread.php?t=16194>
- Ukrainian yard Bridge ruleset matching 7, 8, Jack and exact-score reset: <https://sovet.kidstaff.com.ua/question-184470>
- Broader account of 101/Bridge variants, deck recycling, scoring and special cards: <https://lurkmore.media/%D0%94%D1%83%D1%80%D0%B0%D0%BA>

Treat these as leads, not as overrides of the user's memories.

## Agreed rules / remembered gameplay

- Two-player shedding game. Use a 36-card deck, ranks 6 through Ace in four suits.
- Match the current top card by suit or rank. A player may lay multiple cards of the same rank in one turn.
- If unable to play, draw until able to play. A played 6 must be covered by another card; draw until able to cover it.
- 7: opponent draws one card, then continues their turn.
- 8: opponent draws two cards and misses their turn.
- Jack: changes the active suit. Winning a round by playing Jack(s) earns minus 20 points per Jack, so two Jacks earn minus 40. There may also be an alternative way to penalize the opponent on a Jack finish, but the amount/form is unknown.
- Queen of Spades makes the opponent draw five cards. Keeping it at the end of a lost round causes a large point penalty, amount unknown.
- Two modes are chosen before a match: Queen and King. In Queen mode, the King of Spades has no special action. In King mode, the Queen of Spades still has its action, and the King of Spades makes the opponent draw more cards than the Queen. Its exact draw count and retained-card penalty are unknown.
- If multiple same-rank cards are played, a special card covered by another card in that group loses its action. The user remembers this rule but is open to making it configurable. Distinguish this from the stacking minus-20 Jack finish bonus.
- When the draw pile runs out, reshuffle the played pile except its top card into a new draw pile. The user remembers the losing player's points being doubled after this happens; the exact trigger/stacking can be configured.
- A round ends when one player has no cards. The other player receives penalty points for cards left in hand. Scores persist across rounds. Exceeding the selected mode's limit loses the match; landing exactly on the limit may reset the player's score to zero.

## Open rules to resolve in the grilling session

- Exact score limit for each mode. User recalls roughly 200 for Queen mode and higher for King mode, but published local examples use 125 or 150.
- Card point values, especially low ranks, Ace, Jack, and the Queen/King of Spades retained-card penalties.
- King of Spades draw count and whether it also skips the opponent's turn.
- Ace: user recalls either skipping a turn or cancelling a special-card effect; exact interaction is unclear.
- Jack finish: whether the player may choose to punish the opponent instead of taking minus 20 per Jack, and if so the formula.
- Reshuffle rule: whether doubling happens once per round, each reshuffle, or only if the eventual loser triggered a reshuffle.
- Starting hand size, dealer/first-turn procedure, whether a drawn playable card must be played immediately, and how to resolve effects when the final card empties the hand.
- Ordering semantics for multiple cards of one rank, especially when only the top card's action fires but Jack scoring stacks.

The user wants modular rules selected before match setup, preserving this pair's variant and allowing unknown parameters to change. Avoid converting unconfirmed literature variants into defaults without discussing them.

## Suggested skills

- `grilling`: the user's next requested session is to stress-test the game and development plan through focused questions.
- `unslop`: keep prompts and summaries natural and concise.
- `sites:sites-building`: only if a later session explicitly moves from planning into building the web app with Sites.
