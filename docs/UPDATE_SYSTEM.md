# Update System

Kaizen uses a release-based update flow with GitHub Releases as source of truth.

## Source and channel

- Source repo: `Hainrixz/kaizen`
- Release channel: `stable`
- API endpoint used: `https://api.github.com/repos/Hainrixz/kaizen/releases/latest`

## CLI surface

- `kaizen update --check`: check only (no mutation)
- `kaizen update`: apply latest stable release
- `kaizen update --force`: rebuild/reinstall even if already current
- `kaizen update --no-restart-service`: skip automatic restart when service was running

## Startup notification behavior

Kaizen shows passive update notices only on interactive launches:

- `kaizen` (no args)
- `kaizen start`
- `kaizen chat`
- `kaizen ui`

No startup notice is shown for service/automation commands.

## Cache and state

Path:

- `~/.kaizen/state/update/status.json`

Fields:

- `lastCheckedAt`
- `latestVersion`
- `latestTag`
- `latestPublishedAt`
- `lastNotifiedVersion`
- `lastError`

Checks are cache-gated by default (`24h`) through config.

## Config schema (`version: 5`)

`~/.kaizen/kaizen.json` now contains:

```json
{
  "updates": {
    "enabled": true,
    "channel": "stable",
    "checkIntervalHours": 24,
    "sourceRepo": "Hainrixz/kaizen"
  }
}
```

## Service-aware update flow

When `kaizen update` applies a release:

1. Resolve install metadata (`~/.kaizen/install.json`)
2. Validate required tools (`git`, `node`, `corepack`)
3. Abort if install worktree is dirty
4. If service is running: stop service
5. Fetch tags and checkout release tag on `kaizen-stable`
6. Run `corepack pnpm install --frozen-lockfile`
7. Run `corepack pnpm build`
8. Update install metadata (`installedVersion`, `installRef`)
9. Restart service only if it was running before update (unless disabled)

If update fails after stopping service, Kaizen attempts a best-effort service restart and reports the result.

## Troubleshooting

1. Missing install metadata:
- Re-run installer, then retry `kaizen update`.

2. Dirty install directory:
- Commit/stash local changes in install dir before update.

3. Offline or API/rate-limit failures:
- `kaizen update --check` still returns cached known state and last error note.
