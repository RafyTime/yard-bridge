# Yard Bridge: private playable game

Status: approved product plan; ready-for-agent implementation spec.

## Problem Statement

Two partners living in Germany and the Netherlands want to keep playing the Odessa yard Bridge variant they play together in person. They need a private phone-friendly game that remembers a round exactly when either person leaves, carries scores across rounds, and remains available until the game reaches a definitive result. Their local rules have several configurable details, so a fixed generic card game would lose the version they know.

## Solution

Build a private, mobile-first PWA for two to four players. The host invites players, chooses a rules configuration, and starts a game after everyone reviews the rules and marks ready. An authoritative server deals cards, validates moves, resolves effects, calculates penalty points, and saves the complete game. Players see only their own active hand, receive live updates, and can return later. The first release includes English and Ukrainian, round results, reusable configurations, and recovery through emailed one-time codes.

## User Stories

1. As a player, I want to enter a one-time code sent to my email, so that I can recover my games without a password.
2. As a player, I want my session to remain signed in on my phone, so that returning to a game takes one tap.
3. As a host, I want to create a private game, so that only invited people can join my table.
4. As a host, I want to name a game, so that I can distinguish several ongoing games.
5. As a host, I want to invite players to a game, so that we can play while apart.
6. As a host, I want to approve each new seat once, so that an invitation alone does not grant access to a player's private state.
7. As a returning player, I want to reclaim my approved seat after signing in, so that a new device or lost session does not erase my place.
8. As a player, I want to keep several unfinished games, so that one group or rules configuration does not replace another.
9. As a host, I want a default rules configuration, so that I can start a familiar game quickly.
10. As a host, I want to save a changed rules configuration, so that I can reuse it in later games.
11. As a host, I want the main settings visible and detailed settings expandable, so that common choices are easy to find.
12. As an invited player, I want to see the core rules and any deviations from the defaults, so that I know what I am agreeing to play.
13. As an invited player, I want to mark myself ready, so that the host knows I have reviewed the rules.
14. As an invited player, I want my ready state cleared when the host edits the rules, so that I can review the new configuration.
15. As a player, I want the rules locked once the first round begins, so that the game does not change underneath us.
16. As a host, I want to start a game with two, three, or four approved players, so that the couple's game also works with friends.
17. As a player, I want one 36-card deck dealt under the chosen hand size, so that the game follows our local variant.
18. As a player, I want the first starter chosen randomly, so that neither player always opens.
19. As a first-round starter, I want my fifth dealt card placed face up while four remain in my hand, so that the opening follows our remembered procedure.
20. As a host, I want to choose whether the opening card's special effect fires, so that I can match the version we play.
21. As a host, I want to configure the later-round starter rule, so that the table can use our default losing-player-first rule or a different agreed rule.
22. As a player, I want later-round starter ties resolved from the previous round and then randomly, so that the default is deterministic until a true tie remains.
23. As a player, I want to play by matching suit or rank, so that ordinary turns feel like the physical game.
24. As a player, I want to use a 6 or Jack as a wild card, so that their special placement rule works regardless of the current top card.
25. As a player, I want to order cards of one rank before placing them together, so that I control which card is on top.
26. As a player, I want a Jack to set the active suit, so that the next player knows what to match.
27. As a player, I want to cover a played 6 with a valid card before passing the turn, so that a 6 cannot finish a round uncovered.
28. As a player without a legal card, I want to draw until I can play, so that the turn advances under our chosen rule.
29. As a player, I want to play a newly drawn playable card immediately, so that drawing cannot be used to stockpile a legal card.
30. As a player, I want the pile below its top card recycled when the draw pile empties, so that a round can continue.
31. As a player, I want a 7 to make the next player draw one and then play, so that its penalty matches our rules.
32. As a player, I want an 8 to make the next player draw two and skip, so that its penalty matches our rules.
33. As a player, I want the Queen of Spades to make the next player draw five, so that its special effect works in any table size.
34. As a host, I want a separate King of Spades toggle, so that I can enable its seven-card draw without changing the score cutoff.
35. As a player, I want 7s and 8s in one same-rank play to add their draws, so that those stacks work as agreed.
36. As a player, I want only the top card's special effect to fire in other same-rank plays, so that card order has a clear result.
37. As a player, I want an Ace to skip the next player by default, so that the ordinary Ace rule is simple.
38. As a host, I want the alternative Ace cancellation rule available, so that a targeted player can use an Ace to cancel one incoming draw or skip effect.
39. As a player, I want to declare Bridge by playing all four cards of one rank when that rule is enabled, so that the round can end even if I still hold cards.
40. As a player, I want a round to end when a hand empties, so that scores can be calculated promptly.
41. As a player, I want the final played card's effect resolved before scoring, so that finishing with a special card still matters.
42. As a player, I want the agreed remaining-card values applied to every hand, so that my round score is explainable.
43. As a player, I want the first pile recycle to apply the selected scoring multiplier once, so that repeated recycles do not compound it.
44. As a player, I want a Jack finish deduction of 20 per finishing Jack after the multiplier, so that even a negative game score is possible.
45. As a host, I want to set the score cutoff independently of the King toggle, so that I can control game length.
46. As a player, I want an exact hit on the score cutoff to reset my score to zero, so that the threshold rule works as remembered.
47. As a player, I want to see my round's remaining hand and point calculation after it ends, so that I can understand the result.
48. As a player, I want every active player's hand hidden during a round, so that remote play is fair.
49. As a player in a group game, I want the remaining players to decide unanimously whether to continue after someone loses, so that the table can finish or play on.
50. As a player, I want surviving and eliminated players ranked under the agreed score and elimination rules, so that a group game has a clear result.
51. As a host, I want to stop a current round and remove a player without scoring that round, so that the table can handle a real-life interruption.
52. As a remaining player, I want host control to pass to the longest-seated player if the host leaves, so that the game can continue.
53. As a player, I want to abandon an unfinished game only by unanimous agreement, so that one person cannot erase the others' game.
54. As a player, I want the exact round state to survive a closed app or lost connection, so that I can resume later without a timer loss.
55. As a player, I want a cached read-only view when offline, so that I can inspect my last known game state while turns wait for a connection.
56. As a player, I want the game to end a full-table no-move deadlock and score held cards, so that the round cannot get stuck forever.
57. As a phone player, I want a portrait layout with clear card handling and turn feedback, so that I can play comfortably with one hand.
58. As a desktop player, I want the same game available in a web browser, so that I am not required to install the PWA.
59. As a player, I want English and Ukrainian interface options, so that we can each read the game comfortably.
60. As a player who prefers reduced motion, I want the card animation to follow my device setting, so that play remains comfortable.
61. As a player, I want stale or repeated move submissions rejected safely, so that a poor connection cannot duplicate a turn.
62. As a game owner, I want exportable history and rules data with a tested restore process, so that long-running games do not depend on a short-lived backup.

