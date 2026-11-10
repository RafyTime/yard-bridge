# UI polish: account, home, and lobby clarity

Status: ready-for-agent
Source: Leo's review of the working mobile UI on `refactor/ui-polish` (2026-11-10), following the [mobile UI handoff](../../ui-prototype-handoff.md).

## Problem Statement

The working UI follows the approved prototype but still feels unfinished. The
welcome/sign-in and Games screens lack hierarchy, and the Yard Bridge title is
small and off to the side. The account email and Sign out button sit permanently
in the main layout, and there is no way to change language or appearance. The way
back to all Games is easy to miss. Players lack the friendly identities the
prototype showed. In the Rules tab, explanations crowd their controls, "Use
defaults" does not say what it does, and Saved configurations and How to play
are lost at the bottom. Review and start opens a dialog on mobile instead of the
prototype's drawer.

## Solution

Give the app one consistent shell: a large, centred Yard Bridge wordmark and an
account button that opens a settings sheet (mobile) or dialog (desktop) holding
the profile, language, appearance, and Sign out. Rework the welcome/sign-in and
Games screens around that shell and make the way back to Games conspicuous. Show
mock player identities in the lobby. Make the Rules tab's secondary features easy
to find and understand, and present Review and start as a bottom drawer on mobile.
Profile and player identities are frontend mocks; everything else uses existing
capabilities.

## User Stories

1. As a visitor, I want a clear, spacious welcome screen with a prominent Yard Bridge wordmark, so that I know where I am and what to do.
2. As a visitor, I want one focused sign-in card with distinct email and code steps, so that signing in feels simple.
3. As a visitor, I want visible loading feedback while a code is sent or verified, so that I know the app is working.
4. As a visitor, I want to change language and appearance before signing in, so that I can read the sign-in flow comfortably.
5. As a player, I want an account button in the top bar, so that account details and settings don't clutter every screen.
6. As a player, I want the account sheet to show my avatar, username, and email, so that I can confirm who I'm signed in as.
7. As a player, I want to set a username and pick an avatar, so that I can personalise my presence (mocked for now).
8. As a player, I want to switch between English, Spanish, and Ukrainian, so that I can use the app in my language.
9. As a player, I want to choose Light, Dark, or System appearance, so that the app suits my device and surroundings.
10. As a player, I want my language and appearance choices remembered after a reload, so that I don't have to set them again.
11. As a player, I want Sign out inside the account sheet, so that it is available but not in my way.
12. As a player, I want a prominent New game action on the Games screen, so that starting a Game is obvious.
13. As a player, I want each Game shown as a card with its lobby or active status and seat count, so that I can tell which Games need me (seat count mocked for now).
14. As a player inside a Game, I want a clear "back to your Games" control beside the Game title, so that I can always find my other Games.
15. As a player in the lobby, I want each Seat shown with a friendly name and avatar, so that the table feels personal.
16. As a player, I want those identities to stay stable while the Game updates, so that people don't appear to reshuffle.
17. As a player, I want Seat, Host, you, and readiness information kept alongside the mock identities, so that nothing real is hidden.
18. As a Host, I want rule explanations visually separated from their controls, so that the Rules tab is easy to scan.
19. As a Host, I want the defaults action to say it resets my draft to the default rules and still needs saving, so that I know what it changes.
20. As a Host, I want Saved configurations near the top of the Rules tab, so that I can reuse a Rules configuration without hunting for it.
21. As a player, I want How to play presented as a distinct action, so that I can find the base rules when I need them.
22. As a Host on a phone, I want Review and start to open as a bottom drawer with a scrollable summary and persistent actions, so that it fits the mobile flow.
23. As a Host on desktop, I want Review and start to remain a dialog, so that it suits a wide screen.
24. As a player, I want all existing readiness, start, draft, conflict, and saved-configuration behaviour preserved, so that the polish doesn't break the Game.
25. As a player using reduced motion, I want sheets, drawers, and expansions to respect that preference, so that the UI stays comfortable.
26. As a Ukrainian or Spanish speaker on a narrow phone, I want the new screens to fit translated labels, so that nothing overflows.

## Implementation Decisions

- **Shell:** a top bar with the centred wordmark, an account button on the right,
  and a back control on the left only where it applies. No bottom navigation bar.
  There are too few destinations to justify one.
- **Account and settings:** a full-height sheet on mobile and a dialog on desktop,
  built from the existing shadcn-svelte drawer/dialog components. It is a panel,
  not a route. Before sign-in it offers only language and appearance.
- **Language:** switch through the Paraglide runtime between the configured
  locales (en, es, uk), using Paraglide's own persistence strategy.
- **Appearance:** Light/Dark/System through the existing `mode-watcher` setup and
  its persistence.
- **Mock profile:** username and avatar choice live only in the browser's local
  storage and are labelled as a preview. No schema, backend, or avatar service.
  This intentionally overrides the earlier handoff's "no nicknames/avatars"
  guidance, at Leo's request, as a temporary mock.
- **Mock player identities:** derived deterministically from each Seat (reuse the
  prototype's name/avatar generation idea), so they stay stable across updates.
  They don't replace real Seat information.
- **Games cards:** show the name and status the Games list already returns, plus
  a mock seat count derived deterministically from the Game id so it stays
  stable across reloads. Keep it in one helper beside the mock identities so the
  real count can replace it in one place. No backend change.
- **Rules tab:** keep all draft-preservation and conflict behaviour from the
  architecture cleanup intact. Changes are layout, copy, and placement only.
  Saved configurations still snapshot applied rules and stay disabled while the
  draft is dirty or conflicted.
- **Review and start:** responsive drawer/dialog, mirroring the invitation
  drawer/dialog pattern. Readiness and start remain separate versioned commands.
- **Copy:** every new string goes through Paraglide in all three locales. No
  hardcoded English.

## Testing Decisions

- Confirmed with Leo: browser behaviour is the single seam. Test visible
  behaviour, not component internals.
- Adapt the existing browser flows (sign-in/sign-out, multiple Games, invitations,
  rules editing, drafts/conflicts, saved configurations) to the new placement of
  Sign out, the back control, Saved configurations, and Review and start.
- Add two focused browser tests: language and appearance choices apply and
  survive a reload; on a phone viewport, Review and start opens as a drawer and
  the Round can still start.
- No unit tests for the mock identity or profile code. It is temporary.
- Verify with `bun run quality` using a dummy Convex URL and the live smoke test
  disabled, as in previous efforts.

## Out of Scope

- Real usernames, avatars, profile storage, or an avatar service.
- Real seat counts or other new backend data on Game cards.
- Any backend, schema, or command changes.
- Gameplay (Round) screen redesign.
- A bottom navigation bar or a separate settings route.

## Further Notes

- Tickets 05 and 06 both touch the Rules tab. Do 05 first to avoid collisions.
  This is an ordering preference, not a blocking dependency.
- Real seat counts, nicknames, and avatars are the next effort after this
  overhaul. Keep all mocks isolated so they are easy to replace.
- Prototype files remain the visual reference for identities, the review drawer,
  and rule help styling.
