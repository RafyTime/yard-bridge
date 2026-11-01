# 01: Keep unfinished Rules configuration edits safe

Type: task
Status: resolved
Blocked by: None (can start immediately)
Spec: [Approved cleanup spec](../spec.md)

## What to build

The Host can edit a Rules configuration without Seat approval or another tab
silently discarding unfinished work. Defaults and saved configurations fill the
draft; only Apply changes the Game's rules. The editor owns draft lifetime and
conflict handling behind its interface.

## Acceptance criteria

- [x] Approving a Seat preserves unfinished rules edits and the configuration name without producing a rules conflict.
- [x] An unedited draft follows incoming applied rules. If applied rules change elsewhere during editing, retain the draft, show a warning, and block Apply until the Host explicitly loads the latest rules.
- [x] A successful local Apply does not trigger a false conflict. A failed Apply preserves input and never silently retries against a newer Game version.
- [x] Defaults and saved configurations change only the draft; the Game's applied rules and Seat readiness remain unchanged until Apply succeeds.
- [x] Saving a configuration snapshots applied rules and is disabled while the draft has unapplied edits or a conflict. Seat-only updates do not clear the entered name.
- [x] Switching Games, reloading, or leaving discards the draft without persistent storage or navigation warnings. Starting a Round still locks editing.
- [x] Visible browser tests cover draft preservation during Seat approval, clean synchronization, conflicting rules from another tab, explicit reload, Apply success/failure, draft-only defaults/presets, saving restrictions, and fresh state after switching Games or reloading.
- [x] Existing authenticated command/view checks continue to prove Host-only edits, version checks, readiness reset on applied changes, and rules locking. Run the quality command with a dummy Convex URL and live smoke tests disabled.

## Scope

No autosave, automatic conflict merging, schema changes, new public commands,
deployments, or live-data changes. Implement this ticket before ticket 02 as a
priority preference, not a blocking dependency.

## Answer

The Rules configuration editor owns its draft, baseline, and conflict state. The
caller keys it by Game id, so Seat-only updates preserve both draft edits and the
configuration name. Clean drafts follow applied rules; conflicting drafts retain
input and block Apply until the Host loads the latest rules. Local Apply updates
the baseline only after success, and rejected stale updates keep input without
retrying. Defaults and saved configurations populate only the draft; saving an
applied snapshot is blocked while edits or conflicts remain.

The existing invitation and saved-configuration browser flows now cover
preservation, readiness, draft-only fills, saving restrictions, and fresh state
on reload or switching Games. A two-tab browser scenario covers synchronization,
conflicts, explicit reload, and a real stale-version rejection by pausing the
Convex wire request. Authenticated command/view coverage remains unchanged.

Validation: the first approval assertion failed before the fix; all three focused
Chromium flows pass, as do formatting, correctness lint, ESLint, and frontend,
backend, and worker checks. The isolated full quality run passes all static gates,
20 unit tests, the production build, and 20 Playwright tests across Chromium, Pixel,
and Firefox; live smoke is skipped. Six iPhone tests cannot launch WebKit because
the host lacks its ICU/JPEG libraries; no application assertions run in those cases. See the [map decision](../map.md#decisions-so-far).
