# Domain docs

Read the root `CONTEXT.md` before exploring code that uses domain terms. Read relevant ADRs in `docs/adr/` before changing an area they cover.

This repo uses a single context:

- `CONTEXT.md` holds the domain glossary and model.
- `docs/adr/` holds architecture decisions.

These files can be created when terms or decisions are resolved. Their absence does not block other work.

Use the terms defined in `CONTEXT.md` in issue titles, proposals, tests, and code. If a needed term is missing, check whether it reflects a real gap in the model. Surface any conflict with an existing ADR explicitly.

## Architecture reviews

Store dated HTML reports in `docs/architecture-reviews/`, named
`YYYY-MM-DD-<scope>.html`. Add a short suffix when reviewing the same scope more
than once that day.

Keep the reviewed commit, scope, approval status, and links to follow-up specs or
tasks in the report. Preserve the original findings when adding approval or
follow-up links. Reports contain proposals; accepted architecture decisions belong
in `docs/adr/`, and specs and implementation tasks belong in `docs/.work/`.

Open reports in a browser. Tailwind and Mermaid load from CDNs; text and custom
diagrams remain readable offline.
