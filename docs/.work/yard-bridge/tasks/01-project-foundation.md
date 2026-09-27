# 01: Establish the project foundation

Type: task
Status: ready-for-human
Blocked by: None (can start immediately)
Spec: [Approved Yard Bridge spec](../spec.md)

## What to build

Set up a working Yard Bridge foundation that a developer can run locally, test, and deploy to an early Railway URL. This is the shared setup for the vertical Game tickets that follow. The owner will break this broad foundation task into smaller subtasks before implementation.

## Acceptance criteria

- [ ] A SvelteKit and TypeScript app installs and runs with Bun from a clean checkout. It has the chosen static build path, a minimal responsive shell, and the PWA baseline needed for later installation work.
- [ ] shadcn-svelte is installed with shared styling and at least one working control. Card-table design remains for later tickets.
- [ ] The app has a basic language-message structure so later screens can add English and Ukrainian copy without replacing the UI foundation.
- [ ] A Convex development deployment and typed client connection work from the app. The setup distinguishes local, preview, and production configuration without committing secrets.
- [ ] The static app deploys to Railway under a Railway-provided domain for early device testing. A push to the chosen deployment branch updates that environment through CI/CD.
- [ ] Linting, formatting, typechecking, build, and test commands run through Bun. CI runs the relevant quality gates for proposed changes and fails when any gate fails.
- [ ] The test runner and an end-to-end Convex command-and-view test harness are ready for later Game behavior tests. A small smoke check proves that the app and backend connect.
- [ ] Setup documentation covers local development, environment variables, Convex and Railway deployments, CI/CD, and the manual provisioning steps still needed.

## Comments

- The user requested this foundation ticket and asked that it remain ready-for-human so they can split it into subtasks.
- This ticket establishes infrastructure and development gates. Email-code sign-in and Game behavior begin in later tickets.
