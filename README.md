# Kaizen

Focused project-builder agent CLI with guided onboarding, profile-based behavior, optional always-on runtime, and Telegram channel support.

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

During onboarding/install:

- If run mode is `manual`, Kaizen launches `kaizen start`.
- If run mode is `always-on`, Kaizen installs/starts service and prints `kaizen service status`.

## Core commands

- `kaizen onboard`
- `kaizen setup`
- `kaizen start`
- `kaizen chat`
- `kaizen ui`
- `kaizen status`
- `kaizen init <projectName>`

Service commands:

- `kaizen service run`
- `kaizen service install`
- `kaizen service start`
- `kaizen service stop`
- `kaizen service restart`
- `kaizen service status`
- `kaizen service uninstall`

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

Non-interactive always-on requires `--accept-always-on-risk true`.

## Configuration

Config path:

- `~/.kaizen/kaizen.json`

Schema version:

- `version: 3`

Major sections:

- `defaults.runMode`
- `channels.telegram`
- `service`

Older v2 configs are automatically normalized to v3 on read.

## Build from source

```bash
git clone https://github.com/Hainrixz/kaizen.git
cd kaizen
corepack pnpm install
corepack pnpm build
corepack pnpm start
```

## Docs

- `docs/ARCHITECTURE_NOTES.md`
- `docs/RUNTIME_MODES.md`
- `docs/TELEGRAM_CHANNEL.md`
- `docs/SECURITY_DISCLAIMER.md`
