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

## Full uninstall

Kaizen also supports full uninstall with mode-based depth:

```bash
kaizen uninstall --mode standard
```

Modes:

- `minimal`: remove service and launchers only.
- `standard` (default): minimal + remove install dir and `~/.kaizen`.
- `deep`: standard + remove configured workspace metadata folder (`<workspace>/.kaizen`).

Default behavior requires typed confirmation (`uninstall kaizen`), unless `--yes` is passed.

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

Auto-start behavior after onboarding/setup:

- default: enabled (`--auto-start true`)
- disable: `--no-auto-start` or `--auto-start false`
- if launch is not possible in the current environment, Kaizen prints a manual `kaizen start ...` fallback command.
