@AGENTS.md

## GitHub Workflow for Future Tasks

Keep `main` as the official Koupa app. For each task, use a separate `codex/<short-task-name>` branch. A commit is a local saved checkpoint, pushing uploads it to GitHub, and a pull request asks to add the branch to `main`. Merge only after the work is reviewed and checks pass, then update local `main` and delete the finished branch.

Codex must not commit, push, merge, or delete branches without the user's explicit request. Before committing, review staged files and run relevant checks. Do not commit credentials, `.env` files, local session logs, generated output, or machine-specific files.

For hard or broad tasks, make a plan before editing. Use sub-agents for independent implementation, investigation, testing, or review when helpful. Review their work, reconcile conflicts, and run the relevant checks yourself before committing or opening a pull request.

## Collaboration Dispatch Safety

- When delegation is requested, invoke the dedicated collaboration API (`spawn_agent` or the supported thread-creation tool) directly. Do not attempt collaboration through `exec`, shell commands, `echo`, `true`, or other no-op fallbacks.
- Do not claim that reviewers were dispatched until the tool returns real agent or thread IDs. Verify those IDs with the collaboration status/read tool before reporting completion.
- Collect spawned-agent results with the collaboration-specific wait/read mechanism, not generic exec-cell polling. If dispatch fails, report the actual tool error and stop; do not fabricate fallback reports.
- Leave child model selection to the Codex spawn system. Do not pass `model` or `reasoning_effort` unless the user explicitly names them.
- Do not pick `grok-4.6`, `gpt-5.6-luna`, or any other slug yourself.
- After `wait_agent`, call `list_agents`. `Wait completed` with no report is not DONE. An `errored` child is a failure.
- Pass integer timeouts only (`180000`, not `180000.0`).
- Do not create an unbounded thread goal while waiting on sub-agents; that loops the parent session.
