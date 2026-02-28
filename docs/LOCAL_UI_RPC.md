# Local UI RPC Contract

Last verified: **February 27, 2026**

## Transport

- Endpoint: `WS /ws`
- Encoding: JSON frames

## Frame types

### Request

```json
{ "type": "req", "id": "string", "method": "string", "params": {} }
```

### Response

```json
{ "type": "res", "id": "string", "ok": true, "payload": {} }
```

or

```json
{ "type": "res", "id": "string", "ok": false, "error": { "code": "string", "message": "string" } }
```

### Event

```json
{ "type": "event", "event": "string", "payload": {} }
```

## Methods

1. `connect`
- returns bootstrap info + current `chat.history`

2. `chat.history`
- returns persisted transcript for active session

3. `chat.send`
- params: `{ "message": "text" }`
- starts one model turn for session through Kaizen runner registry

4. `chat.cancel`
- best-effort cancellation of active run

5. `status.snapshot`
- returns normalized runtime snapshot

6. `service.status`
- returns service installed/running/detail

7. `service.run`
- params: `{ "action": "install|start|stop|restart|status|uninstall" }`

8. `telegram.status`
- returns telegram configuration + bot verification data

9. `telegram.update`
- params action:
  - save: `{ action, enabled, botToken, allowFrom, pollIntervalMs, longPollTimeoutSec }`
  - disable: `{ action: "disable" }`
  - test: `{ action: "test", chatId, message }`

10. `auth.status`
- returns provider status and latest login metadata

11. `autonomy.status`
- returns autonomy config, runtime state, access policy, and queue summary

12. `autonomy.update`
- params action:
  - enable: `{ "action": "enable" }`
  - disable: `{ "action": "disable" }`
  - start: `{ "action": "start", "mode": "queued|free-run", "maxTurns": number, "maxMinutes": number }`
  - stop: `{ "action": "stop" }`
  - configure: `{ "action": "configure", "enabled": boolean, "mode": "...", "scope": "...", "allowPaths": "csv|array", "maxTurns": number, "maxMinutes": number }`

13. `queue.list`
- returns workspace + queue tasks

14. `queue.add`
- params: `{ "title": "text", "prompt": "text", "workspace"?: "path" }`

15. `queue.remove`
- params: `{ "id": "taskId", "workspace"?: "path" }`

16. `queue.clear`
- params: `{ "workspace"?: "path" }`

17. `queue.runNext`
- params: `{ "workspace"?: "path" }`

## Events

- `chat.run.started`
- `chat.run.completed`
- `chat.run.cancelled`
- `chat.run.failed`

Clients should use events to update UI run state and refresh chat history.
