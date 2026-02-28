# Kaizen

Focused project-builder agent CLI with guided onboarding, profile-based behavior, optional always-on runtime, and Telegram channel support.  
Kaizen runtime logic is independent; model providers are plugged in as backend adapters (Codex is the first adapter).

## Install

macOS / Linux:

```bash
curl -fsSL https://tododeia.com/install.sh | bash
```

Windows (PowerShell):

```powershell
iwr -useb https://tododeia.com/install.ps1 | iex
```

Installer flags:

- `--no-onboard` (skip onboarding during install)
- `--no-launch` (install only; do not auto-start)

Examples:

```bash
curl -fsSL https://tododeia.com/install.sh | bash -s -- --no-onboard --no-launch
```

```powershell
$env:KAIZEN_AUTO_ONBOARD=0
$env:KAIZEN_AUTO_LAUNCH=0
iwr -useb https://tododeia.com/install.ps1 | iex
```

## Runtime model

Kaizen supports two runtime modes:

1. `manual` (default): Kaizen runs in foreground and stops when the terminal closes.
2. `always-on` (opt-in): Kaizen runs as an OS service (`launchd`, `systemd --user`, or Windows `schtasks`).

Heartbeat:

- heartbeat is enabled by default in both manual and service runtime contexts.
- heartbeat writes status to `~/.kaizen/state/heartbeat/status.json`.
- if autonomy is enabled in `queued` mode, heartbeat can execute queued tasks.

Autonomy defaults:

- autonomy is `off` by default.
- default autonomy mode is `queued`.
- `free-run` requires explicit manual start and budget (`max turns` + `max minutes`).

Kaizen also provides a local browser UI at `localhost:3000` with chat, runtime status, service controls, telegram controls, and profile file references.

UI defaults:

- dark-first premium theme
- manual light-mode toggle
- local preference persistence (`kaizen.ui.theme`, `kaizen.ui.density`)

During onboarding/install:

- If run mode is `manual`, Kaizen launches `kaizen start`.
- If run mode is `always-on`, Kaizen installs/starts service and prints `kaizen service status`.
- Direct `kaizen onboard` and `kaizen setup --wizard` also auto-start Kaizen by default.
- Disable this with `--no-auto-start` (or `--auto-start false`).

## Core commands

- `kaizen` (no args): launch interactive mode using saved config defaults
- `kaizen config` (or `kaizen settings`): switch saved defaults like terminal vs localhost
- `kaizen onboard`
- `kaizen setup`
- `kaizen start`
- `kaizen chat`
- `kaizen ui`
- `kaizen status`
- `kaizen uninstall`
- `kaizen autonomy status|configure|enable|disable|start|stop`
- `kaizen queue add|list|remove|clear|run-next`
- `kaizen init <projectName>`

Use `kaizen --help` to show full command help.

Quick examples:

```bash
kaizen config
```

```bash
kaizen config --interaction localhost
```

```bash
kaizen config --interaction terminal
```

`kaizen ui` options:

- `--host <host>` (default `127.0.0.1`)
- `--port <port>` (default `3000`)
- `--no-open` (do not auto-open browser)
- `--session <id>` (chat history session override)

Service commands:

- `kaizen service run`
- `kaizen service install`
- `kaizen service start`
- `kaizen service stop`
- `kaizen service restart`
- `kaizen service status`
- `kaizen service uninstall`

## Uninstall

Use `kaizen uninstall` for full Kaizen removal flow.

Modes:

- `minimal`: remove service + launchers, keep install code and `~/.kaizen` data.
- `standard` (default): `minimal` plus remove install directory and `~/.kaizen`.
- `deep`: `standard` plus remove `<configured-workspace>/.kaizen`.

Examples:

```bash
kaizen uninstall
```

```bash
kaizen uninstall --mode minimal --yes
```

```bash
kaizen uninstall --mode deep --yes
```

Options:

- `--mode <minimal|standard|deep>`
- `--yes` (skip typed confirmation)
- `--no-path-cleanup` (skip shell/User PATH cleanup)

By default, uninstall requires typing `uninstall kaizen` to confirm.
Codex OAuth login state is not changed by Kaizen uninstall.

Telegram commands:

- `kaizen channels telegram setup`
- `kaizen channels telegram status`
- `kaizen channels telegram disable`
- `kaizen channels telegram test --to <chatId> --message <text>`

## Onboarding flags

`kaizen onboard` supports:

- `--run-mode manual|always-on`
- `--enable-telegram true|false`
- `--telegram-bot-token <token>`
- `--telegram-allow-from <csv>`
- `--accept-always-on-risk true`
- `--auto-start true|false`
- `--no-auto-start`

Non-interactive always-on requires `--accept-always-on-risk true`.

If auto-start cannot open an interactive session (for example in restricted script environments), setup still succeeds and Kaizen prints the exact manual `kaizen start ...` command.

## Configuration

Config path:

- `~/.kaizen/kaizen.json`

Schema version:

- `version: 4`

Major sections:

- `defaults.runMode`
- `channels.telegram`
- `service`
- `engine.runner`
- `heartbeat`
- `autonomy`
- `access`
- `queue`
Older configs are automatically normalized to v4 on read.

`kaizen config` now supports:

- `--interaction terminal|localhost`
- `--autonomy on|off`
- `--access workspace|workspace-plus|full`
- `--allow-path <path>` (repeatable for `workspace-plus`)

## Design skill pack

Kaizen keeps design guidance in a separate layer so core runtime behavior stays stable.

- mirrored design sources: `building-components`, `web-design-guidelines`, `vercel-react-best-practices`
- trusted marketplace sources: curated `skills.sh` UI/UX and frontend set
- active prompt layer: `DESIGN_SKILLS.md` (web-design ability)

## Build from source

```bash
git clone https://github.com/Hainrixz/kaizen.git
cd kaizen
corepack pnpm install
corepack pnpm build
corepack pnpm start
```

UI development:

```bash
corepack pnpm ui:dev
```

## Docs

- `docs/ARCHITECTURE_NOTES.md`
- `docs/RUNTIME_MODES.md`
- `docs/AUTONOMY.md`
- `docs/ACCESS_BOUNDARIES.md`
- `docs/QUEUE_RUNTIME.md`
- `docs/TELEGRAM_CHANNEL.md`
- `docs/SECURITY_DISCLAIMER.md`
- `docs/LOCAL_UI_ARCHITECTURE.md`
- `docs/LOCAL_UI_RPC.md`
- `docs/UI_STYLE_GUIDE.md`
- `docs/DESIGN_SKILL_USAGE.md`
- `docs/design-skill-pack/README.md`
