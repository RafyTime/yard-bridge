# Record a public Round event with every accepted move

Status: accepted

A player returning after a break needs to see what happened, and the approved spec asks to persist accepted events rather than rely on live messages or logs. Every accepted Round command therefore saves one Round event in the same mutation that commits the move, so the event and the table state cannot disagree, and a rejected, stale, or repeated command saves nothing. Events hold only public facts: who acted, the cards played, how many cards were drawn, recycles, skips, passes, waived 6 covers, and the chosen or active suit. Drawn cards and hands never appear in an event, because every Seat reads the same events. The table shows the latest few as a recent-moves feed.

## Considered options

- **A record with no UI.** It would leave returning players with nothing to read.
- **A full Round log or card-by-card replay.** It is out of scope for now. Round summaries and export belong to their own tickets and can build on these events.

## Consequences

- An event is tied to the Round version that its move produced, so each version has at most one event and the feed is ordered by version.
- A new command or outcome needs its own event kind. The steps are in the header comment of `src/convex/roundEvents.ts`: add the kind, commit through `commitTurn` in `src/convex/rounds.ts` (or `recordEvent` outside a turn), and describe it in the feed in `src/lib/components/game-round.svelte`, which does not compile until the new kind is handled.
- Adding a field to an event means checking that it is public to every Seat.
