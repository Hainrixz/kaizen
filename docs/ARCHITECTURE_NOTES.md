# Architecture Notes (Kaizen)

Last verified: **February 27, 2026**

## Purpose

Kaizen is a focused project-builder agent that keeps onboarding simple while allowing an optional service runtime and channel integrations.

## Runtime architecture

1. CLI entrypoint
- `kaizen.mjs` is the runtime bootstrap.
- `src/entry.ts` registers all commands and command groups.

2. Config core
- `src/config.ts` owns schema normalization and persistence.
- Config file: `~/.kaizen/kaizen.json`.
- Current schema: `version: 3`.
- v2 configs are auto-migrated during reads.

3. Ability prompt stack
- `src/prompt.ts` builds the execution prompt from profile files:
  - `SYSTEM_PROMPT.md`
  - `WALKTHROUGH.md`
  - `SKILLS_INDEX.md`
  - `WORKFLOW.md`
  - `OUTPUT_TEMPLATE.md`
  - `MARKETPLACE_SKILLS.md`
- Context guard rules are appended through `src/context-guard.ts`.

4. Interactive runtime
- `kaizen start` launches interactive mode.
- `kaizen chat` runs terminal interaction.
- `kaizen ui` runs localhost mode.

5. Service runtime (optional always-on)
- Service command group: `kaizen service ...`.
- `src/service/manager.ts` resolves platform implementation.
- Platform backends:
  - `src/service/launchd.ts` (macOS)
  - `src/service/systemd.ts` (Linux user mode)
  - `src/service/schtasks.ts` (Windows task scheduler)
- Worker entry: `src/service/worker.ts`.

6. Channel runtime (Telegram v1)
- Commands under `kaizen channels telegram ...`.
- API wrapper: `src/channels/telegram/api.ts`.
- Offset persistence: `src/channels/telegram/state.ts`.
- Poll loop and queue: `src/channels/telegram/poller.ts`.
- Scope is DM-only with numeric allowlist enforcement.

7. Model turn execution
- Non-interactive turns use `src/engine/codex-turn.ts`.
- Runtime calls `codex exec` with workspace control and output capture.

## Runtime files

- `~/.kaizen/kaizen.json` (main config)
- `~/.kaizen/run/service.pid` (worker pid)
- `~/.kaizen/run/codex-last-message.txt` (last non-interactive reply)
- `~/.kaizen/state/telegram/update-offset-default.json` (telegram update offset)
- `<workspace>/.kaizen/memory/<ability>.md` (context continuity memory)

## Design defaults

- Run mode default: `manual`.
- Always-on mode is opt-in only.
- Telegram is disabled by default.
- Context guard default threshold: `65%`.
- One model execution queue per worker for deterministic workspace edits.

## Installer model

- `install.sh` (macOS/Linux) and `install.ps1` (Windows).
- Installs global `kaizen` launcher.
- Auto-onboarding and auto-launch can be disabled.
- Post-onboarding behavior is run-mode aware:
  - manual -> `kaizen start`
  - always-on -> `kaizen service install/start/status`
