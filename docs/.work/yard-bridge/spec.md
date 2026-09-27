# Yard Bridge: private playable game

Status: planning, awaiting final shared-understanding check.

## Purpose

Let two people in different countries play their familiar Odessa yard Bridge game together on their phones. Support two to four players from the first release, while making the two-player table the clearest path. Games continue across rounds and can be resumed after a long break.

This is the couple's remembered local variant, not contract bridge or a claim of canonical rules. The [handoff](../../yard-bridge-handoff.md) records the original memories and sources. The [planning map](map.md) records the detailed decisions made during the grill.

## Player flow

1. A player signs in with an emailed one-time code and stays signed in on that device. The host creates and names a private game, choosing the default rules or a saved configuration.
2. The host invites two to four players total and approves each new seat once. Returning players reclaim their seats without another approval.
3. Invitees see the core rules and any changes, then mark ready. A pre-game rule change clears ready states. Rules lock when the first round begins.
4. Each player sees their own hand, shared table state, scores, turn indicator, and legal actions. The server validates and commits every move. Disconnection preserves the exact game state; there is no turn timer.
5. At a round's end, everyone sees the final hands and point calculation. They can continue into another round until the game ends. Players may have several unfinished games and reuse saved rules configurations.

## Rules contract

- Use one 36-card deck, ranks 6 through Ace. Deal five cards per player by default; the host can change hand size before a game.
- Randomly choose the first round's starter. Give that player four cards in hand and place their fifth card face up as the opening play. Opening special effects fire by default; the host can change this. For later rounds, choose the active player with the highest accumulated penalty score, then the highest score from the previous round, then randomly among remaining ties.
- Play a card matching suit or rank, or play a 6 or Jack as a wild card. Players may order and play multiple cards of one rank. A Jack chooses the active suit. A 6 must be covered before play passes; a 6 of any suit or a card matching its suit can cover it. Covering cards apply their effects. A player cannot finish on an uncovered 6.
- A player unable to play draws until they can; a playable drawn card is played immediately. Recycle the pile below its top card when the draw pile runs out. If no draw or recycle is possible while covering a 6, waive the cover and pass. If the draw pile is empty, nothing can be recycled, and every active player has passed once without a legal play, end the round. Everyone scores the cards still in hand; nobody receives a Jack finish deduction.
- A 7 makes the next player draw one and then play. An 8 makes the next player draw two and skip. The Queen of Spades makes the next player draw five. An optional King of Spades effect makes the next player draw seven without skipping. Same-rank 7s and 8s played together stack their draw amounts; otherwise only the top card in a same-rank play fires its special effect. Draw penalties do not pass across turns.
- An Ace skips the next player by default. An alternative host setting lets a targeted player play an Ace immediately to cancel an incoming draw or skip, including a stacked effect. That Ace uses the targeted player's turn and play passes onward.
- Emptying a hand ends a round after its final card effect resolves. An enabled Bridge declaration, playing all four cards of one rank, ends the round even when the declarer has cards left; all players score their remaining hands. Finishing with Jacks deducts 20 per finishing Jack after other score calculations. A Bridge declaration with cards still held earns no Jack finish deduction.
- Remaining-hand points are 6–9: 0; 10, ordinary Queen and ordinary King: 10; Ace: 15; Jack: 20; Queen of Spades: 50; enabled special King of Spades: 80. With that King effect disabled, it is an ordinary King worth 10.
- The score cutoff is 200 by default and is independent of the King toggle. Reaching it exactly resets that player's game score to zero; crossing it triggers loss. Once a round first recycles the pile, multiply remaining-card points by the host's selected multiplier of ×1, ×2, or ×3, default ×2. Later recycles do not multiply again. Apply a Jack finish deduction afterward. Negative scores are valid.
- If several players cross the cutoff together, ask the remaining players whether to continue without them. Continuation requires unanimity. If not unanimous, end the game and rank by score. Continuing players outrank eliminated players; later eliminations outrank earlier ones; points break ties within an elimination wave. Tied scores share rank. One remaining player wins; if all cross together, end and rank by score.
- The host may stop the current round and remove any player. That round scores nothing and earlier game scores remain. Record this separately from a score loss. If the host leaves, control passes to the longest-seated remaining player. The group can unanimously abandon an unfinished game.

## Product and interface

- Make a portrait phone PWA first and adapt it to desktop. Test Pixel Chrome and Firefox-family browsers, plus iPhone Safari and Chrome. The installed app can show its last cached view offline; turns need a connection.
- Take color, card handling, motion, and simplicity cues from Offsuit, with different typography. Use subtle animation, respect the device's reduced-motion preference, and skip sound at launch.
- Offer English and Ukrainian. Draft Ukrainian copy with an LLM, then review game terms. Do not add Russian at launch.
- Keep core host settings visible and detailed options expandable. Use selected shadcn-svelte controls for forms and dialogs; make the card table custom.
- Preserve round results, final hands, and score calculations. A full move-by-move replay is outside this first release.

## Technical approach

- Use SvelteKit, TypeScript, and Bun for local installs, scripts, and the frontend build. Start with `adapter-static` and serve the built PWA on Railway's provided domain. Convex handles live state and backend functions. Hosted Convex functions use Convex or Node.js runtimes, not Bun.
- Use Convex in its Ireland region. One mutation validates identity, seat, turn, selected cards, frozen rules, and game version, then commits the resulting state and history atomically. Queries must never send another player's hidden hand. Treat invite links as game discovery, not authorization.
- Start with Convex Auth. Prove SvelteKit sign-in and return-to-seat on desktop and iPhone before building the game around its community-maintained adapter. Use a verified, inexpensive sender domain with Resend Free for one-time codes; the app URL stays on Railway. If this integration fails, reconsider Better Auth or Google sign-in before implementing a custom auth system.
- Use Convex Free initially, then upgrade to a paid plan if its hard caps become a problem. The owner already pays for Railway and accepts cold starts. Export Convex data regularly to private off-site storage and test restoration before launch; game history must not depend on short-lived built-in backups alone.
- Use plain TypeScript for the game rules. Add Effect.ts only if a concrete part of the rules or server boundary benefits from it.

## First-release checks

- Two players can sign in, join, play, disconnect, and resume one unfinished game from their phones without losing state.
- A four-player game runs with the same hidden-hand and turn guarantees, including penalties aimed at the next player.
- Concurrent, stale, or illegal move submissions cannot corrupt a round or reveal another hand.
- Default and changed rule configurations produce the agreed scoring and turn outcomes, including exact-cutoff reset, recycling multiplier, Bridge declaration, and optional King effect.
- English and Ukrainian fit the phone UI; invitation, installation, offline view, and cold-start recovery work on the target browsers.
- A backup export can restore a game, seats, rules configuration, and round history.
