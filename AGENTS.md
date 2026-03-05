# AI Agent Usage Guidelines

## Commit Workflow

- Make all modifications cohesively within a single task before committing
- Don't leave partial changes, commit after a cohesive set of changes
- Always commit with the agent as co-author
- **Do NOT push after every commit** - only push when explicitly requested or when necessary (e.g., creating PR, completing work)
- Always build/test the code before committing to ensure no errors are introduced (doc-only changes do not require running tests again)

## Project rules
- No `any`
- All API data must be validated with Zod
- Prefer TanStack Query over manual fetch
- No direct `fetch` outside `api/`
- Tests are required for new API clients

# AI Agent errors
Whenever the AI Agent makes an error, log it in [MISTAKES.md](MISTAKES.md). Periodically, entries should be distilled into directives in the correct section of this file and then removed from MISTAKES.md.

# Tasks
Tasks are tracked in [TODO.md](TODO.md).

## Task file format
- Tasks are markdown checkboxes: `- [ ]` (pending) / `- [x]` (done)
- Headings (`##`, `###`) group tasks by area or theme. Chores can be grouped under a shared heading.
- Nesting is allowed: sub-checkboxes are subtasks of their parent
- Plain bullets (no checkbox) under a task are context or clarifications, not tasks
- Numbered lists indicate ordered steps where sequence matters

## Task workflow
- For each task, create a new branch and a corresponding git worktree
- Before executing a task, generate a plan that includes:
  - Whether the task is appropriate given the current state of the repository
  - Whether the proposed solution is feasible
- Present the plan to the user for approval before proceeding
- Once a task is finished, check it off (`- [x]`)

# Project Configuration
## Initialize project
- Set up the TypeScript project for the SPA `rulo`
