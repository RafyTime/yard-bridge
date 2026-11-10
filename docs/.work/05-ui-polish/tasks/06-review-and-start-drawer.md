# 06: Review and start as a mobile drawer

Type: task
Status: resolved
Blocked by: None (can start immediately; do after 05 to avoid collisions in the Rules tab)
Spec: [UI polish spec](../spec.md)

## What to build

For the Host, Review and start opens a compact bottom drawer on phones, matching
the prototype, with a scrollable summary of applied rules (differences from
defaults marked) and actions that stay visible. Desktop keeps a dialog. The real
readiness and start protocol is unchanged.

## Acceptance criteria

- [ ] On a phone viewport, Review and start opens a bottom drawer; on desktop, a dialog.
- [ ] The summary scrolls independently while the start and close actions stay visible and clear the safe area.
- [ ] Rules that differ from defaults are marked.
- [ ] Readiness and start still use the existing separate versioned commands; updated Game versions and failed starts are handled as before.
- [ ] Focus moves into the drawer on open and returns to the trigger on close; motion respects reduced-motion settings.
- [ ] A new browser test opens the drawer on a phone viewport and starts the Round; existing start tests pass.

## Answer

Merged in `a904a5e`. Review and start is a bottom drawer on phones and a dialog on desktop, following the invitation pattern. The summary scrolls on its own while the actions stay pinned, and rules that differ from the defaults get a "Changed" badge. Readiness and start commands are unchanged.
