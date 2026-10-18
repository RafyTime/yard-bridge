# 01: Run the project on Bun 1.4.3

**What to build:** A contributor can install, develop, build, and verify Yard Bridge using Bun 1.4.3, with CI configuration and contributor guidance matching the working commands. Preserve the existing static localized PWA and package linker behavior.

**Blocked by:** None (can start immediately).

**Status:** resolved

Spec: [Toolchain upgrade](../spec.md)

- [x] Establish the isolated baseline and record actual results. Resolve environmental blockers before claiming successful validation.
- [x] Bun 1.4.3 is the project pin and the version selected by CI; lockfile migration and dependency changes are reviewed.
- [x] A clean checkout installs with a frozen lockfile using Bun 1.4.3 and retains the existing linker behavior.
- [x] Documented development and preview commands work, and the static build preserves the existing output contract and configured language routes.
- [x] The complete existing quality workflow passes, including unit, browser component, in-memory Convex, and offline PWA tests; environment loading works through the actual commands.
- [x] CI configuration and contributor guidance match the verified Bun workflow, retain browser installation and all required gates, and propagate failures.
- [x] Validation uses the dummy public backend URL and disables live smoke testing. No hosted data, backend synchronization, or hosted settings are touched.
- [x] Record versions, commands, verification results, and remaining limitations under Comments, distinguishing local verification from unexecuted CI or hosted checks.

## Comments

Implemented on 14 October 2026. Framework and Vite+ migration remain in the following tickets.

- Verified `bun@1.3.14` and `bun@1.4.3` against the public npm registry and [official release notes](https://bun.sh/blog/bun-v1.4.3). Used isolated Linux x64 binaries in `/tmp` and Node `24.21.0`. Original manifests, CI configuration and logs are preserved in `/tmp/yard-bridge-bun-evidence`.
- Bun 1.3.14 baseline: frozen installation passed without changing the lockfile. Sandbox-blocked Paraglide plugin downloads caused incomplete generated types; retrying with network access passed. After installing Chromium 1243, the complete `bun run quality` passed: formatting, zero-warning lint, frontend/backend types, all three Vitest projects (3 tests), static build, and Playwright (2 passed, 1 opt-in live-backend test skipped).
- Baseline compilation exposed a repeat formatting failure on Inlang-generated `project.inlang/.meta.json` and `project.inlang/README.md`. Adding only those paths to `.prettierignore` made the existing gate pass without changing authored-file coverage or formatter settings.
- Pinned `bun@1.4.3` and explicitly retained the observed hoisted layout through `bunfig.toml`. `bun install` and `bun install --lockfile-only --save-text-lockfile` both reported no changes: dependencies and `lockfileVersion: 1` / `configVersion: 1` were retained. Lockfile SHA-256 stayed `28666a13c7dac4da5336280f0bf26c7d45f4418fbe24d74cda2496b165379329`; no manual lockfile edit was needed.
- A fresh tracked-file copy at `/tmp/yard-bridge-bun-clean`, initially without dependencies or generated Paraglide output, passed `bun install --frozen-lockfile` and the complete Bun 1.4.3 quality workflow with the same test counts. The final implementation worktree also passed the complete quality workflow. Frontend checking generated Paraglide output. With the shell public URL unset, normal commands loaded the dummy `PUBLIC_CONVEX_URL=https://ci.invalid` from `.env.local` and embedded it in the static client; `RUN_CONVEX_SMOKE=0` remained set.
- Bun 1.4.3's `bun run dev --host 127.0.0.1 --port 4174 --strictPort` returned HTTP 200 for `/`, `/es`, `/uk`, and `/uk/demo/paraglide`. E2E exercised the documented preview command, every-locale offline reloads, and backend-request cache bypass. Static output remains `build/`, with localized pages and the worker. Verified local servers were stopped afterward.
- README records the runtime requirements, linker and isolated commands. Existing CI already reads Bun's pin from `package.json`, installs the frozen dependencies and Chromium/system dependencies, and runs every quality gate as a failing step. No redundant pin or workflow change was needed.
- Validation used only the dummy backend URL and disabled live smoke; no hosted data, Convex synchronization, hosting settings, pushes or PRs were touched. GitHub Actions and hosted/device checks were not executed. Playwright used its Ubuntu 24.04 fallback for this unsupported Linux distribution; local browser suites passed.

## Answer

Bun 1.4.3 is pinned and verified with frozen installs, the preserved hoisted linker, and the complete existing quality workflow. Contributor guidance and CI's existing manifest-based Bun selection agree with the verified commands. This completes the [Bun stage of the implementation decisions](../spec.md#implementation-decisions).
