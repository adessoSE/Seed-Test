# Seed-Test

An open-source BDD UI-testing platform. Stories live under repositories (projects) that may be pure Seed projects, or linked to an external tracker (Jira or GitHub).

## Language

**Story source** (`storySource`):
Where a story's content and numbering come from. One of `jira`, `github`, or `db`. `db` is the custom-local marker: a locally-created Seed story, regardless of whether its repository is linked to an external tracker. Linked (`jira`/`github`) stories carry an external tracker reference; `db` stories are authored in Seed.
_Avoid_: "custom" as a separate source (there is no `custom` value — `db` is it), "source" (ambiguous with repo `repo_type`/`source` used at the repo level).

**Issue number** (`issue_number`):
The display number shown for a story. Its meaning is source-dependent:
- Linked stories (`storySource` = `jira`/`github`) — the real external issue key/number from the tracker (a Jira key like `PROJ-123` or a GitHub issue number).
- Custom stories (`storySource` = `db`) — a per-repository Seed index (1, 2, 3, …).
Never interpret `issue_number` without first knowing the story's source.
_Avoid_: treating `issue_number` as a single consistent semantic across all stories.

**Reorder**:
The user drags stories in the UI to change their order within the repository. The repository's `stories` array order is persisted. For custom (`db`) stories the `issue_number` is re-assigned to match the new order on drag-drop; linked stories keep their external number. See ADR-0001.
