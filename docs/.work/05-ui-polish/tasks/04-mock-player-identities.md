# 04: Mock player names and avatars

Type: task
Status: claimed
Blocked by: None (can start immediately)
Spec: [UI polish spec](../spec.md)

## What to build

The lobby's Players tab shows each Seat with a friendly mock name and avatar, as
in the prototype, alongside the real Seat number, Host and you badges, and
readiness. Identities derive deterministically from each Seat, so they stay
stable as the Game updates. They are a temporary preview; real player identity
comes later.

## Acceptance criteria

- [ ] Every occupied Seat shows a mock name and avatar; available Seats and pending requests keep their existing presentation and actions.
- [ ] The same Seat shows the same identity across reloads, Seat approvals, and readiness changes.
- [ ] Seat, Host, you, and readiness information remain visible and accurate.
- [ ] Avatars have empty alt text or an accessible label that doesn't duplicate the name.
- [ ] No backend, schema, or persisted nickname changes.
- [ ] Invitation and approval browser tests still pass.
