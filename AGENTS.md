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

## Issue tracker

Specs and tasks are local Markdown files under `docs/.work/`. See `docs/agents/issue-tracker.md`.

## Triage labels

Use the default five triage roles as task statuses. See `docs/agents/triage-labels.md`.

## Domain docs

Use a single root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

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
