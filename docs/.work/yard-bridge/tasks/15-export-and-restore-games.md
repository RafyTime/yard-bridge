# 15: Export and restore Games

Type: task
Status: ready-for-agent
Blocked by: 05 (Configure rules and ready the table), 11 (End and score ordinary Rounds)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

The Game owner has a reliable recovery path for long-running Games, approved Seats, saved Rules configurations, and Round history.

## Acceptance criteria

- [ ] A daily export copies production Game data to private storage outside Convex without exposing it in the frontend or source repository.
- [ ] A documented restore procedure recovers a representative active Round, Seats, saved Rules configuration, scores, and completed Round history into a test deployment.
- [ ] The export and restore checks report failures clearly; the owner can tell when the last usable backup completed.

