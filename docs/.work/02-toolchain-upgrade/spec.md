# Upgrade the project toolchain

Status: resolved

## Problem Statement

Leo wants to update Yard Bridge's skeleton before building Game features. The project needs Bun 1.4.3, SvelteKit 3, and a consistent Vite+ workflow without losing the existing static build, localized PWA, Convex integration, or quality checks. Hand-editing configuration before trying the official migrators would obscure which changes the tools can perform and which require project-specific decisions.

## Solution

Upgrade in stages: Bun, SvelteKit, then Vite+. Run the official SvelteKit and Vite+ migrators before manual changes to their respective toolchains, review their reports and diffs, and make only the remaining compatibility fixes. Keep Bun as the package manager and use pinned project-local Vite+ through package scripts. Validate each stage using the existing quality command and browser behavior, then update CI and contributor guidance to match the verified workflow.

## User Stories

1. As a developer, I want Bun pinned to 1.4.3, so that installations use the agreed version.
2. As a contributor, I want a frozen installation from a clean checkout, so that dependency resolution is reproducible.
3. As a developer, I want the existing package linker behavior preserved, so that upgrading Bun does not introduce an unrelated dependency-layout change.
4. As a developer, I want SvelteKit 3, so that future Game work starts on the current framework generation.
5. As a developer, I want official migrations attempted first, so that their diagnostics identify the remaining manual work.
6. As a reviewer, I want migration reports and unresolved findings recorded, so that successful command execution does not hide incomplete migration.
7. As a developer, I want a pinned project-local Vite+ toolchain, so that development and CI use the same tools.
8. As a contributor, I want documented package scripts, so that I can work without installing a global Vite+ CLI.
9. As a developer, I want supported configuration consolidated, so that tool settings have a clear source of truth.
10. As a developer, I want Svelte lint coverage preserved, so that template and navigation issues remain detectable.
11. As a developer, I want Svelte diagnostics preserved, so that TypeScript-only checking does not miss component errors.
12. As a developer, I want backend and service-worker types checked explicitly, so that independent TypeScript projects are covered.
13. As a developer, I want formatting preferences and Tailwind sorting preserved, so that the upgrade does not change our authoring conventions unnecessarily.
14. As a developer, I want generated code excluded from authored-code formatting and linting, so that tooling respects generator-owned output.
15. As a developer, I want unit, browser component, and in-memory Convex tests to run, so that tool consolidation preserves existing verification.
16. As a developer, I want test dependencies compatible with Vite+'s bundled Vitest, so that peer conflicts do not undermine the browser suite.
17. As a player, I want the shell and language routes to work after upgrading, so that the toolchain change does not alter navigation or localization.
18. As a player, I want the installed app shell to reload offline, so that the existing PWA behavior survives the service-worker migration.
19. As a developer, I want environment variables loaded and embedded correctly, so that builds target their intended backend configuration.
20. As a developer, I want the static output contract preserved, so that the existing hosting configuration remains usable.
21. As a reviewer, I want CI to fail on every required quality gate, so that consolidation cannot silently reduce verification.
22. As the project owner, I want validation isolated from hosted data, so that upgrading tooling does not modify a live deployment.

## Implementation Decisions

- Sequence implementation as Bun upgrade, SvelteKit migration, Vite+ adoption, and final CI/documentation verification. Run available quality checks after each unit of work and record results.
- Target Bun 1.4.3, stable SvelteKit 3.x, and Vite+ 1.1.0. Resolve and record exact compatible dependency versions during implementation; use stable releases rather than preview registries.
- Preserve Bun as package manager. Refresh the lockfile with the selected Bun version and review its format/dependency changes. Preserve the existing linker; this single-package project does not need workspace catalogs.
- Establish a baseline before migrating. Preserve the original manifests, lockfile, and available migration evidence until reports have been reviewed. If environment limitations prevent the baseline, record them and restore access before claiming validation.
- Check the latest SvelteKit 2.x release and its deprecation warnings as the official prerequisite. Run the official Svelte migration for SvelteKit 3 before manually changing framework configuration or application imports. Review generated TODOs and finish the reported changes.
- Run the Vite+ migrator from the project root using the explicit target version before manually replacing tool configuration, imports, or scripts. Preserve the original Vitest version evidence so the migrator can apply its compatibility logic. Satisfy documented prerequisites first; record any blocker and the minimal prerequisite repair before retrying.
- Preserve repository-owned agent guidance. Disable unsolicited migrator hook, agent-file, and editor setup. Update project guidance deliberately after the final workflow is verified.
- Standardize development, preview, build, and unit-test scripts on project-local Vite+. Keep familiar Bun script entry points; a global CLI is optional. Inspect the bundled toolchain versions rather than independently upgrading managed Vite/Vitest packages.
- Consolidate supported lint, format, and test settings into Vite configuration. Preserve tabs, single quotes, no trailing commas, the current print width, Tailwind stylesheet-aware sorting, and generated/static-file exclusion policies.
- Retain ESLint and the Svelte plugin where Oxlint cannot provide equivalent Svelte coverage. Preserve the scoped generic Button exception and zero-warning policy. Document which checker owns which files/rules.
- Keep Svelte checking, framework synchronization, Paraglide generation, and explicit backend TypeScript checking. Add explicit worker typechecking. Vite+ checking is one part of the full quality command, not evidence that every project or Svelte template has been checked.
- Migrate library aliases to declared package subpath imports with explicit extensions. Align the component generator and relevant configuration with the chosen aliases.
- Adopt the new framework TypeScript base with explicit inclusion/exclusion, and isolate the service worker in its own TypeScript project.
- Replace removed worker imports with the new environment, manifest, and path APIs. Account for manifest entries being objects and paths needing resolution; preserve cache membership, build-specific caching, offline language routes, and network behavior for backend/unknown requests.
- Update deprecated environment imports and relocated hook types as required. Verify environment loading through actual commands; introducing Bun runtime flags is not required by this effort.
- Preserve client, server, and Convex test projects and standalone Playwright E2E. Resolve the Svelte browser-test helper's Vitest peer compatibility using supported releases. Do not hide a conflict with forced installs, blanket peer overrides, skipped tests, or reduced coverage; if supported compatibility cannot be achieved, report the blocker with evidence.
- Preserve static prerendering and the existing output directory. Keep the accepted Convex backend architecture and current client integration; no schema or backend API changes are planned.
- Use a supported Node 24 release at or above 24.11 alongside Bun for Vite+ and tests. Align documented/runtime CI requirements with the actual selected versions.
- Update CI commands and contributor instructions together. Validate locally with a dummy public Convex URL and live smoke testing disabled. Hosting configuration may be documented, but changing hosted settings requires separate authorization.

