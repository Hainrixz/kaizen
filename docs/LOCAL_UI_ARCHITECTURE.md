# Local UI Architecture

Last verified: **February 27, 2026**

## Goal

Kaizen local UI provides a browser control surface for chat and runtime operations while keeping CLI commands fully compatible.

## Stack

- Frontend: Vite + Lit + TypeScript (`ui/`)
- Backend transport: HTTP + WebSocket on same local server
- Runtime binding: loopback by default (`127.0.0.1`)
- Theme model: dark-first with manual light toggle

## Startup flow

1. User runs `kaizen ui` (or `kaizen start --interaction localhost`).
2. Command checks that `dist/control-ui/index.html` exists.
3. HTTP server starts and serves:
   - static bundle (`/` + assets)
   - `GET /health`
   - `GET /__kaizen/control-ui-config.json`
4. WebSocket endpoint `/ws` accepts RPC requests.
5. Browser auto-opens unless `--no-open` is provided.

## Backend modules

- `src/commands/ui.ts`: command entry, host/port/session/no-open flags
- `src/ui-server/server.ts`: server startup + ws attachment
- `src/ui-server/http.ts`: static and JSON endpoints
- `src/ui-server/ws.ts`: ws upgrade + frame processing
- `src/ui-server/rpc-router.ts`: method dispatch
- `src/ui-server/handlers/*`: chat/status/service/telegram/auth/autonomy/queue operations
- `src/ui-server/session-store.ts`: workspace/session transcript persistence

Frontend tabs:

- `chat`
- `overview`
- `service`
- `telegram`
- `autonomy`
- `queue`
- `profile`

## Persistence model

Per workspace hash:

- `~/.kaizen/state/ui/workspaces/<workspaceHash>/sessions/<sessionId>.json`
- `~/.kaizen/state/ui/workspaces/<workspaceHash>/index.json`

This isolates histories between workspaces and retains history after restarts.

UI preferences in localStorage:

- `kaizen.ui.theme` (`dark` or `light`)
- `kaizen.ui.density` (`comfortable` or `compact`)

These are client-side preferences and do not alter Kaizen runtime config.

## Safety model

- UI binds to loopback by default.
- No remote auth layer in v1; treat as local-admin interface.
- Existing CLI commands remain valid and can run in parallel with UI usage.
