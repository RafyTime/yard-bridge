# 19: Set up a reusable domain for sign-in emails

Type: task
Status: ready-for-human
Blocked by: 02 (Sign in with an email code; resolved)
Spec: [Approved Yard Bridge spec](../yard-bridge-spec.md)

## What to build

Players can receive Yard Bridge sign-in codes at their own email addresses through
Resend, using a dedicated sending subdomain of one reusable domain owned by Leo.
The root domain can support future side projects without separate domain purchases.
The app keeps its Railway-provided URL; a paid receiving mailbox is unnecessary.

Schedule this provisioning work near release, before inviting other players. It
blocks ticket 18, not continued implementation of the Game.

## Acceptance criteria

- [ ] The owner approves the domain name and registration and renewal costs before
      purchase, and registers a domain suitable for reuse across side projects.
- [ ] Domain auto-renew and registrar and Resend account recovery are configured.
- [ ] A dedicated Yard Bridge sending subdomain has the required DNS records and
      is verified for sending in Resend. Record the selected domain and subdomain.
- [ ] Yard Bridge uses a Resend key with Sending access restricted to that
      subdomain. Separate test and production keys are used when production is set up;
      credentials remain in the intended Convex deployment's server environment.
- [ ] The intended deployment's sender address uses the verified subdomain, and
      another player can receive a real code and sign in on the hosted app. Obtain
      explicit authorization before changing any shared testing or production channel.
- [ ] Record the configuration and delivery verification without secrets, and
      document how future projects can use separate sending subdomains and scoped keys.

## Comments

- Agreed on 18 October 2026: use one reusable domain across side projects rather
  than buying a domain for each project. Keep Resend's account-only test sender
  during development until this ticket is completed.