## Implementation Decisions

- Use the domain terms Game, Match, Round, Bridge declaration, Penalty points, Rules configuration, Host, Seat, Score cutoff, and Eliminated player as defined in the project glossary.
- Use SvelteKit and TypeScript for the PWA. Use Bun for local package management, scripts, and the frontend build. Start with a static SvelteKit build served on Railway's provided domain. Convex provides persistent state and live updates; hosted Convex functions run in its own JavaScript or Node.js runtimes.
- Use Convex in its Ireland region for the authoritative game state. A public game command checks identity, approved Seat, current turn, expected game version, legal cards, and the frozen Rules configuration, then commits state and history in one mutation. The client sends intentions, never an asserted deck, score, or opponent hand.
- Keep an explicit boundary between shared table data and Seat-specific active hand data. Every query checks authorization. An invitation identifies a Game and starts the Seat approval flow; it does not grant access to hidden state.
- Start with Convex Auth for email-code sign-in and its Svelte adapter. Prove sign-in, session return, and Seat recovery in a narrow integration check before building the full game. If that fails, revisit Better Auth or Google sign-in before inventing a custom identity system.
- Use a verified low-cost sender domain with Resend Free for codes. The domain is for email sending; the app remains on Railway's provided domain. Choose the exact domain and enable auto-renew during provisioning.
- Model a Game as a durable aggregate containing its players, frozen Rules configuration, score and status; model a Round with ordered turn state, draw and played piles, private hands, current effects, and result. Persist accepted events and round summaries so history remains comprehensible after reconnecting. Do not use live transport messages or runtime logs as the permanent record.
- Default to a five-card hand, with the first starter receiving four in hand and placing the fifth as the opening play. Randomly choose the first starter. Default later-round starter to the active player with the highest accumulated Penalty points, breaking ties by previous-round points and then at random; make the starter policy configurable.
- Freeze settings at the first Round start. Core settings include score cutoff, King of Spades effect, and hand size. Advanced settings include opening effects, Bridge declaration, Ace behavior, recycle multiplier, and starter policy. Present all players with core rules and changed details before readying; clear ready states after any host edit.
- A 6 and Jack may be played regardless of suit or rank. Cover a 6 with a card of its suit or another 6; another 6 continues the obligation. Covering cards apply their effects. If the draw pile and recyclable played cards are exhausted, waive an unfulfillable cover and pass.
- Draw until a legal play exists, then play the newly drawn playable card immediately. Recycle played cards except the top when necessary. When every active player has passed once with no legal play and no drawable or recyclable card remains, end the Round and score all remaining hands without a Jack finish deduction.
- Resolve 7 as draw one then play, 8 as draw two then skip, Queen of Spades as draw five, and enabled King of Spades as draw seven without skipping. Each targets the next active player in table order. Same-rank 7s and 8s in one play add their draws; other same-rank plays trigger only the top card's special effect. Penalties do not transfer across turns.
- Default Ace behavior skips the next player. In the alternative Ace rule, a targeted player may immediately play an Ace from hand to cancel the entire incoming draw or skip, including a stack. That Ace uses the player's turn and play passes onward.
- An enabled Bridge declaration ends the Round even when the declarer holds cards. Emptying a hand also ends the Round, after its final card effect resolves. A Bridge declarer scores cards still held.
- Score remaining hands as follows: 6 through 9 are zero; 10, ordinary Queen, and ordinary King are 10; Ace is 15; Jack is 20; Queen of Spades is 50; enabled special King of Spades is 80. With its toggle off, King of Spades is an ordinary King worth 10.
- Apply the chosen recycle multiplier of one, two, or three after the first recycle of a Round, default two. Later recycles do not compound it. Deduct 20 per Jack in a final hand-emptying play after the multiplier. A Bridge declaration with cards still held gets no Jack finish deduction. Allow negative accumulated scores.
- Default the Score cutoff to 200, independently of the King toggle. An exact cutoff hit resets the player's score to zero; a score above it triggers loss. In group play, remaining active players decide unanimously whether to continue. If continuation is declined, rank by points. If it continues, survivors outrank eliminated players; later Eliminated players outrank earlier ones; points break ties within one elimination wave; tied scores share a rank. One active survivor wins; if all active players cross together, end and rank by score.
- Let the Host stop the current Round and remove any player. That Round scores nothing, earlier scores remain, and history distinguishes the removal from score elimination. Transfer Host control to the longest-seated remaining player if necessary. Record unanimous abandonment separately from a normal result.
- Keep multiple unfinished Games and saved Rules configurations. Record each Round's ending, final hands, and point calculation. Preserve the exact active Round through disconnects without turn timers.
- Design portrait mobile play first, adapting to desktop. Take color, card handling, motion, and simplicity cues from Offsuit, while choosing separate typography. Use selected shadcn-svelte controls for forms and dialogs and custom card-table interactions. Follow system reduced-motion preferences and omit sound.
- Offer English and Ukrainian at launch. An LLM may draft Ukrainian copy; review card and rule terms separately.
- Use Convex Free initially and upgrade if its hard caps become a problem. Railway cold starts are acceptable. Schedule a daily export to private off-site storage and verify a restore before launch.

