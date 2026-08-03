@AGENTS.md

## GitHub Workflow for Future Tasks

Keep `main` as the official Koupa app. For each task, use a separate `codex/<short-task-name>` branch. A commit is a local saved checkpoint, pushing uploads it to GitHub, and a pull request asks to add the branch to `main`. Merge only after the work is reviewed and checks pass, then update local `main` and delete the finished branch.

Codex must not commit, push, merge, or delete branches without the user's explicit request. Before committing, review staged files and run relevant checks. Do not commit credentials, `.env` files, local session logs, generated output, or machine-specific files.

For hard or broad tasks, make a plan before editing. Use sub-agents for independent implementation, investigation, testing, or review when helpful. Review their work, reconcile conflicts, and run the relevant checks yourself before committing or opening a pull request.

## Collaboration Dispatch Safety

- When delegation is requested, invoke the dedicated collaboration API (`spawn_agent` or the supported thread-creation tool) directly. Do not attempt collaboration through `exec`, shell commands, `echo`, `true`, or other no-op fallbacks.
- Do not claim that reviewers were dispatched until the tool returns real agent or thread IDs. Verify those IDs with the collaboration status/read tool before reporting completion.
- Collect spawned-agent results with the collaboration-specific wait/read mechanism, not generic exec-cell polling. If dispatch fails, report the actual tool error and stop; do not fabricate fallback reports.
