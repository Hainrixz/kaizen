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
- Current schema: `version: 4`.
- Older configs are auto-migrated during reads.

3. Ability prompt stack
- `src/prompt.ts` builds the execution prompt from profile files:
  - `SYSTEM_PROMPT.md`
  - `WALKTHROUGH.md`
  - `SKILLS_INDEX.md`
  - `DESIGN_SKILLS.md`
  - `WORKFLOW.md`
  - `OUTPUT_TEMPLATE.md`
  - `MARKETPLACE_SKILLS.md`
- Context guard rules are appended through `src/context-guard.ts`.

4. Design skill pack layer
- Stored under `docs/design-skill-pack/`.
- Mirrors curated design-only sources and trusted `skills.sh` sources.
- Keeps Kaizen core runtime unchanged while adding premium UI guidance.
- Source manifest: `docs/design-skill-pack/MIRROR_MANIFEST.json`.

5. Interactive runtime
- `kaizen start` launches interactive mode.
- `kaizen chat` runs terminal interaction.
- `kaizen ui` runs localhost mode on top of the control UI server.
- `kaizen uninstall` performs mode-based full uninstall (`minimal|standard|deep`).
- `kaizen onboard` and `kaizen setup --wizard` trigger post-setup auto-start by default.
- Auto-start fallback prints a manual start command without failing setup.

6. Local Control UI (browser)
- UI package: `ui/` (Vite + Lit + TypeScript).
- Build output: `dist/control-ui`.
- Server modules:
  - `src/ui-server/server.ts` (http + ws startup)
  - `src/ui-server/http.ts` (static assets + bootstrap + health endpoints)
  - `src/ui-server/ws.ts` (WebSocket transport)
  - `src/ui-server/rpc-router.ts` (JSON-RPC style method router)
- HTTP endpoints:
  - `GET /`
  - `GET /health`
  - `GET /__kaizen/control-ui-config.json`
- WS endpoint:
  - `/ws` with request/response/event frames.
- Chat history persistence:
  - `~/.kaizen/state/ui/workspaces/<workspaceHash>/sessions/<sessionId>.json`
  - `~/.kaizen/state/ui/workspaces/<workspaceHash>/index.json`
- UI local prefs:
  - `kaizen.ui.theme` (`dark|light`)
  - `kaizen.ui.density` (`comfortable|compact`)

7. Runtime identity core
- Model runner abstraction:
  - `src/engine/runner.ts`
  - `src/engine/runner-registry.ts`
  - `src/engine/adapters/codex-runner.ts`
- Direct model process execution is isolated to adapter files.
- Heartbeat runtime:
  - `src/runtime/heartbeat.ts`
  - `src/runtime/heartbeat-state.ts`
- Autonomy runtime:
  - `src/runtime/autonomy-runner.ts`
  - `src/commands/autonomy.ts`
- Queue runtime:
  - `src/runtime/queue-types.ts`
  - `src/runtime/queue-store.ts`
  - `src/commands/queue.ts`
- Access boundary enforcement:
  - `src/runtime/access-policy.ts`

8. Service runtime (optional always-on)
- Service command group: `kaizen service ...`.
- `src/service/manager.ts` resolves platform implementation.
- Platform backends:
  - `src/service/launchd.ts` (macOS)
  - `src/service/systemd.ts` (Linux user mode)
  - `src/service/schtasks.ts` (Windows task scheduler)
- Worker entry: `src/service/worker.ts`.

9. Channel runtime (Telegram v1)
- Commands under `kaizen channels telegram ...`.
- API wrapper: `src/channels/telegram/api.ts`.
- Offset persistence: `src/channels/telegram/state.ts`.
- Poll loop and queue: `src/channels/telegram/poller.ts`.
- Scope is DM-only with numeric allowlist enforcement.

10. Model turn execution
- Non-interactive turns use `src/engine/codex-turn.ts` (router).
- Calls route through runner registry to selected adapter.

## Runtime files

- `~/.kaizen/kaizen.json` (main config)
- `~/.kaizen/install.json` (install metadata for uninstall/path cleanup)
- `~/.kaizen/run/service.pid` (worker pid)
- `~/.kaizen/run/autonomy.lock` (active autonomy guard)
- `~/.kaizen/run/full-access-consent.json` (explicit full-access consent marker)
- `~/.kaizen/run/codex-last-message.txt` (last non-interactive reply)
- `~/.kaizen/state/heartbeat/status.json` (heartbeat status)
- `~/.kaizen/state/queue/workspaces/<workspaceHash>.json` (task queue state)
- `~/.kaizen/state/ui/workspaces/<workspaceHash>/...` (local UI chat state)
- `~/.kaizen/state/telegram/update-offset-default.json` (telegram update offset)
- `<workspace>/.kaizen/memory/<ability>.md` (context continuity memory)

## Design defaults

- Run mode default: `manual`.
- Always-on mode is opt-in only.
- Telegram is disabled by default.
- Context guard default threshold: `65%`.
- Autonomy default is off.
- Free-run must be manually started with budget.
- Access scope default is `workspace`.
- One model turn queue is enforced for non-interactive execution.

## Installer model

- `install.sh` (macOS/Linux) and `install.ps1` (Windows).
- Installs global `kaizen` launcher.
- Writes `~/.kaizen/install.json` metadata (install dir, launcher paths, PATH strategy).
- Auto-onboarding and auto-launch can be disabled.
- Post-onboarding behavior is run-mode aware:
  - manual -> `kaizen start`
  - always-on -> `kaizen service install/start/status`
- Installer onboarding is called with `--auto-start false` to avoid double launch, because installer owns final launch sequencing.