## Testing Decisions

- Test observable behavior through the highest useful seam: authenticated public game commands followed by each Seat's authorized state. Use this seam for rules, scoring, invitations, history, reconnection, access control, and concurrent or repeated commands. Assert the result a player can observe, not private helper calls or document layout.
- Make the game rules deterministic under a supplied deck order and random choice for testing. This lets the public command seam reproduce first plays, recycles, ties, penalties, and rare deadlocks without depending on chance.
- Cover two-player defaults, every configurable rule, and four-player next-seat effects. Include exact-cutoff reset, negative scores, multiple simultaneous losses, administrative removal, host transfer, and unfinished-game recovery.
- Verify that one Seat cannot query another active hand, and that stale or simultaneous moves cannot both commit.
- Use a small number of browser checks for email-code sign-in, Seat recovery, PWA installation, cached offline view, Railway cold-start recovery, and mobile layout. Run them on Pixel Chrome and Firefox-family browsers and iPhone Safari and Chrome, then desktop.
- Check English and Ukrainian layouts, card labels, and system reduced-motion behavior on phones.
- Test an export and restore against a representative Game with active Round, Seats, saved Rules configuration, and completed history.
- This repository has no application code or test suite yet, so there is no existing test pattern to copy. The authenticated command-and-view seam is the first integration boundary.

## Out of Scope

- Five-player tables before playtesting the four-player game.
- Public matchmaking, spectators, chat, turn clocks, push notifications, and sound.
- Russian translation, a dedicated personal welcome-note screen, and alternate typography copied from Offsuit.
- Full card-by-card replay. First-release history shows Round endings, final hands, and point calculations.
- The unconfirmed alternative Jack-finish punishment rule and other local variants not included in the approved configuration.
- Effect.ts unless a concrete need appears during implementation.
- Purchasing a custom app domain; Railway's provided domain is sufficient.

## Further Notes

- This spec formalizes the approved planning map and uses the project glossary. The Convex architecture decision explains the backend trade-off. The handoff records the couple's memories and source accounts; those accounts are evidence of variants, not a canonical override.
- The [planning map](map.md), [domain glossary](../../../CONTEXT.md), [Convex decision](../../adr/0001-convex-game-backend.md), [research](stack-research.md), and [original handoff](../../yard-bridge-handoff.md) supply context for implementation.
- The domain and sender account, backup destination, and production credentials are provisioning choices. They must be made and tested before the surprise launch.
- The first implementation check is the SvelteKit, Convex Auth, email-code, and return-to-Seat flow. Its result can change the auth adapter without changing the Game rules.
