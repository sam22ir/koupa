# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains Koupa's Expo service and domain foundation; its previous frontend routes, components, assets, and design system were intentionally removed. Until the replacement frontend is approved, keep route and UI directories absent. When the frontend is rebuilt, keep route files in `app/` (or `src/app/` if that convention is adopted), reusable UI and feature code in `components/` and `features/`, hooks in `hooks/`, static files in `assets/`, and tests in `__tests__/` or beside the modules they cover. Keep generated native/build output such as `android/`, `dist/`, and `.expo/` out of commits unless the project deliberately uses a prebuild/bare workflow.

## Product Reference

Use [`reference/KOUPA-PRODUCT-SPEC.md`](reference/KOUPA-PRODUCT-SPEC.md) as the reference file and source of truth for Koupa’s product requirements, user flows, booking rules, backend responsibilities, localization, release decisions, and future design decisions. Update that document when agreed product or design decisions change.

### Brand Name

Always write the Arabic brand name as `كوپا`, using the Persian letter `پ`. Do not use alternative Arabic spellings. Apply this spelling consistently in UI copy, accessibility labels, design documentation, tests, and generated content.

## Build, Test, and Development Commands

Use the package-manager scripts defined in `package.json`; the frontend is intentionally absent until rebuilt:

```sh
npm install                 # install dependencies
npm test                    # run preserved domain/service tests
npm run typecheck           # TypeScript noEmit check
npm run test:ci             # typecheck + jest
npm run db:types            # regenerate src/types/database.ts from linked Supabase
npx expo lint               # run Expo/ESLint checks, when configured
npx expo config --type public # validate native configuration
```

Prefer reproducible commands that work from a clean checkout and avoid committing machine-specific setup.

### Backend / domain notes

- Product requirements: [`reference/KOUPA-PRODUCT-SPEC.md`](reference/KOUPA-PRODUCT-SPEC.md)
- Improvement plan: [`reference/IMPROVEMENT-PLAN.md`](reference/IMPROVEMENT-PLAN.md)
- Frontend integration contract: [`reference/FRONTEND-CONTRACT.md`](reference/FRONTEND-CONTRACT.md)
- Ops: [`reference/BOOKING-OPERATIONS.md`](reference/BOOKING-OPERATIONS.md), [`reference/PUSH-NOTIFICATIONS.md`](reference/PUSH-NOTIFICATIONS.md), [`reference/RPC-SECURITY-AUDIT.md`](reference/RPC-SECURITY-AUDIT.md)
- Typed Supabase client lives in `lib/supabase.ts` (`createClient<Database>`). Regenerate types after migrations with `npm run db:types` (requires linked project; Docker/local Supabase preferred when available).
- Prefer Supabase CLI ≥ `2.110` on `PATH` (`~/.local/bin` may shadow older `/usr/local` installs).
- Default linked project is **staging** (`zhdwaizroczkqzwrvfxf`). Only temporarily link production for audits/deploys, then re-link staging.
- Data access belongs in `src/services/*`. Hooks in `src/hooks/*` should stay thin React adapters (`useSession` remains the auth façade).
- Do not commit `google-services*.json` or `.env*.local`.

## Coding Style & Naming Conventions

Use TypeScript where available, two-space indentation, and the repository’s configured Prettier/ESLint rules. Name React components and screens with `PascalCase`, hooks with `usePascalCase`, and ordinary functions, variables, and route groups with `camelCase` or the adopted route convention. Keep platform-specific files explicit, such as `Component.android.tsx`.

## Testing Guidelines

Use Jest for preserved domain and service behavior. When the frontend is rebuilt, add React Native Testing Library and UI tests for user-visible behavior. Keep tests deterministic and avoid relying on emulator state. Run the full suite before submitting.

## Commit & Pull Request Guidelines

