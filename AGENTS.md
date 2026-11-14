# AGENTS.md

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Toolchain**: pinned project-local Vite+, ESLint, Playwright, Tailwind CSS, SvelteKit, Paraglide

## Verification

Run `bun run quality` after completing a unit of work. Vite+ owns formatting,
JS/TS correctness linting, and Vitest; ESLint preserves Svelte and existing TS rules.
Frontend checks generate Paraglide before Svelte diagnostics; backend and worker
checks use separate TypeScript projects. See README's Quality checks and CI for
runtime pins, tool configuration ownership, and isolated validation.

## Agent skills

### Issue tracker

Specs, tasks, and wayfinding maps live in GitHub Issues.
Read `docs/agents/issue-tracker.md` before tracker operations.

### Triage labels

Use the five default triage roles. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single root `GLOSSARY.md` and `docs/adr/`.
Read `docs/agents/domain.md` before exploring domain code.

## Convex

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`src/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
