import type http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { resolveSessionContext } from "./context.js";
import { handleRpcMethod } from "./rpc-router.js";
import { isRpcReqFrame, type RpcEventFrame, type RpcResFrame } from "./rpc-types.js";
import { sanitizeSessionId } from "./session-store.js";

function sendJson(socket: WebSocket, payload: RpcResFrame | RpcEventFrame) {
  socket.send(JSON.stringify(payload));
}

function sendError(socket: WebSocket, id: string, code: string, message: string) {
  sendJson(socket, {
    type: "res",
    id,
    ok: false,
    error: {
      code,
      message,
    },
  });
}

export function attachWsServer(params: {
  server: http.Server;
  defaultSessionId: string;
}) {
  const wss = new WebSocketServer({ noServer: true });

  params.server.on("upgrade", (request, socket, head) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://localhost");
      if (requestUrl.pathname !== "/ws") {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", (socket, request) => {
    const requestUrl = new URL(request.url || "/ws", "http://localhost");
    const requestedSession = requestUrl.searchParams.get("session");
    const sessionId = sanitizeSessionId(requestedSession ?? params.defaultSessionId);
    const session = resolveSessionContext(sessionId);

    const eventSink = {
      sendEvent(event: string, payload?: unknown) {
        sendJson(socket, {
          type: "event",
          event,
          payload,
        });
      },
    };

    socket.on("message", async (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(raw));
      } catch {
        sendError(socket, "unknown", "bad_json", "Malformed JSON frame.");
        return;
      }

      if (!isRpcReqFrame(parsed)) {
        sendError(socket, "unknown", "bad_frame", "Expected rpc request frame.");
        return;
      }

      const frame = parsed;
      try {
        const payload = await handleRpcMethod(frame.method, frame.params, {
          session,
          eventSink,
        });
        sendJson(socket, {
          type: "res",
          id: frame.id,
          ok: true,
          payload,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendError(socket, frame.id, "method_failed", message);
      }
    });
  });

  return {
    close: () => new Promise<void>((resolve) => wss.close(() => resolve())),
  };
}
