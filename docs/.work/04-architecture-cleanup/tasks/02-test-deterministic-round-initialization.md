# 02: Make Round initialization tests deterministic

Type: task
Status: resolved
Blocked by: None (can start immediately)
Spec: [Approved cleanup spec](../spec.md)

## What to build

Opening Round scenarios can use a fixed card order and a chosen starter without
knowing the shuffle's random-call order. Players still receive one durable deal,
their own private hands, and the same opening behavior as before.

## Acceptance criteria

- [x] One internal deterministic Round-initialization module takes ordered cards, a selected starter, Seats, and rules, and produces the complete deal and opening state. Tests cross this module's interface rather than coordinating random-call positions.
- [x] The production start command uses that implementation while continuing to shuffle the 36-card deck and randomly select the first starter on the server.
- [x] Deterministic scenarios verify two-to-four-Seat deals, configured hand sizes, the starter's last dealt card becoming the opening card, and conservation of all 36 cards across hands and piles.
- [x] Opening scenarios verify ordinary cards, Jack and 6 obligations, draw/skip effects, the optional King of Spades effect, and disabled opening effects, including current Seat and active suit.
- [x] Existing authenticated command/view tests continue to prove private hands, authorization, readiness, rejected stale/duplicate starts, frozen rules, and the same durable Round after reconnection.
- [x] Authorization, readiness checks, and all Round writes remain in one atomic mutation; controlled card order and starter selection are never exposed as public command arguments.
- [x] Replace overlapping shuffle-coupled scenarios rather than keeping duplicate implementation tests. Run the quality command with a dummy Convex URL and live smoke tests disabled.

## Scope

No gameplay changes, generic random adapter, general game engine, schema changes,
new public commands, deployments, or live-data changes. Ticket 01 is preferred
first but does not technically block this work.

## Answer

Implemented `src/convex/roundInitialization.ts` as the internal deterministic
boundary for the complete deal and opening state. The public start mutation still
shuffles and selects the starter on the server, validates authorization/readiness,
and persists every Round write atomically. No public command or schema changed.

Fixed-card scenarios cover two through four Seats, hand sizes 2/5/9, the chosen
starter's final dealt card, full 36-card conservation, ordinary/special opening
cards, the optional King of Spades, and disabled effects. Authenticated command/view
coverage retains private hands, durable reconnection, frozen rules, authorization,
readiness, and stale/duplicate start rejection without mocking shuffle positions.

Verification: the required isolated quality command passed formatting, both lint
gates, all three TypeScript checks, 35 Vitest tests, the static build, and 17
Playwright tests; the live smoke test was skipped. Five iPhone/WebKit cases could
not launch because this host lacks `libicu74` and `libjpeg-turbo8`; they failed
before application assertions. No deployment or live-data operation was run.

See [Decisions-so-far](../map.md#decisions-so-far) for the integration summary.
