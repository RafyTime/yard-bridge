# Issue tracker: GitHub

Specs, tasks, and wayfinding maps live in GitHub Issues for
`RafyTime/yard-bridge`. Use the `gh` CLI for tracker operations.

## Conventions

Run commands inside the clone so `gh` infers the repository. For multiline bodies
and comments, write the text to a temporary UTF-8 file and pass `--body-file`.

- Create: `gh issue create --title "..." --body-file <path>`
- Read: `gh issue view <number> --json number,title,body,labels,comments`
- List: `gh issue list --state open --limit 100 --json number,title,body,labels,assignees`
- Comment: `gh issue comment <number> --body-file <path>`
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Assign: `gh issue edit <number> --add-assignee @me`
- Close: `gh issue close <number>`

Use label and state filters when listing. Paginate API queries or increase limits
when necessary to retrieve the complete result.

GitHub shares issue and PR numbers. Resolve an ambiguous reference with
`gh pr view`, falling back to `gh issue view`.

## Specs and implementation tasks

Publish a spec as an issue. Publish its implementation tasks as sub-issues, with
native blocking relationships.

Create a sub-issue with `gh issue create --parent <parent>`, or attach an existing
issue with `gh issue edit <parent> --add-sub-issue <child>`.

Apply the configured triage labels as directed by the invoking skill.

Keep implementation issues open until their changes merge. Record completion on
a branch in a comment. Use closing references in the integration PR to close the
spec and completed tasks on merge. Pushes and PR creation follow the user's
approval rules.

Decision and research issues can close when their answer is recorded.

## Publishing and fetching

When a skill says "publish to the issue tracker", create a GitHub issue.

When a skill says "fetch the relevant ticket", read the issue's full body and
comments.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Wayfinding operations

- **Map:** one issue labelled `wayfinder:map` containing Destination, Notes,
  Decisions-so-far, Not yet specified, and Out of scope.
- **Child:** a sub-issue labelled `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling`, or `wayfinder:task`. Wayfinding decision tickets use these
  labels without triage labels.
- **Blocking:** use native GitHub issue dependencies.
- **Frontier:** inspect the map's open children in map order. Skip children with
  open blockers or an assignee.
- **Claim:** assign the ticket to the driving developer before work. Re-read before
  claiming. Assignment is a coordination convention, not an atomic lock between
  sessions.
- **Resolve:** post the answer as a comment, close the child, and add a brief
  summary and answer link to the map's Decisions-so-far.

To add a blocker, obtain its database id:

```sh
gh api repos/{owner}/{repo}/issues/<blocker> --jq .id
```

Then add the dependency:

```sh
gh api --method POST repos/{owner}/{repo}/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-database-id>
```

Use the numeric database id, not the issue number or `node_id`. A ticket is
unblocked when all its blockers are closed.

If native sub-issues are unavailable, maintain a task list on the parent and a
`Part of #<parent>` reference on each child. If native dependencies are unavailable,
use `Blocked by: #N, #N` in the child body and check each blocker's state.

## Repository artifacts

Keep `GLOSSARY.md`, ADRs, architecture-review reports, and supporting research or
prototype artifacts in the repository. Link them from issues. GitHub is
authoritative for task status and discussion.

For former local tracker paths and imported history, see
[the migration index](../issue-tracker-migration.md).