## Testing Decisions

- The primary acceptance seam is the existing complete quality workflow executed from a clean checkout. It covers formatting, linting, frontend/backend/worker types, unit/component/in-memory backend tests, static build, and Playwright behavior. Keep the existing lower-level suites rather than introducing another harness.
- The user accepted the previously proposed quality gates and offline-language browser checks. These existing seams form the testing plan; no new interview or testing interface is needed.
- Good tests assert external behavior: a developer can install/run/build the app, a component renders correctly, and a browser can navigate and reload the localized shell offline. Avoid tests that assert dependency lists, configuration text, deleted files, or migrator implementation details.
- Reuse the existing unit example, Svelte browser component test, in-memory Convex command/query test, navigation test, and offline PWA test. Adapt tests only for supported API changes or meaningful missing assertions.
- Verify a clean frozen installation and that frontend typechecks generate Paraglide output without requiring a prior dev/build run. Check the worker's separate TypeScript project explicitly.
- Run every configured test project. Keep the browser provider aligned with bundled Vitest and prove the Svelte helper works with that runner.
- Build and preview the static app locally, verify existing routes and all configured languages, and run the existing offline test against the migrated module worker. Preserve the test that backend-like requests are not answered by cached shell HTML.
- Set PUBLIC_CONVEX_URL to https://ci.invalid and RUN_CONVEX_SMOKE to 0 for isolated validation. Keep the live counter test opt-in; do not sync Convex or validate against hosted data.
- Ensure every required command propagates failure to the complete quality script and CI. Record actual results and limitations; do not claim CI or hosted-device verification based on local tests.

## Out of Scope

- Game, Round, Seat, authentication, or other product features.
- Convex deployment, schema migration, live database access, or live counter writes.
- Railway deployment or changes to hosted build/preview settings.
- Switching static hosting to a Bun server adapter or adopting new Bun APIs.
- Replacing Svelte diagnostics with a TypeScript-only checker, adding caching infrastructure, or introducing Git hooks.
- Commits, pushes, or pull requests without an explicit request.

## Further Notes

Research was conducted on 14 October 2026. Baseline inspection found Bun pinned to 1.3.14; locked SvelteKit 2.70.3, Svelte 5.57.1, TypeScript 6.0.3, Vite 8.3.1, and Vitest 4.1.11. Framework configuration already uses the Vite plugin. The locked Svelte browser helper declares Vitest 4 support, making its compatibility a required Vite+ migration gate.

Runtime validation was not performed during research: project dependencies were absent and the managed Bun shim could not resolve the pinned binary through registry DNS. Reassess these environmental conditions when implementation starts.

Primary references:

- [Bun 1.4 upgrade changes](https://bun.sh/blog/bun-v1.4) and [Bun 1.4.3 release notes](https://bun.sh/blog/bun-v1.4.3).
- [SvelteKit 3 release and migration command](https://svelte.dev/blog/sveltekit-3-is-here), [migration requirements](https://svelte.dev/docs/kit/migrating-to-sveltekit-3), and [service-worker example](https://svelte.dev/docs/kit/service-workers).
- [Vite+ 1.1.0 release](https://github.com/voidzero-dev/vite-plus/releases/tag/v1.1.0), [migration workflow](https://viteplus.dev/guide/migrate), [migration rules](https://viteplus.dev/guide/migrate-rules), and [Vitest 5 guidance](https://viteplus.dev/guide/vitest-v5).
- [Project-local Vite+](https://viteplus.dev/guide/local-cli), [Oxc compatibility](https://oxc.rs/compatibility), [formatter options](https://oxc.rs/docs/guide/usage/formatter/config-file-reference), and [Tailwind sorting](https://oxc.rs/docs/guide/usage/formatter/sorting).
- [Svelte browser-test helper manifest](https://github.com/vitest-community/vitest-browser-svelte/blob/main/package.json).

Execution tasks are ordered in the accompanying task directory. Each task records migration findings, verification, and remaining limitations under Comments.

## Completion

Implemented on `codex/toolchain-upgrade` in local commits `ae280d3`, `9f04e60`, and
`be21e8c`. All three tasks are resolved, with migration reports and verification
recorded in their Comments. The final toolchain uses Bun 1.4.3, Node 24.21.0,
SvelteKit 3.0.1, and project-local Vite+ 1.1.0.

The final review compared `78efec4...be21e8c`. Both the Standards and Spec axes
reported zero actionable findings. Clean frozen installation and the complete
local quality workflow passed, including all three Vitest projects and localized
offline browser checks. GitHub Actions and hosted/device checks remain unexecuted.
No push, pull request, deployment, hosted setting change, or live data write was
performed.
