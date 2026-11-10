# 05: Easier-to-follow Rules tab

Type: task
Status: ready-for-agent
Blocked by: None (can start immediately)
Spec: [UI polish spec](../spec.md)

## What to build

The Rules tab's secondary features become easy to find and understand. Rule
explanations get padding and a muted background, separated from their controls.
The defaults action reads as resetting the draft to the default rules, with a
note that saving is still required. Saved configurations move to a clearly
labelled section near the top, with a configuration chooser and Save
configuration action. How to play becomes a distinct, full-width secondary action.
Layout, copy, and placement change; behaviour does not.

## Acceptance criteria

- [ ] Expanded explanations have visible spacing from their control and a distinct background; the expand animation still respects reduced motion.
- [ ] The defaults action is labelled as resetting the draft to default rules, with a short note that the changes still need saving; it changes only the draft.
- [ ] Saved configurations appear near the top for the Host: choosing one fills the draft, and saving remains disabled while the draft is dirty or conflicted.
- [ ] How to play is a distinct, full-width secondary action showing the base rules, available to all players.
- [ ] Draft preservation across Seat updates and tab switches, conflict warnings, explicit reload, and stale-Apply recovery are unchanged.
- [ ] Rules, drafts/conflicts, and saved-configuration browser tests pass with updated selectors; new copy exists in en, es, and uk.
