# 09: Resolve draw-card effects

Type: task
Status: resolved
Blocked by: 08 (Play wild cards and ordered groups)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Playing a 7, 8, Queen of Spades, or enabled King of Spades applies its draw and skip effect to the next active player, including same-rank 7 and 8 stacks.

## Acceptance criteria

- [x] A 7 draws one then allows play; an 8 draws two and skips; the Queen of Spades draws five and skips; enabled King of Spades draws seven and skips.
- [x] Same-rank 7s and 8s in one ordered play add their draw amounts. Other same-rank plays fire only the top card's special effect.
- [x] Effects target the next active Seat around a two-, three-, or four-player table and do not carry into a later turn.
- [x] An opening 7, 8, Queen of Spades, or enabled King of Spades fires or remains inert according to the frozen Rules configuration; tests cover both settings and the King toggle.

## Answer

A 7, 8, Q♠, or enabled K♠ on top of a play leaves a pending effect on the next Seat in
table order. The Round stores it in a new `effect` field, which records the target Seat,
the draw count, and whether the target is skipped. Opening effects now use the same field,
and `opening` keeps only the Jack suit choice; an opening 6 sets `mustCover`. While an effect is pending,
the target cannot Play or Draw. They use a new version-checked `accept` command instead,
which draws the cards and clears the effect. After a 7 the target then takes a normal
turn, and after an 8, Q♠ or K♠ play passes to the following Seat. Same-rank 7s and 8s add
their draws, so two 8s mean four cards and one skip. In any other group, only the top
card's effect fires. A 6 on top fires nothing until a covering card is played, and that
card's effect then applies.

A draw larger than the draw pile recycles the played pile below its top card first, then
draws whatever remains, and the effect resolves as usual. Play continues without a draw
pile. Accept and the existing Draw share one pile and recycle step. An opening Ace records
a zero-draw skip, and Accept resolves it as a plain skip. A played Ace still has no effect
until ticket 10.

Command-and-view tests script the deal. They cover a 7 accepted and then played, with a
new 7 starting a fresh single draw. They cover stacked 7s and 8s around a four-player table
that wraps to the first Seat, and an 8 at two and three players. They also cover top-card-only
Queen and King groups with the King toggle on and off, and opening 7, 8, Q♠ and K♠ under
both opening-effect settings and the King toggle. Further tests cover an accepted opening
Ace skip, a stale, repeated and simultaneous accept, and a short pile that recycles. At the
table, the target sees the draw and skip and an Accept control, and everyone else sees
which Seat must draw. The browser flow plays two 8s, then the target accepts four cards in
Ukrainian and is skipped. Phone screenshots were inspected at 390px and 320px.

See the [map's Decisions-so-far](../yard-bridge-map.md#decisions-so-far).

Verification: `PUBLIC_CONVEX_URL=https://ci.invalid RUN_CONVEX_SMOKE=0 bun run quality`
on 12 November 2026. Formatting, linting, and type checks passed, and 66 unit tests passed.
In the browser suite, 43 tests passed and 1 was skipped. The new flow passed on Chromium,
Pixel Chrome, Firefox, and iPhone WebKit. The two iPhone WebKit focus checks that already
failed before this ticket still fail, in the sign-in and rules-drawer tests. One Firefox
test, a different one on each full run, timed out waiting for the sign-in code field. That
test makes no Round moves, and all 11 Firefox tests passed when that project ran alone. No
deployment or shared channel was changed.

## Comments

- 2026-11-12 (owner decision): A draw effect stays pending on the target Seat, as ticket 06's opening effects do. The target accepts it with one command: they draw the cards, then either play (7, Q♠, K♠) or are skipped (8). This leaves room for ticket 10's Ace cancellation.
- The UI scope is a minimal playable table with EN/UK messages and one browser flow.
- 2026-11-13 (owner correction): The Queen of Spades makes the next player draw five and skip, and the enabled King of Spades makes them draw seven and skip. This replaces the earlier "without skipping" reading for played and opening cards. The owner also confirmed the short-pile rule: recycle first, then draw whatever remains, and play continues without a draw pile. An opening Ace's zero-draw skip is now accepted as a plain skip instead of staying blocked.
