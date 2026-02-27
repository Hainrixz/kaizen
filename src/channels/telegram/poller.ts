/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import {
  getUpdates,
  sendChatAction,
  sendMessage,
  type TelegramUpdate,
} from "./api.js";
import {
  readTelegramUpdateOffset,
  writeTelegramUpdateOffset,
} from "./state.js";
import { runCodexTurn } from "../../engine/codex-turn.js";

type TelegramPollerParams = {
  workspace: string;
  abilityProfile: string;
  modelProvider: string;
  localRuntime: string;
  contextGuardEnabled: boolean;
  contextGuardThresholdPct: number;
  token: string;
  allowFrom: string[];
  pollIntervalMs: number;
  longPollTimeoutSec: number;
  log?: (line: string) => void;
};

type TelegramPollerHandle = {
  stop: () => void;
  wait: () => Promise<void>;
};

function asId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

function chunkMessage(text: string, maxLength = 3500) {
  if (!text) {
    return ["(empty response)"];
  }
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    chunks.push(text.slice(cursor, cursor + maxLength));
    cursor += maxLength;
  }
  return chunks;
}

async function processTelegramMessage(params: {
  update: TelegramUpdate;
  poller: TelegramPollerParams;
}) {
  const message = params.update.message;
  if (!message?.text) {
    return;
  }

  const chatType = message.chat?.type;
  if (chatType !== "private") {
    return;
  }

  const chatId = asId(message.chat?.id);
  const senderId = asId(message.from?.id);

  if (!chatId || !senderId) {
    return;
  }

  if (!params.poller.allowFrom.includes(senderId)) {
    await sendMessage({
      token: params.poller.token,
      chatId,
      text: "This Kaizen agent is restricted. Your account is not allowlisted.",
    });
    return;
  }

  await sendChatAction({
    token: params.poller.token,
    chatId,
    action: "typing",
  });

  const turn = await runCodexTurn({
    workspace: params.poller.workspace,
    abilityProfile: params.poller.abilityProfile,
    modelProvider: params.poller.modelProvider,
    localRuntime: params.poller.localRuntime,
    contextGuardEnabled: params.poller.contextGuardEnabled,
    contextGuardThresholdPct: params.poller.contextGuardThresholdPct,
    userMessage: message.text,
    quiet: true,
  });

  const responseChunks = chunkMessage(turn.response);
  for (const chunk of responseChunks) {
    await sendMessage({
      token: params.poller.token,
      chatId,
      text: chunk,
    });
  }
}

export function startTelegramPoller(params: TelegramPollerParams): TelegramPollerHandle {
  const log = params.log ?? (() => {});
  let stopped = false;
  let abortController: AbortController | null = null;
  let queue = Promise.resolve();
  let resolveWait: (() => void) | null = null;

  const waitPromise = new Promise<void>((resolve) => {
    resolveWait = resolve;
  });

  const runLoop = async () => {
    let offset = readTelegramUpdateOffset("default");

    while (!stopped) {
      abortController = new AbortController();
      const updates = await getUpdates({
        token: params.token,
        offset,
        timeoutSec: params.longPollTimeoutSec,
        signal: abortController.signal,
      });

      if (!updates || updates.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, params.pollIntervalMs));
        continue;
      }

      for (const update of updates) {
        const nextOffset = Number(update.update_id) + 1;
        if (Number.isFinite(nextOffset)) {
          offset = nextOffset;
          writeTelegramUpdateOffset("default", nextOffset);
        }

        queue = queue
          .then(async () => {
            await processTelegramMessage({
              update,
              poller: params,
            });
          })
          .catch((error) => {
            log(`telegram message processing failed: ${String(error)}`);
          });
      }

      await queue;
    }

    resolveWait?.();
  };

  runLoop().catch((error) => {
    log(`telegram poller crashed: ${String(error)}`);
    resolveWait?.();
  });

  return {
    stop() {
      stopped = true;
      abortController?.abort();
    },
    wait() {
      return waitPromise;
    },
  };
}
