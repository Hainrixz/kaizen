import {
  normalizeTelegramAllowFrom,
  normalizeTelegramBotToken,
  normalizeTelegramLongPollTimeoutSec,
  normalizeTelegramPollIntervalMs,
  readConfig,
  writeConfig,
} from "../../config.js";
import { getMe, sendMessage } from "../../channels/telegram/api.js";

type TelegramStatusPayload = {
  enabled: boolean;
  botTokenConfigured: boolean;
  allowFrom: string[];
  pollIntervalMs: number;
  longPollTimeoutSec: number;
  botUsername: string | null;
};

function parsePayload(params: unknown) {
  if (!params || typeof params !== "object") {
    return {} as Record<string, unknown>;
  }
  return params as Record<string, unknown>;
}

async function buildStatus(): Promise<TelegramStatusPayload> {
  const config = readConfig();
  const telegram = config.channels.telegram;

  let botUsername: string | null = null;
  if (telegram.botToken) {
    const me = await getMe(telegram.botToken);
    botUsername = me?.username ?? null;
  }

  return {
    enabled: Boolean(telegram.enabled),
    botTokenConfigured: Boolean(telegram.botToken),
    allowFrom: [...(telegram.allowFrom ?? [])],
    pollIntervalMs: Number(telegram.pollIntervalMs ?? 1500),
    longPollTimeoutSec: Number(telegram.longPollTimeoutSec ?? 25),
    botUsername,
  };
}

export async function telegramStatus() {
  return buildStatus();
}

export async function telegramUpdate(params: unknown) {
  const payload = parsePayload(params);
  const action = String(payload.action ?? "save").trim().toLowerCase();

  if (action === "status") {
    return buildStatus();
  }

  if (action === "disable") {
    const config = readConfig();
    const next = {
      ...config,
      channels: {
        ...config.channels,
        telegram: {
          ...config.channels.telegram,
          enabled: false,
        },
      },
    };
    writeConfig(next);
    return buildStatus();
  }

  if (action === "test") {
    const config = readConfig();
    const telegram = config.channels.telegram;
    const token = telegram.botToken;
    if (!token) {
      throw new Error("Telegram bot token is not configured.");
    }

    const chatId = String(payload.chatId ?? "").trim();
    const message = String(payload.message ?? "").trim();

    if (!/^-?\d+$/.test(chatId)) {
      throw new Error("Test chat id must be numeric.");
    }
    if (!message) {
      throw new Error("Test message is required.");
    }

    const sent = await sendMessage({
      token,
      chatId,
      text: message,
    });

    return {
      ...(await buildStatus()),
      testSent: Boolean(sent),
    };
  }

  if (action !== "save") {
    throw new Error(`Unsupported telegram action: ${action}`);
  }

  const config = readConfig();
  const current = config.channels.telegram;

  const enabled = payload.enabled === undefined ? Boolean(current.enabled) : Boolean(payload.enabled);
  const botToken = normalizeTelegramBotToken(payload.botToken ?? current.botToken);
  const allowFrom = normalizeTelegramAllowFrom(payload.allowFrom ?? current.allowFrom);
  const pollIntervalMs = normalizeTelegramPollIntervalMs(
    payload.pollIntervalMs ?? current.pollIntervalMs,
  );
  const longPollTimeoutSec = normalizeTelegramLongPollTimeoutSec(
    payload.longPollTimeoutSec ?? current.longPollTimeoutSec,
  );

  if (enabled && !botToken) {
    throw new Error("Telegram bot token is required when Telegram is enabled.");
  }
  if (enabled && allowFrom.length === 0) {
    throw new Error("Telegram allowFrom must contain at least one numeric ID.");
  }

  let botUsername: string | null = null;
  if (botToken) {
    const me = await getMe(botToken);
    if (!me && enabled) {
      throw new Error("Telegram bot token could not be verified.");
    }
    botUsername = me?.username ?? null;
  }

  const next = {
    ...config,
    channels: {
      ...config.channels,
      telegram: {
        ...current,
        enabled,
        botToken,
        allowFrom,
        pollIntervalMs,
        longPollTimeoutSec,
      },
    },
  };

  writeConfig(next);

  return {
    enabled,
    botTokenConfigured: Boolean(botToken),
    allowFrom,
    pollIntervalMs,
    longPollTimeoutSec,
    botUsername,
  };
}
