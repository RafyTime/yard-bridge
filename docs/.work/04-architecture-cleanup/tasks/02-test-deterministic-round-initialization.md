# 02: Make Round initialization tests deterministic

Type: task
Status: ready-for-agent
Blocked by: None (can start immediately)
Spec: [Approved cleanup spec](../spec.md)

## What to build

Opening Round scenarios can use a fixed card order and a chosen starter without
knowing the shuffle's random-call order. Players still receive one durable deal,
their own private hands, and the same opening behavior as before.

## Acceptance criteria

- [ ] One internal deterministic Round-initialization module takes ordered cards, a selected starter, Seats, and rules, and produces the complete deal and opening state. Tests cross this module's interface rather than coordinating random-call positions.
- [ ] The production start command uses that implementation while continuing to shuffle the 36-card deck and randomly select the first starter on the server.
- [ ] Deterministic scenarios verify two-to-four-Seat deals, configured hand sizes, the starter's last dealt card becoming the opening card, and conservation of all 36 cards across hands and piles.
- [ ] Opening scenarios verify ordinary cards, Jack and 6 obligations, draw/skip effects, the optional King of Spades effect, and disabled opening effects, including current Seat and active suit.
- [ ] Existing authenticated command/view tests continue to prove private hands, authorization, readiness, rejected stale/duplicate starts, frozen rules, and the same durable Round after reconnection.
- [ ] Authorization, readiness checks, and all Round writes remain in one atomic mutation; controlled card order and starter selection are never exposed as public command arguments.
- [ ] Replace overlapping shuffle-coupled scenarios rather than keeping duplicate implementation tests. Run the quality command with a dummy Convex URL and live smoke tests disabled.

## Scope

No gameplay changes, generic random adapter, general game engine, schema changes,
new public commands, deployments, or live-data changes. Ticket 01 is preferred
first but does not technically block this work.
