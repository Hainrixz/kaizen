import crypto from "node:crypto";
import { readConfig } from "../../config.js";
import { runCodexTurn } from "../../engine/codex-turn.js";
import {
  appendSessionMessages,
  readWorkspaceIndex,
  setActiveSession,
  type UiChatMessage,
} from "../session-store.js";
import type { UiEventSink, UiSessionContext } from "../context.js";

type ActiveRun = {
  runId: string;
  controller: AbortController;
};

const activeRuns = new Map<string, ActiveRun>();

function sessionKey(session: UiSessionContext) {
  return `${session.workspace}::${session.sessionId}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createMessage(role: "user" | "assistant", text: string, runId?: string): UiChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: nowIso(),
    runId: runId ?? null,
  };
}

export function getChatHistory(session: UiSessionContext) {
  const transcript = setActiveSession(session.workspace, session.sessionId);
  const index = readWorkspaceIndex(session.workspace, session.sessionId);
  return {
    sessionId: transcript.sessionId,
    workspace: transcript.workspace,
    createdAt: transcript.createdAt,
    updatedAt: transcript.updatedAt,
    messages: transcript.messages,
    sessions: index.sessions,
    activeSessionId: index.activeSessionId,
  };
}

export async function sendChatMessage(params: {
  session: UiSessionContext;
  eventSink: UiEventSink;
  message: string;
}) {
  const message = String(params.message ?? "").trim();
  if (!message) {
    throw new Error("Message is required.");
  }

  const key = sessionKey(params.session);
  if (activeRuns.has(key)) {
    throw new Error("A run is already active for this session.");
  }

  const runId = crypto.randomUUID();
  const controller = new AbortController();
  activeRuns.set(key, {
    runId,
    controller,
  });

  const userMessage = createMessage("user", message, runId);
  appendSessionMessages({
    workspace: params.session.workspace,
    sessionId: params.session.sessionId,
    messages: [userMessage],
  });

  params.eventSink.sendEvent("chat.run.started", {
    runId,
    sessionId: params.session.sessionId,
  });

  try {
    const config = readConfig();
    const turn = await runCodexTurn({
      workspace: params.session.workspace,
      abilityProfile: params.session.abilityProfile,
      modelProvider: config.defaults.modelProvider,
      localRuntime: config.defaults.localRuntime,
      contextGuardEnabled: config.defaults.contextGuardEnabled,
      contextGuardThresholdPct: config.defaults.contextGuardThresholdPct,
      userMessage: message,
      quiet: true,
      abortSignal: controller.signal,
    });

    if (controller.signal.aborted) {
      params.eventSink.sendEvent("chat.run.cancelled", {
        runId,
        sessionId: params.session.sessionId,
      });
      return {
        runId,
        cancelled: true,
      };
    }

    const assistantMessage = createMessage("assistant", turn.response, runId);
    const transcript = appendSessionMessages({
      workspace: params.session.workspace,
      sessionId: params.session.sessionId,
      messages: [assistantMessage],
    });

    params.eventSink.sendEvent("chat.run.completed", {
      runId,
      sessionId: params.session.sessionId,
      ok: turn.ok,
      message: assistantMessage,
      updatedAt: transcript.updatedAt,
    });

    return {
      runId,
      cancelled: false,
      ok: turn.ok,
      message: assistantMessage,
    };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    const assistantMessage = createMessage(
      "assistant",
      `I could not complete this request: ${messageText}`,
      runId,
    );
    appendSessionMessages({
      workspace: params.session.workspace,
      sessionId: params.session.sessionId,
      messages: [assistantMessage],
    });

    params.eventSink.sendEvent("chat.run.failed", {
      runId,
      sessionId: params.session.sessionId,
      error: messageText,
      message: assistantMessage,
    });

    return {
      runId,
      cancelled: false,
      ok: false,
      message: assistantMessage,
    };
  } finally {
    activeRuns.delete(key);
  }
}

export function cancelChatRun(session: UiSessionContext, eventSink: UiEventSink) {
  const key = sessionKey(session);
  const active = activeRuns.get(key);
  if (!active) {
    return {
      cancelled: false,
      reason: "No active run for this session.",
    };
  }

  active.controller.abort();
  eventSink.sendEvent("chat.run.cancelled", {
    runId: active.runId,
    sessionId: session.sessionId,
  });

  return {
    cancelled: true,
    runId: active.runId,
  };
}
