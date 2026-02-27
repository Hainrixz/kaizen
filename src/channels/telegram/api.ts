/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

const TELEGRAM_BASE = "https://api.telegram.org";

type TelegramResponse<T> = {
  ok?: boolean;
  result?: T;
  description?: string;
};

async function callTelegram<T>(params: {
  token: string;
  method: string;
  payload?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<T | null> {
  const url = `${TELEGRAM_BASE}/bot${params.token}/${params.method}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(params.payload ?? {}),
      signal: params.signal,
    });

    if (!response.ok) {
      return null;
    }

    const parsed = (await response.json().catch(() => null)) as TelegramResponse<T> | null;
    if (!parsed?.ok) {
      return null;
    }

    return parsed.result ?? null;
  } catch {
    return null;
  }
}

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id?: number;
    date?: number;
    text?: string;
    chat?: {
      id?: number | string;
      type?: string;
    };
    from?: {
      id?: number | string;
      username?: string;
      first_name?: string;
    };
  };
};

export async function getMe(token: string) {
  return await callTelegram<{ id?: number; username?: string }>({
    token,
    method: "getMe",
  });
}

export async function getUpdates(params: {
  token: string;
  offset?: number | null;
  timeoutSec?: number;
  signal?: AbortSignal;
}) {
  return await callTelegram<TelegramUpdate[]>({
    token: params.token,
    method: "getUpdates",
    signal: params.signal,
    payload: {
      offset: params.offset ?? undefined,
      timeout: params.timeoutSec ?? 25,
      allowed_updates: ["message"],
    },
  });
}

export async function sendMessage(params: {
  token: string;
  chatId: string;
  text: string;
}) {
  return await callTelegram<{ message_id?: number }>({
    token: params.token,
    method: "sendMessage",
    payload: {
      chat_id: params.chatId,
      text: params.text,
      disable_web_page_preview: true,
    },
  });
}

export async function sendChatAction(params: {
  token: string;
  chatId: string;
  action?: "typing";
}) {
  return await callTelegram<{ ok?: boolean }>({
    token: params.token,
    method: "sendChatAction",
    payload: {
      chat_id: params.chatId,
      action: params.action ?? "typing",
    },
  });
}
