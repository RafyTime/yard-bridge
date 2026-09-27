# 05: Configure rules and ready the table

Type: task
Status: ready-for-agent
Blocked by: 04 (Invite and approve Seats)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

The Host can use default rules or save and reuse a Rules configuration. Invited players can review the core rules and deviations, then mark ready before the first Round.

## Acceptance criteria

- [ ] Only the Host can edit pre-game rules; core settings remain visible and detailed settings can expand.
- [ ] The Host can save a configuration and select it for a later Game without changing the original Game.
- [ ] Every approved player sees the base rules and changed values, can mark ready, and loses ready status after a Host edit.
- [ ] The Game cannot be marked ready to start while an approved player has not reviewed the latest rules. Tests check Host-only editing and readiness reset.

