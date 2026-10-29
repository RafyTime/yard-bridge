# 19: Set up a reusable domain for sign-in emails

Type: task
Status: ready-for-human
Blocked by: 02 (Sign in with an email code; resolved)
Spec: [Approved Yard Bridge spec](../yard-bridge-spec.md)

## What to build

Players can receive Yard Bridge sign-in codes at their own email addresses through
Resend, using a shared sending subdomain of one reusable domain owned by Leo.
The root domain can support future side projects without separate domain purchases.
The app is hosted at `https://yard-bridge.rafy.dev`; a paid receiving mailbox is
unnecessary.

Schedule this provisioning work near release, before inviting other players. It
blocks ticket 18, not continued implementation of the Game.

## Acceptance criteria

- [x] The owner approves the domain name and registration and renewal costs before
      purchase, and registers a domain suitable for reuse across side projects.
- [ ] Domain auto-renew and registrar and Resend account recovery are configured.
- [x] A shared sending subdomain has the required DNS records and
      is verified for sending in Resend. Record the selected domain and subdomain.
- [ ] Yard Bridge uses a Resend key with Sending access restricted to that
      subdomain. Separate test and production keys are used when production is set up;
      credentials remain in the intended Convex deployment's server environment.
- [x] The intended deployment's sender address uses the verified subdomain, and
      another player can receive a real code and sign in on the hosted app. Obtain
      explicit authorization before changing any shared testing or production channel.
- [x] Record the configuration and delivery verification without secrets, and
      document how future projects can reuse the sending subdomain or use separate
      sending subdomains and scoped keys.

## Configuration and verification

- Owner purchased `rafy.dev` through Porkbun and confirmed auto-renew is enabled.
- Website: `https://yard-bridge.rafy.dev`.
- Resend sending domain: `mail.rafy.dev`, verified for sending by the owner.
- The owner updated `AUTH_RESEND_KEY` and `AUTH_EMAIL_FROM` in the existing Convex
  development deployment, which currently backs the hosted app. No production
  deployment is configured. No credentials are recorded here.
- On 29 October 2026, the owner confirmed the hosted email-code sign-in test
  worked after configuring the verified sender.
- Owner confirmed Porkbun account recovery, Resend MFA, and Sending access on the
  app's Resend key. Keep Resend's MFA recovery codes in a secure place.
- Remaining confirmation: the key's Domain restriction is `mail.rafy.dev`, and
  Resend account recovery is available if the MFA device is lost.

Future projects can send as `projectname@mail.rafy.dev` with their own API keys.
These projects share sending reputation, and a key restricted to `mail.rafy.dev`
can send from other addresses on that same domain. Projects needing separate
domain permissions or reputation segmentation should verify their own sending
subdomain and restrict their key to it. Use separate test and production keys when
production is introduced.

## Comments

- Agreed on 18 October 2026: use one reusable domain across side projects rather
  than buying a domain for each project. Keep Resend's account-only test sender
  during development until this ticket is completed.
- Agreed during provisioning: share `mail.rafy.dev` across personal projects
  rather than require a dedicated sending subdomain for each project.
