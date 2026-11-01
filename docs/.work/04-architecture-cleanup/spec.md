# Private Game setup architecture cleanup

Status: ready-for-agent
Source: [Approved architecture review](../../architecture-reviews/2026-11-01-private-game-setup.html)

## Problem Statement

Approving a Seat clears the Host's unfinished rules edits and configuration name.
Opening Round tests also depend on shuffle positions and random-call order,
making rule scenarios fragile when the shuffle implementation changes.

## Solution

Let the Rules configuration editing module own its draft lifetime while Convex
continues to sync applied rules. Keep Apply as the explicit save step. Give Round
initialization one internal deterministic seam without changing gameplay.

## User Stories

1. As a Host, I want unfinished edits and the configuration name preserved when a Seat is approved, so that admitting a player does not erase my work.
2. As a Host, I want incoming rules to update an unedited editor, so that I see the current Rules configuration.
3. As a Host, I want unfinished edits retained with a warning when applied rules change elsewhere, so that another tab cannot silently erase my work.
4. As a Host, I want an explicit action to load the latest rules before applying a conflicting draft, so that I cannot overwrite changes unknowingly.
5. As a Host, I want defaults and saved configurations to fill the draft, so that I can review them before pressing Apply.
6. As a Host, I want saving a configuration disabled while edits remain unapplied, so that the saved configuration contains the rules I expect.
7. As a player, I want only applied changes to clear readiness, so that unfinished Host edits do not interrupt rules review.
8. As a Host, I want drafts limited to the open editor, so that switching Games, reloading, or leaving starts fresh without extra prompts.
9. As a developer, I want opening scenarios tested with fixed card order and a chosen starter, so that tests describe Round behavior rather than shuffle mechanics.
10. As a player, I want private hands, frozen rules, and durable Round starts preserved, so that this cleanup does not change Game behavior.

## Implementation Decisions

- The rules editor owns draft synchronization and conflict state; its caller must
  not remount it for every Game version. Switching Games still starts fresh.
- Distinguish applied rules, the draft, and the rules against which editing began.
  Seat-only updates preserve edits without creating a rules conflict. Keep the
  server's version checks; never silently retry a rejected edit against a newer version.
- An unedited draft follows incoming rules. A conflicting draft remains visible
  with Apply blocked until the Host explicitly loads the latest rules. Successful
  local Apply updates must not be mistaken for another tab's conflicting change.
- Defaults and saved configurations change only the draft. Saving a configuration
  remains a snapshot of applied rules and is disabled while the draft is dirty or
  conflicted. Apply failures preserve input; Round start still locks editing.
- Extract complete deterministic Round initialization behind one internal seam:
  ordered cards, selected starter, Seats, and rules produce the deal and opening
  state. Production still shuffles and chooses the first starter on the server.
- Keep authorization, readiness checks, and all Round writes in one atomic
  mutation. No schema changes, new public commands, or generic adapter framework.

## Testing Decisions

- Confirmed with Leo: use visible browser behavior for the editor, retain existing
  authenticated Game command/view tests, and add the internal deterministic
  Round-initialization seam for fixed-card scenarios.
- Extend the existing invitation and saved-configuration browser flows to cover
  Seat approval during editing, clean synchronization, another tab's conflicting
  rules, explicit reload, Apply, draft-only defaults/presets, saving restrictions,
  and fresh state after switching Games or reloading.
- Test complete deals and opening states, including card conservation and special
  opening cards, without counting random calls. Retain command/view coverage for
  privacy, authorization, readiness, stale/duplicate starts, frozen rules, and reconnection.
- Assert observable outcomes through each module's interface. Replace overlapping
  shuffle-coupled scenarios rather than adding duplicate implementation tests.
- Run the existing quality command with a dummy Convex URL and live smoke tests disabled.

## Out of Scope

Autosave, persistent drafts, navigation warnings, automatic conflict merging,
new turn rules, a general game engine, and deployment or live-data changes.

## Further Notes

Both review candidates and the rules-editor behavior were approved on 1 November 2026. Implement the rules editor first. This spec prepares the work; implementation
has not started. The existing Convex architecture decision remains in effect.
