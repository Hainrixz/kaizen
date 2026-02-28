# Queue Runtime

Kaizen queue stores explicit tasks by workspace hash and powers queued autonomy turns.

## Storage

- `~/.kaizen/state/queue/workspaces/<workspaceHash>.json`

Each task includes:

- `id`
- `title`
- `prompt`
- `workspace`
- `status` (`pending|running|completed|failed|cancelled`)
- `lastError`
- `lastResult`

## CLI

```bash
kaizen queue add --title "build hero section" --prompt "implement the hero and polish spacing"
kaizen queue list
kaizen queue remove --id <taskId>
kaizen queue clear
kaizen queue run-next
```

## Runtime behavior

- one queued task is executed per `run-next` invocation
- heartbeat can execute queued tasks automatically when:
  - heartbeat enabled
  - autonomy enabled
  - autonomy mode is `queued`
- non-interactive model turns are serialized globally to avoid concurrent turns on shared workspace state

