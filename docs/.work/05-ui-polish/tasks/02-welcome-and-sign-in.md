# 02: Welcome and sign-in screen

Type: task
Status: claimed
Blocked by: 01
Spec: [UI polish spec](../spec.md)

## What to build

Signed-out visitors land on a spacious welcome screen under the shared top bar: a
short invitation to play and one focused sign-in card. The email and code steps
have clear hierarchy, visible loading feedback, and a smooth transition between
them. Language and appearance stay reachable through the account button.

## Acceptance criteria

- [ ] The welcome screen has a clear heading, a short invitation, and a single sign-in card.
- [ ] Email and code steps are visually distinct; the code step shows which address the code went to, with resend and change-email actions.
- [ ] Sending and verifying show loading feedback; errors and notices stay announced to assistive technology.
- [ ] Step transitions respect reduced motion.
- [ ] Existing sign-in behaviour is unchanged: one-time-code autofill, focus moves to the code field, and the same error handling.
- [ ] Fits a narrow phone in Ukrainian; existing sign-in browser tests pass with updated selectors if needed.
