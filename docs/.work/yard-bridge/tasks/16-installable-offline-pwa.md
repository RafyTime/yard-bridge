# 16: Make the PWA installable and useful offline

Type: task
Status: ready-for-agent
Blocked by: 06 (Open a Round with private hands)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Players can install Yard Bridge on a phone, read their last cached Game view without a connection, and return to live play when connected. The interface also works in a desktop browser.

## Acceptance criteria

- [ ] The app can be installed on target phones and shows a cached, clearly dated read-only Game view offline. It does not queue or claim to submit offline turns.
- [ ] Cached private data is cleared or isolated when a player signs out or another player signs in on the same device.
- [ ] Portrait layouts make cards, turn state, and primary actions usable on Pixel and iPhone screens; desktop layouts adapt without losing access to actions.
- [ ] Card motion is subtle and follows the device's reduced-motion preference. Visual choices use Offsuit's color and handling as a reference without copying its typography.
- [ ] Browser checks cover installation, offline view, reconnection, and basic accessibility on the target phones.
