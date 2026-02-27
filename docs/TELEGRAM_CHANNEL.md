# Telegram Channel (v1)

Kaizen can process messages through Telegram when the channel is enabled and a worker is running.

## Scope and defaults

- DM-only (`private` chats)
- numeric allowlist only
- disabled by default
- one queued execution stream to avoid concurrent model turns

## Configure

Interactive:

```bash
kaizen channels telegram setup
```

Non-interactive:

```bash
kaizen channels telegram setup \
  --non-interactive \
  --token "<bot-token>" \
  --allow-from "123456789,987654321"
```

Check status:

```bash
kaizen channels telegram status
```

Disable:

```bash
kaizen channels telegram disable
```

Test outbound message:

```bash
kaizen channels telegram test --to "<chat-id>" --message "Kaizen online"
```

## Runtime behavior

Telegram processing runs when either:

- `kaizen service run` is active in foreground, or
- always-on service mode is installed and started.

If sender ID is not allowlisted:

- Kaizen sends deny message.
- Kaizen does not run model execution for that sender.

## State persistence

- Update offsets are stored at:
  - `~/.kaizen/state/telegram/update-offset-default.json`
- This prevents duplicate replies after restart.

## Config fields

Stored under `channels.telegram`:

- `enabled`
- `botToken`
- `allowFrom`
- `pollIntervalMs` (default `1500`)
- `longPollTimeoutSec` (default `25`)
