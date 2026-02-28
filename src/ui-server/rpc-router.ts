import { buildControlUiBootstrap } from "./bootstrap.js";
import type { UiEventSink, UiSessionContext } from "./context.js";
import { cancelChatRun, getChatHistory, sendChatMessage } from "./handlers/chat.js";
import { serviceRunAction, serviceStatusSnapshot } from "./handlers/service.js";
import { statusSnapshot } from "./handlers/status.js";
import { telegramStatus, telegramUpdate } from "./handlers/telegram.js";
import { authStatus } from "./handlers/auth.js";
import { autonomyStatus, autonomyUpdate } from "./handlers/autonomy.js";
import { queueAdd, queueClear, queueList, queueRemove, queueRunNext } from "./handlers/queue.js";

type RpcRouterContext = {
  session: UiSessionContext;
  eventSink: UiEventSink;
};

function asObject(params: unknown) {
  if (!params || typeof params !== "object") {
    return {} as Record<string, unknown>;
  }
  return params as Record<string, unknown>;
}

export async function handleRpcMethod(
  method: string,
  params: unknown,
  context: RpcRouterContext,
): Promise<unknown> {
  switch (method) {
    case "connect": {
      const config = buildControlUiBootstrap({
        sessionId: context.session.sessionId,
      });
      const history = getChatHistory(context.session);
      return {
        ...config,
        history,
      };
    }

    case "chat.history": {
      return getChatHistory(context.session);
    }

    case "chat.send": {
      const payload = asObject(params);
      const message = String(payload.message ?? "");
      return sendChatMessage({
        session: context.session,
        eventSink: context.eventSink,
        message,
      });
    }

    case "chat.cancel": {
      return cancelChatRun(context.session, context.eventSink);
    }

    case "status.snapshot": {
      return statusSnapshot();
    }

    case "service.status": {
      return serviceStatusSnapshot();
    }

    case "service.run": {
      const payload = asObject(params);
      return serviceRunAction(String(payload.action ?? "status"));
    }

    case "telegram.status": {
      return telegramStatus();
    }

    case "telegram.update": {
      return telegramUpdate(params);
    }

    case "auth.status": {
      return authStatus();
    }

    case "autonomy.status": {
      return autonomyStatus();
    }

    case "autonomy.update": {
      return autonomyUpdate(params);
    }

    case "queue.list": {
      return queueList(params);
    }

    case "queue.add": {
      return queueAdd(params);
    }

    case "queue.remove": {
      return queueRemove(params);
    }

    case "queue.clear": {
      return queueClear(params);
    }

    case "queue.runNext": {
      return queueRunNext(params);
    }

    default:
      throw new Error(`Unsupported rpc method: ${method}`);
  }
}
