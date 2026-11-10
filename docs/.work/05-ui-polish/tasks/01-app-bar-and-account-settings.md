# 01: App bar with account and settings sheet

Type: task
Status: claimed
Blocked by: None (can start immediately)
Spec: [UI polish spec](../spec.md)

## What to build

Every screen shares one top bar: a large, centred Yard Bridge wordmark and an
account button on the right. The button opens a full-height sheet on mobile and a
dialog on desktop. Signed in, the sheet shows a mock avatar and username (both
editable, stored only in the browser and labelled as a preview), the account
email, language (English, Spanish, Ukrainian), appearance (Light, Dark, System),
and Sign out. Signed out, it offers only language and appearance. The email and
Sign out button no longer sit in the main layout.

## Acceptance criteria

- [ ] The wordmark is visibly larger and centred at the top of every screen, including signed out.
- [ ] The account button has an accessible name and a 44px touch target, and opens a sheet on mobile and a dialog on desktop.
- [ ] Changing language updates the UI immediately and persists after a reload.
- [ ] Choosing Light, Dark, or System applies immediately and persists after a reload.
- [ ] Username and avatar can be changed, persist in the browser only, and are marked as a preview. No backend change.
- [ ] Sign out works from the sheet; the main layout no longer shows the email or a Sign out button.
- [ ] New copy exists in en, es, and uk; the sheet fits a narrow phone in Ukrainian.
- [ ] The sheet respects reduced motion and returns focus to the account button on close.
- [ ] The existing sign-in/sign-out browser test is adapted, and a new browser test covers language and appearance persisting across a reload.
