# Private Game setup architecture cleanup

## Notes

- [Approved spec](spec.md)
- [Approved architecture review](../../architecture-reviews/2026-11-01-private-game-setup.html)

## Decisions-so-far

- Leo approved two implementation tickets on 1 November 2026. Both are
  resolved and integrated on `refactor/private-game-setup`.
- [01: Keep unfinished Rules configuration edits safe](tasks/01-preserve-rules-configuration-drafts.md)
  is the first priority, including visible browser verification.
- [02: Make Round initialization tests deterministic](tasks/02-test-deterministic-round-initialization.md)
  is independently verifiable. Doing 01 first is a preference, not a blocking edge.
- Ticket 01 is implemented: the editor owns draft lifetime, synchronization, and
  explicit conflict reload. Defaults and saved configurations fill the draft;
  only Apply changes applied rules. Browser behavior is verified through the
  existing authenticated in-memory backend flows.
- Existing Convex atomicity and private views remain in effect.
- Ticket 02 is implemented: one internal deterministic module produces the
  complete deal and opening state from ordered cards, a chosen starter, Seats,
  and rules. Production retains server randomness and atomic writes; fixed-card
  tests replace shuffle-coupled scenarios while authenticated command/view
  coverage continues to verify private hands, authorization, and durability.

## Fog

- Both ticket quality runs passed static checks, unit tests, builds, and browser
  tests on Chromium, Pixel, and Firefox. iPhone/WebKit cases could not launch
  because the host lacks ICU 74 and JPEG 8 libraries. Integrated verification and
  the final two-axis review are pending.
