# Issue tracker: Local Markdown

Specs and tasks for this repo live under `docs/.work/`.

## Conventions

- One effort per directory: `docs/.work/<name>/`.
- The spec is `docs/.work/<name>/spec.md`.
- Tasks are separate files at `docs/.work/<name>/tasks/<NN>-<slug>.md`, numbered from `01`.
- Record triage state with a `Status:` line near the top of each task. Use the values in `triage-labels.md`.
- Append discussion under a `## Comments` heading.

## When a skill says "publish to the issue tracker"

Create a task file in the relevant effort's `tasks/` directory. Create the directory if needed.

## When a skill says "fetch the relevant ticket"

Read the task file at the referenced path.

## Wayfinding operations

The map is `docs/.work/<effort>/map.md`, with one task file per child.

- **Map:** Keep Notes, Decisions-so-far, and Fog in `map.md`.
- **Child task:** Create `tasks/<NN>-<slug>.md` with the question in the body. Use a `Type:` line for `research`, `prototype`, `grilling`, or `task`, and a `Status:` line for its state.
- **Blocking:** Put `Blocked by: NN, NN` near the top. A task is unblocked when each listed task is resolved.
- **Frontier:** Scan open, unblocked, unclaimed tasks in number order.
- **Claim:** Set `Status: claimed` and save before starting work.
- **Resolve:** Add the answer under `## Answer`, set `Status: resolved`, and add a short summary with a link to the map's Decisions-so-far.
