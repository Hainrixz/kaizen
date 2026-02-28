export type RpcEvent = {
  event: string;
  payload?: unknown;
};

type RpcResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

type RpcEventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
};

export class GatewayClient extends EventTarget {
  private ws: WebSocket;
  private requestCounter = 0;
  private pending = new Map<
    string,
    {
      resolve: (payload: unknown) => void;
      reject: (error: Error) => void;
    }
  >();

  private constructor(ws: WebSocket) {
    super();
    this.ws = ws;
    ws.addEventListener("message", (event) => {
      this.onMessage(event.data);
    });
    ws.addEventListener("close", () => {
      this.dispatchEvent(
        new CustomEvent("disconnected", {
          detail: {
            reason: "Socket closed",
          },
        }),
      );
    });
  }

  static async connect(sessionId: string) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws?session=${encodeURIComponent(sessionId)}`;

    const ws = await new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      socket.addEventListener("open", () => resolve(socket), { once: true });
      socket.addEventListener(
        "error",
        () => reject(new Error("Unable to connect to Kaizen websocket.")),
        { once: true },
      );
    });

    return new GatewayClient(ws);
  }

  close() {
    this.ws.close();
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    const id = `req_${++this.requestCounter}`;
    const payload = {
      type: "req",
      id,
      method,
      params,
    };

    const responsePromise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (payload) => resolve(payload as T),
        reject,
      });
    });

    this.ws.send(JSON.stringify(payload));
    return responsePromise;
  }

  private onMessage(rawData: unknown) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(rawData));
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const frame = parsed as Partial<RpcResponseFrame & RpcEventFrame>;

    if (frame.type === "event" && typeof frame.event === "string") {
      this.dispatchEvent(
        new CustomEvent<RpcEvent>("rpc-event", {
          detail: {
            event: frame.event,
            payload: frame.payload,
          },
        }),
      );
      return;
    }

    if (frame.type === "res" && typeof frame.id === "string") {
      const pending = this.pending.get(frame.id);
      if (!pending) {
        return;
      }

      this.pending.delete(frame.id);
      if (frame.ok) {
        pending.resolve(frame.payload);
        return;
      }

      pending.reject(new Error(frame.error?.message || "RPC request failed."));
    }
  }
}
