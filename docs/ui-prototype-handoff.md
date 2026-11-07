# Mobile lobby UI implementation handoff

Updated 2026-11-08. The next agent should implement the working UI using the approved prototype as design inspiration, using only currently implemented app capabilities. This handoff records the conversation decisions; existing code, specs, and resolved tasks remain authoritative for behavior.

## Start here

1. Read the repository's `AGENTS.md`, [domain vocabulary](../CONTEXT.md), and [implementation map](.work/01-yard-bridge/yard-bridge-map.md). Check the current working tree before editing.
2. Inspect the prototype visually at `http://127.0.0.1:5173/?prototype` after starting the local dev server. Open the sample lobby, then Players and Rules. Inspect Invite friends and Review and start. The route is development-only; see [the page entry](../src/routes/+page.svelte).
3. Compare each proposed UI action with the working components below. Carry over presentation and flow while preserving the existing commands, permissions, version checks, and failure handling. If a prototype behavior requires a new backend capability or product decision, keep the existing working behavior and flag the difference for review.

The work lives on `refactor/ui-polish` at handoff time. Prototype history includes `373cdfc`, `36fd35a`, `bccf9f4`, and `53ae2b5`. Read the current files for the final design, including refinements made after the earlier commits. The working tree was clean before this handoff was added.

## Approved design direction

The user wanted a cohesive polish using the existing shadcn-svelte system, with mobile as the first priority. Keep the established theme and icon system from [components.json](../components.json). This is an implementation of the selected direction, not another round of A/B/C exploration.

- Prototype B won. A and C were removed. B uses a lobby with Players and Rules tabs and a persistent bottom action area shared between them.
- Players use clear rows with seat information, host/you badges, readiness, available seats, and distinct pending-request actions. Match the spacing and visual rhythm across both tabs.
- Invite friends opens a compact drawer on mobile and a dialog on desktop. Put a copy icon button inside the invitation-link field. Offer device sharing when supported, with copy/manual recovery and clear feedback.
- The host edits rules directly in the Rules tab. The separate full-height drawer editor was tried and superseded. Guests see the applied rules; editing remains host-only and locks when the existing app requires it.
- Group rules as in the prototype, with a larger group title and a distinct icon for each group. Individual rule names were increased from 12px to 14px in the final pass.
- Each rule has its info button directly beside its name. Keep the 44px touch target, accessible name, and keyboard-focus indicator. The info button has no hover color change.
- Info opens inline beneath its rule with a short expansion/collapse animation and reduced-motion support. Tooltip and help-drawer experiments were removed. Keep only inline explanations.
- Pending rule edits replace the bottom Review and start action with Save/Cancel and an unsaved-change count. Invalid numbers show inline errors and block saving. Cancel restores applied rules. Saving is explicit, not autosave.
- Switching Players/Rules preserves the host's draft. Keep draft state alive across tab changes rather than losing it when a tab unmounts. This does not authorize persistent draft storage across reloads or different games.
- For the host, Review and start opens a read-only summary of applied rules, marks differences from defaults, and provides the final Start round action. This combines review and start navigation; the actual readiness/start protocol must still follow the existing backend.

The user approved the latest result. No further UX question is pending before implementation.

## Prototype reference files

Read these instead of copying component internals into this handoff:

- [Lobby and draft/footer state](../src/lib/components/mobile-lobby-prototype.svelte).
- [Inline rule controls](../src/lib/components/prototype-rules-editor.svelte).
- [Inline rule explanation and animation](../src/lib/components/prototype-rule-help.svelte).
- [Group titles and icons](../src/lib/components/prototype-rule-group-title.svelte).
- [Rule groups, labels, sample explanations, and defaults](../src/lib/components/prototype-rules.ts).
- [Invitation presentation](../src/lib/components/prototype-invite.svelte).
- [Final review presentation](../src/lib/components/prototype-round-review.svelte).

All prototype actions and generated identities are in memory. The sample invitation cannot join a game, and the start screen does not deal cards. Prototype English copy, rule defaults, and rule descriptions are references to validate against implemented rules, not a second domain source of truth. Prototype controls, sample data, and simulation notices do not belong in the working UI.

## Preserve the working app

