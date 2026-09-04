# issue_number is re-assigned for custom stories on reorder

`issue_number` is source-dependent: linked (`jira`/`github`) stories show their real external key/number and are never renumbered, whereas custom (`db`) stories show a per-repository Seed index. We decided that when the user drag-reorders stories, the custom stories' `issue_number` values are re-assigned to match the new order and **persisted** on drag-drop.

This **overrides** the earlier rule recorded in `tasks/004-story-numbering.md`, which stated `issue_number` "must never change on reorder — only the visual index changes." Reordering only reorders the repository's `stories` array (_id order) today; we are adding a backend write that also rewrites the custom stories' index.

## Status
Accepted (supersedes the rule in `tasks/004-story-numbering.md`)

## Considered Options
- **Never persist renumber (task 004 rule)**: reorder saves only `_id` order; the frontend derives the shown index from array position at render time. No DB write on drag, but the persisted `issue_number` diverges from what the user visually reordered.
- **Persist renumber on drop** (chosen): the backend re-assigns 1..N to custom stories after the drop so the renumber survives reload. Linked stories keep their external keys. Chosen because the reorder is meaningful and should be durable.

## Consequences
- Reordering a repository writes both the `stories` array and each affected custom story's `issue_number` — a single backend write on drop, not live during drag.
- Linked (`jira`/`github`) stories are excluded from renumbering; only `db` stories participate.
- Future import/export and group-referencing code must not assume `issue_number` is immutable for custom stories.
- A unique per-repo index on `issue_number` was considered but rejected: story creation is effectively serialized (single-click UI + sequential transaction-guarded import), and a per-repo unique index would conflict with custom stories sharing the space with linked stories. The race is theoretical.