Use concise imperative commit subjects, such as `Add appointment screen` or `Fix Android deep link`. Keep commits focused. Pull requests should describe the user impact, list verification commands and device/emulator details, link related issues, and include screenshots or recordings for UI changes. Call out Expo config, native Android, dependency, or migration changes explicitly.

### GitHub Workflow for Codex Tasks

Treat `main` as the official version of Koupa. Do new work on a separate branch named `codex/<short-task-name>`, then commit, push, and open a pull request before adding the work to `main`.

- A branch is a separate working copy for one task.
- A commit is a saved checkpoint on the local machine.
- Pushing uploads the branch and its commits to GitHub.
- A pull request asks for the branch to be added to `main`.
- Merging accepts the pull request and updates the official app.

Before starting work, update `main` and create a feature branch. Before committing, review the staged files and run the relevant checks. Codex must not commit, push, merge, or delete branches unless the user explicitly requests that action. After a pull request is merged, update local `main` and remove the finished feature branch locally and on GitHub. Never commit credentials, local session logs, generated output, or other machine-specific artifacts.

For difficult or wide-ranging tasks, plan the work before editing. Use sub-agents for independent implementation, investigation, testing, or review tasks when that improves coverage or speed. Review each sub-agent's findings and changes, resolve conflicts or inconsistencies, and run the relevant checks yourself before committing or opening a pull request.

## Security & Configuration

Do not commit credentials, tokens, signing keys, keystores, or `.env` files. Document required variables in `.env.example` and use Expo-compatible public variable naming only for values safe to ship to the client. Keep Android signing credentials and production secrets in the approved secret store. Review `app.json`/`app.config.*` and native Android changes carefully before merging.

## Collaboration Dispatch Safety

- When delegation is requested, invoke the dedicated collaboration API (`spawn_agent` or the supported thread-creation tool) directly. Do not attempt collaboration through `exec`, shell commands, `echo`, `true`, or other no-op fallbacks.
- Do not claim that reviewers were dispatched until the tool returns real agent or thread IDs. Verify those IDs with the collaboration status/read tool before reporting completion.
- Collect spawned-agent results with the collaboration-specific wait/read mechanism, not generic exec-cell polling. If dispatch fails, report the actual tool error and stop; do not fabricate fallback reports.

## Spawn-agent defaults

Leave child model selection to the Codex spawn system. Do not pass `model` or `reasoning_effort` to `spawn_agent` unless the user explicitly names them.

Codex resolves a child model in this order: explicit spawn value, then `agents.default_subagent_model`, then the parent session. This machine has no `[agents]` default, so omitting `model` is the default path.

Do not pick `grok-4.6`, `gpt-5.6-luna`, or any other slug yourself. The spawn tool may advertise Luna; ignore that unless the user asked for that model.

- After `wait_agent`, call `list_agents`. `{"message":"Wait completed.","timed_out":false}` is not a DONE report. An `errored` child is a failure; do not invent a status.
- Pass integer timeouts only (`180000`, not `180000.0`). A float timeout is rejected.
- Do not create an unbounded thread goal such as "do the 13 tasks" while waiting on sub-agents. That auto-continues the parent and loops the same status message until the session is unusable.

## Codex Multi-Agent v2

The second supported delegation path is Codex CLI's v2 workflow. Enable
`features.multi_agent_v2=true` and do not pin `--model`. Let Codex use the
active session default.

```bash
codex -c features.multi_agent_v2=true \
  "Use multi-agent v2. Delegate these independent tasks to separate sub-agents in parallel, wait for all results, then combine them: <task>"
```

Use the collaboration tool directly for delegation. Do not delegate through
`exec`, shell commands, or generated shell text.

The `codex exec` command below is verification only; it does not replace direct
collaboration dispatch.

For a non-interactive check, use `codex exec --ephemeral --json --sandbox
read-only` with the same model and feature overrides. Confirm delegation from
JSONL `collab_tool_call`, `agent_message`, and `turn.completed` events. Do not
pass `--ask-for-approval` to `codex exec`.
