# Runtime Modes

Kaizen supports two runtime modes configured in `~/.kaizen/kaizen.json`:

- `manual` (default)
- `always-on` (opt-in)

## Manual mode

- Kaizen runs in the terminal foreground.
- Closing the terminal stops Kaizen.
- Best default for local-only work and lower exposure.

Use:

```bash
kaizen start
```

## Always-on mode

- Kaizen runs through OS service facilities.
- It keeps running after terminal close.
- Requires explicit risk acceptance during onboarding/setup.

Service backends:

- macOS: launchd user agent
- Linux: systemd user service
- Windows: scheduled task

Service lifecycle:

```bash
kaizen service install
kaizen service start
kaizen service status
kaizen service stop
kaizen service restart
kaizen service uninstall
```

## Foreground worker mode

For debugging or temporary channel processing:

```bash
kaizen service run
```

This keeps worker execution tied to the current terminal session.

## Onboarding flags

Set mode non-interactively:

```bash
kaizen onboard --non-interactive --run-mode manual
```

```bash
kaizen onboard --non-interactive --run-mode always-on --accept-always-on-risk true
```
