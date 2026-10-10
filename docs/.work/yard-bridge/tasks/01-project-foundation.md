# 01: Establish the project foundation

Type: task
Status: done
Blocked by: None (can start immediately)
Spec: [Approved Yard Bridge spec](../yard-bridge-spec.md)

## What to build

Set up a working Yard Bridge foundation that a developer can run locally, test, and deploy to an early Railway URL. This is the shared setup for the vertical Game tickets that follow. Implementation is complete; the owner reviews the setup documentation before closing this task.

## Acceptance criteria

- [x] A SvelteKit and TypeScript app installs and runs with Bun from a clean checkout. It has the chosen static build path, a minimal responsive shell, and the PWA baseline needed for later installation work.
- [x] shadcn-svelte is installed with shared styling and at least one working control. Card-table design remains for later tickets.
- [x] The app has a basic language-message structure so later screens can add English and Ukrainian copy without replacing the UI foundation.
- [x] A Convex development deployment and typed client connection work from the app. The setup distinguishes local, preview, and production configuration without committing secrets.
- [x] The static app deploys to Railway under a Railway-provided domain for early device testing. A push to the chosen deployment branch updates that environment through CI/CD.
- [x] Linting, formatting, typechecking, build, and test commands run through Bun. CI runs the relevant quality gates for proposed changes and fails when any gate fails.
- [x] The test runner and an end-to-end Convex command-and-view test harness are ready for later Game behavior tests. A small smoke check proves that the app and backend connect.
- [x] Setup documentation covers local development, environment variables, Convex and Railway deployments, CI/CD, and the manual provisioning steps still needed.

## Verification

Verified on 10 October 2026:

- A temporary local clone of commit `48da06f`, with the proposed LF checkout rule, installed using Bun 1.3.14 and the frozen lockfile. It inherited no `.env.local`, dependencies, build output, or generated Paraglide modules from the workspace.
- `bun run test:install` and `bun run quality` passed. Results: zero Svelte diagnostics, Convex TypeScript passed, three Vitest tests passed, static build passed, and two browser tests passed. The live Convex browser test was skipped using `RUN_CONVEX_SMOKE=0` and `PUBLIC_CONVEX_URL=https://ci.invalid`.
- `bun run dev` started in that checkout and served the homepage with HTTP 200. The temporary server was stopped after verification.
- The first Windows clone exposed CRLF conversion under `core.autocrlf=true`; `.gitattributes` now keeps text checkouts in LF format, matching Prettier.
- [GitHub CI run 38049051531](https://github.com/RafyTime/yard-bridge/actions/runs/38049051531) passed on `main`. The earlier failing run demonstrated that a typecheck failure stops CI.
- The owner confirmed Railway deployment, phone PWA installation, and instant shared-counter updates on the PC. Railway uses EU West, Serverless, Wait for CI on `main`, and the development Convex URL.
- [Setup documentation](../../../../README.md) records environment boundaries, Railway build/port settings, backend sync, and remaining provisioning. `.env.example` contains only a public URL placeholder.

The command-and-view harness currently proves a development counter mutation and live query. Authenticated Game and Seat checks belong to subsequent tickets. Production backends, email delivery, backups, cold-start recovery, and the full browser matrix are not claimed by this foundation check.

## Review

Keep `Status: ready-for-human` for the owner's final documentation review. All foundation criteria have implementation or verification evidence above. Next implementation task: [02: email-code sign-in](02-email-code-sign-in.md).

## Comments

- The user requested this foundation ticket and asked that it remain ready-for-human so they can split it into subtasks.
- This ticket establishes infrastructure and development gates. Email-code sign-in and Game behavior begin in later tickets.
