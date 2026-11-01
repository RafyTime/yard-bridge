# 01: Keep unfinished Rules configuration edits safe

Type: task
Status: ready-for-agent
Blocked by: None (can start immediately)
Spec: [Approved cleanup spec](../spec.md)

## What to build

The Host can edit a Rules configuration without Seat approval or another tab
silently discarding unfinished work. Defaults and saved configurations fill the
draft; only Apply changes the Game's rules. The editor owns draft lifetime and
conflict handling behind its interface.

## Acceptance criteria

- [ ] Approving a Seat preserves unfinished rules edits and the configuration name without producing a rules conflict.
- [ ] An unedited draft follows incoming applied rules. If applied rules change elsewhere during editing, retain the draft, show a warning, and block Apply until the Host explicitly loads the latest rules.
- [ ] A successful local Apply does not trigger a false conflict. A failed Apply preserves input and never silently retries against a newer Game version.
- [ ] Defaults and saved configurations change only the draft; the Game's applied rules and Seat readiness remain unchanged until Apply succeeds.
- [ ] Saving a configuration snapshots applied rules and is disabled while the draft has unapplied edits or a conflict. Seat-only updates do not clear the entered name.
- [ ] Switching Games, reloading, or leaving discards the draft without persistent storage or navigation warnings. Starting a Round still locks editing.
- [ ] Visible browser tests cover draft preservation during Seat approval, clean synchronization, conflicting rules from another tab, explicit reload, Apply success/failure, draft-only defaults/presets, saving restrictions, and fresh state after switching Games or reloading.
- [ ] Existing authenticated command/view checks continue to prove Host-only edits, version checks, readiness reset on applied changes, and rules locking. Run the quality command with a dummy Convex URL and live smoke tests disabled.

## Scope

No autosave, automatic conflict merging, schema changes, new public commands,
deployments, or live-data changes. Implement this ticket before ticket 02 as a
priority preference, not a blocking dependency.
