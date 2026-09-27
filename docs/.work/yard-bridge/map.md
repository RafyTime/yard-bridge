# Yard Bridge planning map

Planning status: approved on 28 September 2026. The user confirmed the shared spec after the final stalemate rule was added.

## Notes

- [Rules and prior discussion](../../yard-bridge-handoff.md)
- [Current stack research](stack-research.md)
- [Current spec](spec.md)
- [Convex decision](../../adr/0001-convex-game-backend.md)
- [Ticket 01: project foundation](tasks/01-project-foundation.md) is ready for the owner to split into subtasks. Tickets 02–18 are ready for agents after their blockers clear.
- The game is the couple's Odessa yard Bridge variant, not contract bridge.
- [A Ukrainian account](https://sovet.kidstaff.com.ua/question-184470) says the first player past the score limit loses; it does not settle how to rank a group. The group ranking and continuation rules below are this project's extension.
- [Odessa players](https://forumodua.com/showthread.php?t=16194) disagree on whether a Bridge declarer scores cards left in hand. Counting those cards also avoids a strategy one player identified: draw a large hand, collect four of a rank, then declare Bridge without a penalty.
- The accounts above use limits of 125 or 150 points. They do not establish a single correct limit for this couple's rules, so the project's editable default of 200 reflects the user's memory and choice.

## Decisions-so-far

- The primary use is for two people living apart to play together.
- The first playable version should support two to four players, with the two-player case primary. With five cards dealt from a 36-card deck, four players leave more draw cards than five; revisit a fifth seat after playtesting.
- A round is one deal. A game, also called a match, continues across rounds until a final winner or ranking is known.
- The experience should be a mobile-first PWA that also works on desktop web.
- Use SvelteKit with TypeScript for the frontend. Use Bun for local package management and scripts where the toolchain supports it. Build plain TypeScript domain functions first; do not introduce Effect.ts at launch.
- Use Convex for server-authoritative state, live updates, and persistence. Start with Convex Auth rather than Better Auth, subject to a small SvelteKit sign-in integration check because Convex Auth is beta and its Svelte adapter is community maintained.
- Use selected shadcn-svelte controls for forms, settings, and dialogs. Build the card table and card interactions specifically for this game.
- Deploy the frontend on Railway under its provided domain. The user already pays for Railway and accepts cold starts. Start with SvelteKit's static adapter and a lightweight static file server, subject to the auth integration check; Convex serves the live data. Keep Convex Free initially, with willingness to pay for usage or upgrade later.
- The server owns the shuffled deck, hidden hands, legal moves, and scoring. It validates and commits each move atomically; clients receive only their authorized view.
- The installed PWA may show cached content while offline, but submitting turns requires a connection.
- Live play has no turn timer. Progress, history, and rules configurations must persist so players can resume after a long break.
- Provide a default rules configuration. The host may adjust rules before a game and save the resulting configuration for future games. Lock a game's rules when its first round starts. Show core rules directly; place detailed options in an expandable section. Before the game starts, invitees see the base rules and any host changes, then mark themselves ready.
- Deal five cards to each player by default, with hand size configurable. Choose the opening round's starting player randomly. For later rounds, start with the player who has the highest accumulated penalty score; break ties using the previous round's results, then randomly among those still tied.
- Whether the opening card's special action fires is configurable; it is on in the default rules configuration.
- The opening round's random starting player receives four cards in hand and places their fifth card face up as the first play. Its effect follows the selected opening-effect rule.
- An opening Jack lets that player choose the active suit. An opening 6 must be covered before the next player acts. A 6 can be covered by a card of its suit or another 6; another 6 continues the cover obligation. A covering card fires its own effect; a player cannot end the round with an uncovered 6.
- A player must immediately play a playable card drawn during their turn.
- A 6 or Jack may be played regardless of the current suit or rank. Other cards, including the Queen and King of Spades, follow ordinary suit-or-rank matching.
- In group play, the effect of a 7, 8, or Queen of Spades applies to the next player in table order.
- Playing four cards of one rank declares Bridge and immediately ends the round, even if the declarer holds other cards. Everyone, including the declarer, scores their remaining cards. The Bridge rule can be disabled.
- Resolve final-card effects before scoring a round.
- When a player crosses the score limit in a group game, ask every remaining player whether to continue. Continue only if all agree; otherwise end and rank everyone by points. If play continues, the losing player leaves. Surviving players rank above eliminated players; later eliminations rank above earlier ones; points break ties within an elimination round. Tied scores share a rank when the game ends. If one active player remains, end automatically. If all active players cross together, end and rank them by score.
- Use a configurable score limit of 200 by default. The King of Spades draw effect is a separate toggle. Hitting the limit exactly resets that player's score to zero.
- Default remaining-card points: 6–9 = 0; 10, ordinary Queen, ordinary King = 10; Ace = 15; Jack = 20; Queen of Spades = 50; special King of Spades = 80. When King of Spades is disabled, it is an ordinary King worth 10; enabling it activates both the seven-card draw and the 80-point hand penalty.
- Ace skips the next player's turn by default, with an alternative effect available as a rule choice. When the host enables the King of Spades effect, it makes the next player draw seven cards without skipping; Queen of Spades remains five cards.
- Once a round's draw pile needs recycling, multiply the remaining-card points scored at the end of that round. The host chooses ×1, ×2, or ×3, with ×2 as default; later recycles in the same round do not multiply again. Apply the multiplier before Jack finish deductions; allow negative game scores.
- Finishing a hand with two Jacks deducts 40 points, 20 per Jack; the played group must be the player's last cards. A four-Jack Bridge declaration with cards still in hand gets no Jack finish bonus.
- Players arrange same-rank cards before placing them. Normally only the top card's special action fires, but paired 7s and paired 8s add their draw effects in that play. Two 7s make the next player draw two and still play; two 8s make them draw four and skip once. Draw penalties do not pass between players' turns.
- Under the optional Ace cancellation rule, a targeted player can play an Ace from hand immediately to cancel a whole incoming draw or skip effect, including a stacked effect. The Ace becomes the top card, uses that player's turn, and play passes to the next player.
- If no card can be drawn or recycled while a player must cover a 6, end that cover obligation and pass play to the next player.
- If the draw pile is empty, nothing can be recycled, and every active player has passed once without a legal play, end the round. Everyone scores their remaining hand; nobody receives a Jack finish deduction.
- Closing the app or losing connection preserves the exact round state without an automatic loss or turn timer. The host may stop the current round and remove any player. The stopped round adds no points; the next round retains previous game scores. History records the administrative removal separately from a score loss. If one player remains, that player wins by forfeit. If the host leaves, host control passes to the longest-seated remaining player. Players may also unanimously end an unfinished game as abandoned.
- When the host changes rules before the game starts, clear all players' ready status so they can review the change and ready again.
- After a round, reveal each player's remaining hand and the point calculation in the shared history. Keep hands private while the round is active.
- First-release history shows each round's ending, final hands, and point calculation. A full card-by-card replay is outside the initial scope.
- Join private rooms by invitation. Use a one-time email code to recover a player's seat, history, and saved rules across devices; keep the signed-in session on that device.
- The host approves each new player's seat once; returning to that approved seat requires no new approval. Players may keep multiple unfinished games with the same group, each with its own rules and score history.
- Offsuit is a reference for colors, card handling, animation, and overall simplicity, but not typography.
- Design for portrait phones first and adapt the table to desktop. Use subtle card motion; sound is not required at launch. Follow the device's reduced-motion preference without adding a separate launch setting.
- Let the host name a game. Keep a dedicated personal welcome note outside the first-release scope; the gift can be introduced in person or in the invitation message.
- Offer English and Ukrainian at launch. An LLM can draft Ukrainian copy; game terms should receive a separate review. Russian is outside the first release.
- Test the portrait UI first on a Pixel with Chrome and Firefox-family browsers and an iPhone with Safari or Chrome, then desktop web.
- Ship a private playable game as soon as practical.
- Prefer email-code sign-in with a small sender domain if the purchase and upkeep are modest. The app can still use its Railway domain. Google sign-in is an acceptable fallback if email delivery is more trouble or cost than warranted.
- A normal `.com` sender domain at about $10/year renewal plus Resend Free meets that cost condition; a receiving mailbox is unnecessary for sending login codes. Choose the exact domain when provisioning, check renewal pricing, and enable auto-renew.
- Bun is the local package manager and build runner. Convex hosts its functions in its own runtimes; Railway serves the static frontend build.
- Keep recoverable, private off-site data exports and test a restore before launch. The exact backup destination is an implementation choice.

## Implementation tickets

1. [Establish the project foundation](tasks/01-project-foundation.md) — ready-for-human.
2. [Sign in with an email code](tasks/02-email-code-sign-in.md)
3. [Create and resume a Game](tasks/03-create-and-resume-game.md)
4. [Invite and approve Seats](tasks/04-invite-and-approve-seats.md)
5. [Configure rules and ready the table](tasks/05-configure-rules-and-ready.md)
6. [Open a Round with private hands](tasks/06-open-round-with-private-hands.md)
7. [Play ordinary turns](tasks/07-play-ordinary-turns.md)
8. [Play wild cards and ordered groups](tasks/08-play-wild-and-ordered-cards.md)
9. [Resolve draw-card effects](tasks/09-resolve-draw-card-effects.md)
10. [Resolve Ace effects](tasks/10-resolve-ace-effects.md)
11. [End and score ordinary Rounds](tasks/11-end-and-score-ordinary-rounds.md)
12. [Add Bridge and scoring edge rules](tasks/12-add-bridge-and-scoring-edge-rules.md)
13. [Resolve the Score cutoff](tasks/13-resolve-score-cutoff.md)
14. [Handle Host interventions](tasks/14-handle-host-interventions.md)
15. [Export and restore Games](tasks/15-export-and-restore-games.md)
16. [Make the PWA installable and useful offline](tasks/16-installable-offline-pwa.md)
17. [Complete English and Ukrainian UI](tasks/17-complete-english-and-ukrainian-ui.md)
18. [Release the private Game](tasks/18-release-private-game.md)

## Fog

- Whether a fifth seat works after playtesting.
- Whether the Convex Auth Svelte adapter and a static SvelteKit frontend pass a narrow end-to-end sign-in test.
- Which exact sender domain to register and where to store scheduled off-site exports. These are provisioning choices, not blockers to the agreed architecture.
- Exact visual palette and card motion details, to be settled with a UI prototype.
- The Jack finish alternative and other uncertain local rules outside the agreed first-release default.
