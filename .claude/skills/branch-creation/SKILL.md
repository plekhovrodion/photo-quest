---
name: branch-creation
description: Git hygiene for naming branches, writing commits, and formatting GitLab merge requests. Use whenever creating a branch, making a commit, opening or updating an MR, or when the user mentions branch naming, commit messages, MR/PR description, Jira task ID in a branch, or git workflow hygiene — even if they don't explicitly ask for "hygiene."
compatibility: opencode
---

# Branch, Commit, and MR Hygiene

## Overview

Consistent branch names, granular conventional commits, and structured MR descriptions keep history searchable and reviews fast. The team's conventions: Jira-prefixed branch names, one commit per logical unit of work, and MR descriptions that explain what was done and why.

This is a GitLab repository: pull requests are **merge requests (MRs)** and MRs are **squash-merged** into `master`.

## When to Use

- Creating a new branch for a task
- Committing work (deciding granularity or message wording)
- Opening or updating a GitLab merge request
- User mentions branch naming, commit format, MR description, or code-review hygiene

## Branch Naming

Format: `{JIRA_TASK_ID}_{short_description}`

- `JIRA_TASK_ID` — the exact Jira key (e.g. `SQT-6599`)
- `short_description` — 2–5 words, lowercase, words separated by underscores, English
- Branch off the target branch (usually `master`) and keep it rebased/merged up to date

| Good | Why |
|------|-----|
| `SQT-6599_fix_remarks_point` | ID + concise snake_case description |
| `SQT-7001_add_export_to_csv` | Action-oriented, scannable |
| `SQT-7100_refactor_auth_service` | Reflects intent |

Anti-examples: `feature/remarks` (no ID), `my-branch` (no ID, no meaning), `SQT-6599` (no description), `SQT-6599-Fix-Remarks-Point` (wrong separators/case).

```bash
git checkout master
git pull
git checkout -b SQT-6599_fix_remarks_point
```

If there is no Jira task yet, stop and ask the user for the ID — never invent one.

## Commits

### Granularity — one commit per logical completed part

Commit when a piece of work is complete and self-consistent, not at the end of the whole task. A task to lay out three pages → three commits, one per page. Each commit should build on its own and tell one step of the story; a reviewer reading commits in order should follow the progression.

Why this matters even though MRs are squash-merged: granular commits make review faster (a reviewer can check page by page instead of one wall of diff), make `git bisect` useful during the branch's lifetime, and let you revert or rework one part without dragging the rest along. The squash collapses them only at the very end — the review value lives in the MR.

Commit only things that belong together:

- One feature slice, one bug fix, one refactor → one commit
- Don't mix unrelated concerns (a formatting sweep, dead-code removal, and the actual feature) into one commit
- Don't split mechanically by file when changes form a single logical unit

### Message format — Conventional Commits

```
<type>: <short description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`.

- Lowercase, imperative mood, no trailing period
- First line under ~72 characters
- Add a body (separated by a blank line) only when the "why" is not obvious from the diff

```
feat: add remarks point page layout
fix: prevent unauthorized comment posting
refactor: extract permission check into service
docs: describe release flow in README
chore: bump dependencies
```

For multiple commits in one task, vary type and subject to match each part:

```
feat: add remarks point page
feat: add remarks point form validation
test: cover remarks point edge cases
```

Bad: `fix` (no subject) · `Fixed the bug with remarks` (capital, past tense, vague) · `updates` / `wip` / `.` (meaningless) · a single `feat: implement whole task` when the work has distinct parts.

### Staging

Stage intentionally with `git add <paths>` rather than `git add .`, so each commit contains only the logical unit. Use `git add -p` to split changes within a single file across commits when a file spans two logical parts.

## Merge Requests (GitLab)

### Title

`{JIRA_TASK_ID} {краткое описание по-русски}`

The MR title becomes the **squash commit message** in `master`, so make it self-contained and meaningful — this is what ends up in the permanent history.

Example: `SQT-6599 Фикс замечаний по точкам`

### Description

Use the template in `references/mr-templates.md`. Read it and fill **every** section — a reviewer needs two things:

1. **Что было сделано и почему** — the change in plain language, including the problem it solves
2. **Релевантные ссылки** — Jira task, design, related MRs

Open the MR as **Draft** until it is ready for review; switch to **Ready** once tests pass and you have self-reviewed the diff.

### Squash strategy

The team squash-merges, which shapes how commits and MR fit together:

- The granular conventional commits serve the **review process**, not the final history
- The squash commit message defaults to the **MR title** — keep the title clean and descriptive
- Commit bodies do not survive into `master`; put anything reviewers need long-term into the MR description or the code itself

## Workflow at a Glance

1. Take the Jira ID → branch `SQT-XXXX_short_description` off `master`
2. Work in logical parts → commit each with a conventional message
3. Push → open a Draft MR from the template
4. Self-review, pass tests → mark Ready
5. After approval → squash-merge; the MR title becomes the `master` commit

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Branch without Jira ID, or with spaces/uppercase | Use `{ID}_{snake_case}` exactly |
| One commit for the whole task | Split into logical parts, one per concern |
| Vague commit messages (`wip`, `fix`, `updates`) | Conventional type + specific subject |
| MR description left as template placeholders | Fill "что/почему" and relevant links |
| MR title without Jira ID | Prefix with `{JIRA_TASK_ID}` |
| Mixing a formatting sweep or refactor into a feature commit | Separate commit per concern |

## References

- `references/mr-templates.md` — MR description template. Read it when opening an MR and fill every section.
