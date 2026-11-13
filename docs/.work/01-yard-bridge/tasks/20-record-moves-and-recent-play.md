# 20: Record moves and show recent play

Type: task
Status: ready-for-agent
Blocked by: 09 (Resolve draw-card effects; resolved)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Every accepted Round command is saved as a durable event in the same commit as the move. The table shows a short feed of recent public moves, so a player coming back after a break can see what happened.

## Acceptance criteria

- [ ] Starting a Round, playing a card or same-rank group (including a chosen Jack suit), drawing, accepting a Pending effect, waiving a 6 cover, and passing each save one event in the same mutation that commits the move. A rejected, stale, or repeated command saves none.
- [ ] Events record only public facts: who acted, which cards were played, how many cards were drawn, recycles, skips, and the active suit. Drawn cards and hands never appear in a shared event.
- [ ] Every Seat sees the same recent-moves feed at the table (latest few, newest first) in English and Ukrainian. It survives reconnecting and reloading.
- [ ] Command-and-view tests cover each event type and the privacy boundary, and one browser flow checks the feed after a reload.
- [ ] Later tickets (10–14) add their own events through the same path. The ticket documents how.

Out of scope: card-by-card replay, Round summaries (ticket 11 owns endings, final hands, and point calculations), and export (ticket 15).

## Comments

- 2026-11-13 (owner decisions): The spec asks to persist accepted events, and no earlier ticket owned that. The owner chose a durable event record plus a recent-moves feed rather than a record with no UI or a full Round log. This ticket runs next and blocks ticket 10, so every later command records its own event from the start.
