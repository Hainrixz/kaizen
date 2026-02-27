# Security Disclaimer

Kaizen can run in manual mode or optional always-on mode. Always-on mode increases exposure and must be enabled intentionally.

## Core warning

If you enable always-on mode, Kaizen may continue processing channel messages after your terminal is closed.

Only enable always-on mode when:

- machine access is trusted
- channel allowlists are strict
- you understand command execution risk in your workspace

## Recommended defaults

- Keep run mode on `manual` unless needed.
- Keep Telegram disabled unless actively used.
- Use Telegram allowlists with only known numeric IDs.
- Review `kaizen status` and `kaizen service status` regularly.

## Token handling

- Telegram bot tokens are stored in Kaizen config by default.
- Treat `~/.kaizen/kaizen.json` as sensitive.
- Avoid sharing logs/screenshots containing token values.

## Service controls

Disable always-on runtime quickly:

```bash
kaizen service stop
kaizen service uninstall
```

Disable Telegram quickly:

```bash
kaizen channels telegram disable
```

## Operational note

Kaizen is a local operator tool. You are responsible for:

- workspace permissions
- secrets in checked-out repos
- channel configuration and user access
