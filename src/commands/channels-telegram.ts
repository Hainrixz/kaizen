/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { confirm, isCancel, text } from "@clack/prompts";
import {
  normalizeTelegramAllowFrom,
  normalizeTelegramBotToken,
  normalizeTelegramLongPollTimeoutSec,
  normalizeTelegramPollIntervalMs,
  readConfig,
  writeConfig,
} from "../config.js";
import { getMe, sendMessage } from "../channels/telegram/api.js";

type TelegramSetupOptions = {
  token?: string;
  allowFrom?: string;
  pollIntervalMs?: string | number;
  longPollTimeoutSec?: string | number;
  nonInteractive?: boolean;
};

async function askText(message: string, defaultValue = "") {
  const value = await text({
    message,
    defaultValue,
  });
  if (isCancel(value)) {
    return null;
  }
  return String(value ?? "").trim();
}

export async function telegramSetupCommand(options: TelegramSetupOptions = {}) {
  const config = readConfig();
  const nonInteractive = Boolean(options.nonInteractive);

  let token = normalizeTelegramBotToken(options.token ?? config.channels?.telegram?.botToken);
  let allowFrom = normalizeTelegramAllowFrom(options.allowFrom ?? config.channels?.telegram?.allowFrom);
  let pollIntervalMs = normalizeTelegramPollIntervalMs(
    options.pollIntervalMs ?? config.channels?.telegram?.pollIntervalMs,
  );
  let longPollTimeoutSec = normalizeTelegramLongPollTimeoutSec(
    options.longPollTimeoutSec ?? config.channels?.telegram?.longPollTimeoutSec,
  );

  if (!nonInteractive) {
    console.log("");
    console.log("Telegram channel setup");

    const tokenInput = await askText("Telegram bot token", token ?? "");
    if (tokenInput === null) {
      console.log("Telegram setup cancelled.");
      return false;
    }
    token = normalizeTelegramBotToken(tokenInput);

    const allowFromInput = await askText(
      "Allowlist sender IDs (comma separated numeric Telegram IDs)",
      allowFrom.join(","),
    );
    if (allowFromInput === null) {
      console.log("Telegram setup cancelled.");
      return false;
    }
    allowFrom = normalizeTelegramAllowFrom(allowFromInput);

    const shouldEnable = await confirm({
      message: "Enable Telegram channel now?",
      initialValue: true,
    });
    if (isCancel(shouldEnable)) {
      console.log("Telegram setup cancelled.");
      return false;
    }
    if (!shouldEnable) {
      console.log("Telegram left disabled.");
      return false;
    }
  }

  if (!token) {
    throw new Error("Telegram bot token is required.");
  }
  if (allowFrom.length === 0) {
    throw new Error("Telegram allowFrom must contain at least one numeric sender ID.");
  }

  const next = {
    ...config,
    channels: {
      ...config.channels,
      telegram: {
        ...config.channels.telegram,
        enabled: true,
        botToken: token,
        allowFrom,
        pollIntervalMs,
        longPollTimeoutSec,
      },
    },
  };

  writeConfig(next);

  const me = await getMe(token);

  console.log("");
  console.log("Telegram channel configured.");
  console.log(`Enabled: ${next.channels.telegram.enabled ? "yes" : "no"}`);
  console.log(`Allowlist: ${next.channels.telegram.allowFrom.join(", ")}`);
  if (me?.username) {
    console.log(`Connected bot: @${me.username}`);
  }
  return true;
}

export async function telegramStatusCommand() {
  const config = readConfig();
  const telegram = config.channels?.telegram;

  console.log("");
  console.log("Kaizen Telegram status");
  console.log(`Enabled: ${telegram?.enabled ? "yes" : "no"}`);
  console.log(`Allowlist: ${(telegram?.allowFrom ?? []).join(", ") || "(empty)"}`);
  console.log(`Poll interval: ${telegram?.pollIntervalMs ?? 1500}ms`);
  console.log(`Long poll timeout: ${telegram?.longPollTimeoutSec ?? 25}s`);

  if (!telegram?.botToken) {
    console.log("Bot token: not configured");
    return false;
  }

  const me = await getMe(telegram.botToken);
  if (!me) {
    console.log("Bot token: configured but verification failed");
    return false;
  }

  console.log(`Bot token: configured (@${me.username ?? "unknown"})`);
  return true;
}

export async function telegramDisableCommand() {
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

  console.log("");
  console.log("Telegram channel disabled.");
  return true;
}

export async function telegramTestCommand(options: { to?: string; message?: string } = {}) {
  const config = readConfig();
  const token = config.channels?.telegram?.botToken;
  if (!token) {
    throw new Error("Telegram bot token is not configured. Run `kaizen channels telegram setup` first.");
  }

  const to = String(options.to ?? "").trim();
  const message = String(options.message ?? "").trim();
  if (!/^-?\d+$/.test(to)) {
    throw new Error("Use --to with a numeric Telegram chat id.");
  }
  if (!message) {
    throw new Error("Use --message with non-empty text.");
  }

  const sent = await sendMessage({
    token,
    chatId: to,
    text: message,
  });

  console.log("");
  console.log(sent ? "Telegram test message sent." : "Telegram test message failed.");
  return Boolean(sent);
}
