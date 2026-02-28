export type RpcReqFrame = {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
};

export type RpcResFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

export type RpcEventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
};

export type RpcAnyFrame = RpcReqFrame | RpcResFrame | RpcEventFrame;

export function isRpcReqFrame(value: unknown): value is RpcReqFrame {
  if (!value || typeof value !== "object") {
    return false;
  }

  const frame = value as Partial<RpcReqFrame>;
  return frame.type === "req" && typeof frame.id === "string" && typeof frame.method === "string";
}
