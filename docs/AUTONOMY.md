# Autonomy

Kaizen autonomy is an optional runtime layer for autonomous task execution.

## Defaults

- `autonomy.enabled = false`
- `autonomy.mode = queued`
- `autonomy.freeRun.maxTurns = 5`
- `autonomy.freeRun.maxMinutes = 20`

## Modes

1. `queued`:
- executes only explicit queue tasks (`kaizen queue add ...`)
- heartbeat can run queued tasks when autonomy is enabled

2. `free-run`:
- never starts automatically
- must be started manually with `kaizen autonomy start --mode free-run`
- bounded by turn and minute budget

## Commands

- `kaizen autonomy status`
- `kaizen autonomy configure`
- `kaizen autonomy enable`
- `kaizen autonomy disable`
- `kaizen autonomy start --mode queued|free-run --max-turns <n> --max-minutes <n>`
- `kaizen autonomy stop`

## Runtime guard files

- `~/.kaizen/run/autonomy.lock` (active run marker)
- `~/.kaizen/state/heartbeat/status.json` (heartbeat/runtime snapshot)