The implementation entry points are [games.svelte](../src/lib/components/games.svelte), [invitations.svelte](../src/lib/components/invitations.svelte), [game-rules.svelte](../src/lib/components/game-rules.svelte), and [game-round.svelte](../src/lib/components/game-round.svelte). Authentication and query-parameter navigation enter through [the root page](../src/routes/+page.svelte). Keep existing features reachable when restructuring these components.

Use the current code and these artifacts to determine what is implemented:

- [Create/resume games](.work/01-yard-bridge/tasks/03-create-and-resume-game.md).
- [Real invitations and approved seats](.work/01-yard-bridge/tasks/04-invite-and-approve-seats.md).
- [Rules, saved configurations, and readiness](.work/01-yard-bridge/tasks/05-configure-rules-and-ready.md).
- [Round initialization and private hands](.work/01-yard-bridge/tasks/06-open-round-with-private-hands.md).
- [Draft preservation and conflict requirements](.work/04-architecture-cleanup/tasks/01-preserve-rules-configuration-drafts.md). This is especially important when reorganizing the Rules tab.
- [Browser behavior tests](../tests/auth.e2e.ts), including multiple sessions, stale versions, rules conflicts, and configuration reuse.

Specific integration traps:

- Seat updates must not discard edits or configuration names. Clean drafts follow incoming applied rules. Conflicting applied-rule updates preserve local input and require explicit loading of the latest rules before applying. Preserve the existing stale-write rejection and recovery behavior.
- Defaults and saved configurations populate the draft. Saving a named configuration snapshots applied rules and remains restricted while edits/conflicts are pending. These working controls are absent from the prototype and must remain available.
- The prototype assumes other players are ready and simulates the host's acceptance. The working app has separate versioned readiness and start commands. Use authoritative game state and existing commands; do not replace them with local flags, assume an atomic combined operation, or bypass guest readiness. Handle updated versions between commands and failed starts.
- The prototype disables start for a pending seat request. Treat that as illustrative. Inspect the working eligibility rules rather than adding a new business restriction.
- Use real invitation URLs and existing invite lifecycle/error states. Native sharing is a client presentation enhancement for an existing invitation, not a reason to add backend capabilities.
- Random animal names, avatar faces, and colors were explicitly a temporary prototype shortcut. Player identity needs its own product decision later. Use existing seat/player information and neutral fallbacks in the working UI. Do not invent persisted nicknames, profile settings, or an avatar service.
- Preserve English/Ukrainian localization through the existing Paraglide workflow. Validate narrow layouts with translated labels and help. Do not ship the prototype's hardcoded English as the working app's copy.
- Existing round gameplay and private-hand behavior must continue working. The approved prototype primarily covers game selection, lobby, invites, and rules; it does not specify a gameplay redesign or authorize unimplemented game mechanics.

## Validation and environment

Follow `AGENTS.md` and the [README](../README.md) for current tooling and the quality command. The latest prototype pass completed lint, type checks, 35 unit tests, the build, and 20 browser tests. Six iPhone/WebKit cases could not launch because this host lacked `libicu74` and `libjpeg-turbo8`; one live smoke case was skipped. This was an environment limitation, not a passing full quality run.

Prototype development used a dummy Convex URL and disabled the live Convex smoke test. Keep implementation verification isolated from production, live databases, and shared preview channels unless the user explicitly authorizes access. A local dev server may still be running on port 5173; inspect it before starting another. Do not stop another project's server to free a test port.

For review, exercise the real host and guest flows, tab-switch draft retention, Save/Cancel, conflict recovery, readiness/start eligibility, invitation failures, and saved-configuration reuse. Check mobile overflow, safe-area/footer clearance, focus visibility, reduced motion, and desktop dialog behavior. Preserve existing meaningful tests and adapt assertions to the new presentation.

## Suggested skills

Invoke these skills, or read their `SKILL.md` through the environment's supported mechanism:

- `shadcn-svelte` for component composition, existing theme conventions, and current component documentation.
- `frontend-design` for translating the approved prototype into a cohesive working mobile UI.
- `unslop` for concise product copy and implementation communication.
- `convex` and the relevant Convex implementation/review skills only if backend work becomes necessary. First read `src/convex/_generated/ai/guidelines.md` and respect the authorized scope. Prefer existing backend capabilities for this task.

[The older game-planning handoff](yard-bridge-handoff.md) records an earlier planning phase. Its instruction to stop at planning and its unresolved rules are historical; consult the current implementation map and domain documents for present behavior.
