# 03: Standardize development and verification on Vite+

**What to build:** A contributor can install, develop, preview, build, and run the complete Yard Bridge quality workflow through documented Bun scripts backed by pinned project-local Vite+. Use the official migrator first, retain Svelte-specific verification, and align CI and contributor guidance with the working toolchain.

**Blocked by:** 02 (Run the localized static PWA on SvelteKit 3). Its verified framework baseline isolates toolchain replacement failures and provides the application behavior this migration must preserve.

**Status:** ready-for-agent

Spec: [Toolchain upgrade](../spec.md)

- [ ] Run the official Vite+ 1.1.0 migrator from the project root before manual toolchain rewrites, retaining original Vitest version evidence and satisfying documented prerequisites first.
- [ ] Disable unsolicited hook, agent-file, and editor setup; review the migrator's report and resolve unsupported-rule warnings and compatibility findings explicitly.
- [ ] Vite+ is pinned locally, its managed dependencies match bundled versions, and Bun remains the package manager without introducing unnecessary workspace catalogs.
- [ ] Development, build, preview, and unit-test scripts invoke local Vite+ and work without a global CLI; the full quality command includes standalone Playwright E2E.
- [ ] Supported configuration is consolidated with existing formatting preferences, Svelte formatting, Tailwind sorting, and generated/static-file exclusions preserved.
- [ ] Required Svelte lint coverage remains through ESLint, including the existing scoped Button exception and zero-warning policy. The full quality workflow explicitly checks Svelte, backend, and worker types.
- [ ] A supported Svelte browser-test helper works with bundled Vitest; client, server, and Convex test projects pass without forced peer compatibility or newly skipped tests. Report an evidenced blocker if supported compatibility cannot be achieved.
- [ ] A supported Node 24 runtime at or above 24.11 is used and documented alongside Bun 1.4.3.
- [ ] CI configuration and contributor/agent guidance reflect the verified local Vite+ workflow, tool ownership, generation steps, environment loading, and every required quality gate with failure propagation.
- [ ] A clean frozen installation, type/message generation, complete quality workflow, static build, development/preview commands, language navigation, and offline PWA checks succeed on the final toolchain.
- [ ] Document the preserved static output/hosting contract and any hosted follow-up without changing hosted settings. Validation uses the dummy backend URL and disables live smoke testing.
- [ ] Review the final diff for unrelated changes and record exact versions, commands, results, migration reports, and remaining limitations under Comments. Distinguish local results from unexecuted CI or hosted checks; no deployments, commits, pushes, or pull requests are part of this ticket.

## Comments

Implementation pending. This ticket includes final clean-checkout verification and the CI/documentation work formerly separated into ticket 04.
