import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveKaizenHome } from "../config.js";

export type UiChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  runId?: string | null;
};

export type UiSessionTranscript = {
  version: number;
  sessionId: string;
  workspace: string;
  createdAt: string;
  updatedAt: string;
  messages: UiChatMessage[];
};

type UiSessionIndexItem = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

type UiSessionIndex = {
  version: number;
  workspace: string;
  activeSessionId: string;
  sessions: UiSessionIndexItem[];
};

const TRANSCRIPT_VERSION = 1;
const INDEX_VERSION = 1;

function workspaceHash(workspace: string) {
  return crypto.createHash("sha256").update(path.resolve(workspace)).digest("hex");
}

export function sanitizeSessionId(rawSessionId: unknown) {
  if (typeof rawSessionId !== "string" || rawSessionId.trim().length === 0) {
    return "default";
  }
  return rawSessionId.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "default";
}

function resolveWorkspaceStateDir(workspace: string) {
  return path.join(
    resolveKaizenHome(),
    "state",
    "ui",
    "workspaces",
    workspaceHash(workspace),
  );
}

function resolveSessionsDir(workspace: string) {
  return path.join(resolveWorkspaceStateDir(workspace), "sessions");
}

function resolveTranscriptPath(workspace: string, sessionId: string) {
  return path.join(resolveSessionsDir(workspace), `${sanitizeSessionId(sessionId)}.json`);
}

function resolveIndexPath(workspace: string) {
  return path.join(resolveWorkspaceStateDir(workspace), "index.json");
}

function safeReadJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function ensureTranscript(workspace: string, sessionId: string): UiSessionTranscript {
  const resolvedSessionId = sanitizeSessionId(sessionId);
  const transcriptPath = resolveTranscriptPath(workspace, resolvedSessionId);
  const existing = safeReadJson<UiSessionTranscript>(transcriptPath);

  if (existing?.version === TRANSCRIPT_VERSION && Array.isArray(existing.messages)) {
    return {
      ...existing,
      sessionId: resolvedSessionId,
      workspace,
      messages: existing.messages.filter(
        (message) =>
          message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.text === "string",
      ),
    };
  }

  const now = new Date().toISOString();
  const created: UiSessionTranscript = {
    version: TRANSCRIPT_VERSION,
    sessionId: resolvedSessionId,
    workspace,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  writeJson(transcriptPath, created);
  return created;
}

function saveTranscript(workspace: string, transcript: UiSessionTranscript) {
  const transcriptPath = resolveTranscriptPath(workspace, transcript.sessionId);
  writeJson(transcriptPath, transcript);
}

function ensureIndex(workspace: string, activeSessionId: string) {
  const indexPath = resolveIndexPath(workspace);
  const existing = safeReadJson<UiSessionIndex>(indexPath);

  if (existing?.version === INDEX_VERSION && Array.isArray(existing.sessions)) {
    if (existing.activeSessionId !== activeSessionId) {
      const next = {
        ...existing,
        workspace,
        activeSessionId,
      };
      writeJson(indexPath, next);
      return next;
    }
    return {
      ...existing,
      workspace,
    };
  }

  const next: UiSessionIndex = {
    version: INDEX_VERSION,
    workspace,
    activeSessionId,
    sessions: [],
  };
  writeJson(indexPath, next);
  return next;
}

function saveIndex(workspace: string, index: UiSessionIndex) {
  writeJson(resolveIndexPath(workspace), index);
}

export function readSessionTranscript(workspace: string, sessionId: string) {
  const transcript = ensureTranscript(workspace, sessionId);
  ensureIndex(workspace, transcript.sessionId);
  return transcript;
}

export function appendSessionMessages(params: {
  workspace: string;
  sessionId: string;
  messages: UiChatMessage[];
}) {
  const transcript = ensureTranscript(params.workspace, params.sessionId);
  const now = new Date().toISOString();
  transcript.messages.push(...params.messages);
  transcript.updatedAt = now;
  saveTranscript(params.workspace, transcript);

  const index = ensureIndex(params.workspace, transcript.sessionId);
  const existing = index.sessions.find((item) => item.sessionId === transcript.sessionId);
  if (existing) {
    existing.updatedAt = now;
    existing.messageCount = transcript.messages.length;
  } else {
    index.sessions.push({
      sessionId: transcript.sessionId,
      createdAt: transcript.createdAt,
      updatedAt: now,
      messageCount: transcript.messages.length,
    });
  }
  index.activeSessionId = transcript.sessionId;
  index.sessions.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
  saveIndex(params.workspace, index);

  return transcript;
}

export function setActiveSession(workspace: string, sessionId: string) {
  const transcript = ensureTranscript(workspace, sessionId);
  const index = ensureIndex(workspace, transcript.sessionId);

  if (!index.sessions.find((item) => item.sessionId === transcript.sessionId)) {
    index.sessions.push({
      sessionId: transcript.sessionId,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
      messageCount: transcript.messages.length,
    });
  }

  index.activeSessionId = transcript.sessionId;
  index.sessions.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
  saveIndex(workspace, index);
  return transcript;
}

export function readWorkspaceIndex(workspace: string, activeSessionId: string) {
  const index = ensureIndex(workspace, sanitizeSessionId(activeSessionId));
  return {
    ...index,
    sessions: [...index.sessions],
  };
}
