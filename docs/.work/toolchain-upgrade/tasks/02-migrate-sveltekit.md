# 02: Run the localized static PWA on SvelteKit 3

**What to build:** A contributor can develop, build, and verify Yard Bridge on stable SvelteKit 3, and players retain working language navigation and offline shell reloads. Use the official migrator first, finish its remaining compatibility fixes, and align CI and contributor guidance with the verified framework workflow.

**Blocked by:** 01 (Run the project on Bun 1.4.3). Its verified baseline isolates framework migration failures from the Bun upgrade.

**Status:** resolved

Spec: [Toolchain upgrade](../spec.md)

- [x] Check the latest Kit 2 release and deprecation warnings, satisfy documented prerequisites, and run the official SvelteKit 3 migrator before manual framework changes.
- [x] Record the migrator version, command, findings, generated TODOs, and their resolution. If prerequisites block execution, record the minimal repair and retry.
- [x] Stable Kit 3 and compatible framework dependencies resolve without hidden peer conflicts; a clean frozen installation succeeds.
- [x] Library subpath imports, component-generator aliases, environment imports, hook types, and framework TypeScript settings work with Kit 3.
- [x] Framework synchronization and Paraglide generation work from a clean checkout without a prior dev or build run.
- [x] The service worker uses supported APIs, resolves manifest entry paths correctly, and passes an explicit check in its own TypeScript project.
- [x] The complete quality workflow passes, including frontend, backend, and worker checking, all existing test projects, static build, language navigation, and offline shell behavior.
- [x] Cached shell responses remain limited to known shell assets; backend and unknown requests retain their network behavior, and the static output contract is preserved.
- [x] CI configuration and contributor/agent guidance match the verified framework commands and preserve every required quality gate and its failure propagation.
- [x] Validation stays isolated using the dummy backend URL and disabled live smoke testing; preserve the existing Convex client integration without hosted writes or deployment changes.
- [x] Record exact versions, commands, results, migration findings, and limitations under Comments, distinguishing local verification from unexecuted CI or hosted checks.

## Comments

Implemented on 14 October 2026 using Bun `1.4.3` and Node `24.21.0`, in an isolated worktree based on the verified Bun stage.

- Latest Kit 2 was verified as `2.70.3` (the existing lockfile). Its frontend check and static build passed without framework deprecation warnings. Original manifest, lockfile, config, original migration report, reviewed report, exact versions and command logs are preserved in `/tmp/yard-bridge-sveltekit-evidence`.
- After reading help, ran `bunx sv@1.1.1 migrate sveltekit-3 --tasks all --confirm --install bun --no-git-check` before manual framework changes. The git-check bypass covered only the claimed ticket; the starting implementation was clean. All 12 migration tasks and dependency installation succeeded. It updated dependencies, package subpath imports, environment declarations/imports, hook types, path calls, and the root TypeScript base.
- Resolved framework versions are Kit `3.0.1`, adapter-static `4.0.0`, vite-plugin-svelte `7.3.1`, Svelte `5.57.1`, svelte-check `4.7.6`, and TypeScript `6.0.3`. Vite remains `8.3.1`, Vitest `4.1.11`, browser provider `4.1.11`, and browser Svelte helper `2.2.1`; the original runner evidence is preserved for ticket 03. Installation reported no peer warnings or overrides.
- Reviewed every `MIGRATION_TASKS.md` finding: replaced the removed worker module with `$app/service-worker`, `$app/env`, `$app/manifest` and `$app/paths`; moved the entry to `src/service-worker/index.ts`; resolved object-shaped immutable/static/prerendered paths; added the separate worker TypeScript project and required `check:worker` gate. Development assets are same-origin, so the broad CORS finding needed no change. No `@migration-task` comments remained. Deleted the report only after its required checks/build/tests passed, as its final instruction requests.
- Existing checking exposed the expected removed-worker error plus a Paraglide integration error absent from the generated report: Kit 3 makes `event.request` immutable. Passing `{ ...event, request }` to `resolve` preserves the middleware request without mutating the event. Kit 3's manifest declares immutable paths as `string`, while `resolve` accepts route-derived `Path`; the trusted manifest boundary uses `path as Path`, and the shell membership set remains `Set<string>` for request matching. Root checking excludes the separate backend and worker projects, whose explicit checks remain required.
- The existing check/build seams were red immediately after migration and green after these compatibility fixes. Retained all existing test projects and strengthened the offline browser test's locale assertions plus GET/backend/unknown-route bypass. Static output remains `build/`. The module worker retains cache membership limited to known shell assets, build-specific caching, old-cache cleanup, and the original query/method/origin guards.
- A fresh tracked-file copy at `/tmp/yard-bridge-sveltekit-clean`, initially without dependencies or Paraglide output, passed `bun install --frozen-lockfile` and the complete `bun run quality`: authored formatting, zero-warning ESLint, frontend/backend/worker checking, all three Vitest projects (3 tests), static build, and Playwright (2 passed, opt-in live smoke skipped). Lockfile SHA-256 remained `00093cc12aaa66dba10fd336d64c366c057b86ffd5c6fb019ac95a37078a006a` across the frozen install. Frontend checking generated Paraglide output before any build/dev command.
- With shell `PUBLIC_CONVEX_URL` unset, ordinary commands loaded `https://ci.invalid` from the fresh copy's `.env.local` and embedded it in the built client. Dev on isolated localhost port 4174 returned HTTP 200 and matching `html lang` for `/`, `/es`, `/uk`, and `/uk/demo/paraglide`; Playwright exercised the documented preview command and offline language reloads. All local servers were stopped. In another disposable copy, `shadcn-svelte@1.7.0 add button --no-deps-install --yes --overwrite` resolved the updated generator aliases and generated the explicit `#lib/utils.js` import successfully.
- README now describes Kit 3's package imports, TypeScript base and module worker checking. CI's existing failing `bun run check` step automatically includes the new worker gate; its step name now makes that coverage explicit. Existing repository agent guidance still applies; final Vite+ contributor/agent guidance is ticket 03's scope.
- Local tests passed despite Kit 3 reporting that Vitest 4's browser `transformIndexHtml` plugin is unsupported; preserve this finding for the runner migration in ticket 03. Build/test logs also contain harmless Node color-environment warnings. GitHub Actions, hosted deployment/device checks, and live counter writes were not run. Validation used only the dummy backend URL with `RUN_CONVEX_SMOKE=0`; no Convex source/API/schema changes, synchronization, hosted data, or hosting settings were touched.

## Answer

The localized static PWA now runs on stable SvelteKit 3 with the official migration completed, explicit backend/worker checks, reproducible frozen installs, and the complete quality workflow verified locally. This completes the [SvelteKit stage of the implementation decisions](../spec.md#implementation-decisions).
