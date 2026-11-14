# Domain docs

## Before exploring

Read the root `GLOSSARY.md` before exploring code that uses domain terms. Read
relevant ADRs in `docs/adr/` before changing an area they cover.

This repository uses a single context:

- `GLOSSARY.md` holds the domain glossary and model.
- `docs/adr/` holds accepted architecture decisions.

If either is absent, proceed without creating placeholder documents. Domain
modeling creates them when terms or decisions are resolved.

## Vocabulary and decisions

Use the glossary's terms in issues, proposals, tests, and code. If a needed term is
missing, determine whether it reflects a gap in the model. Surface conflicts with
existing ADRs explicitly.

## Architecture reviews

Store dated HTML reports in `docs/architecture-reviews/`, named
`YYYY-MM-DD-<scope>.html`. Add a short suffix when reviewing the same scope more
than once that day.

Keep the reviewed commit, scope, approval status, and links to follow-up GitHub
issues in the report. Preserve original findings when adding approval or follow-up
links.

Reports contain proposals. Accepted decisions belong in `docs/adr/`; specs and
implementation tasks belong in GitHub Issues.

Open reports in a browser when reviewing them. Tailwind and Mermaid load from
CDNs; text and custom diagrams remain readable offline.
