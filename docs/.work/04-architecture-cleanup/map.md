# Private Game setup architecture cleanup

## Notes

- [Approved spec](spec.md)
- [Approved architecture review](../../architecture-reviews/2026-11-01-private-game-setup.html)

## Decisions-so-far

- Leo approved two implementation tickets on 1 November 2026. Both are
  `ready-for-agent` and have no blocking dependencies.
- [01: Keep unfinished Rules configuration edits safe](tasks/01-preserve-rules-configuration-drafts.md)
  is the first priority, including visible browser verification.
- [02: Make Round initialization tests deterministic](tasks/02-test-deterministic-round-initialization.md)
  is independently verifiable. Doing 01 first is a preference, not a blocking edge.
- Ticket 01 is implemented: the editor owns draft lifetime, synchronization, and
  explicit conflict reload. Defaults and saved configurations fill the draft;
  only Apply changes applied rules. Browser behavior is verified through the
  existing authenticated in-memory backend flows.
- Existing Convex atomicity and private views remain in effect.

## Fog

- None for the approved scope.
