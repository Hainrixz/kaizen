/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveKaizenHome } from "../config.js";
import type { QueueTask, QueueTaskStatus, WorkspaceQueueState } from "./queue-types.js";

const QUEUE_STATE_VERSION = 1;

function nowIso() {
  return new Date().toISOString();
}

function resolveQueueRootDir() {
  return path.join(resolveKaizenHome(), "state", "queue", "workspaces");
}

export function hashWorkspace(workspacePath: string) {
  return crypto.createHash("sha256").update(path.resolve(workspacePath)).digest("hex").slice(0, 16);
}

function resolveWorkspaceQueuePath(workspacePath: string) {
  const hash = hashWorkspace(workspacePath);
  return path.join(resolveQueueRootDir(), `${hash}.json`);
}

function createEmptyState(workspacePath: string): WorkspaceQueueState {
  return {
    version: QUEUE_STATE_VERSION,
    workspace: path.resolve(workspacePath),
    workspaceHash: hashWorkspace(workspacePath),
    updatedAt: nowIso(),
    tasks: [],
  };
}

function readJsonFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeStateFile(filePath: string, state: WorkspaceQueueState) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function normalizeTask(rawTask: any, fallbackWorkspace: string): QueueTask | null {
  if (!rawTask || typeof rawTask !== "object") {
    return null;
  }
  if (typeof rawTask.id !== "string" || rawTask.id.trim().length === 0) {
    return null;
  }
  const status = String(rawTask.status ?? "pending").trim().toLowerCase();
  const allowedStatus: QueueTaskStatus[] = [
    "pending",
    "running",
    "completed",
    "failed",
    "cancelled",
  ];
  const normalizedStatus = allowedStatus.includes(status as QueueTaskStatus)
    ? (status as QueueTaskStatus)
    : "pending";

  return {
    id: rawTask.id,
    title:
      typeof rawTask.title === "string" && rawTask.title.trim().length > 0
        ? rawTask.title.trim()
        : "Untitled task",
    prompt:
      typeof rawTask.prompt === "string" && rawTask.prompt.trim().length > 0
        ? rawTask.prompt.trim()
        : "",
    workspace:
      typeof rawTask.workspace === "string" && rawTask.workspace.trim().length > 0
        ? path.resolve(rawTask.workspace)
        : fallbackWorkspace,
    createdAt:
      typeof rawTask.createdAt === "string" && rawTask.createdAt.trim().length > 0
        ? rawTask.createdAt
        : nowIso(),
    updatedAt:
      typeof rawTask.updatedAt === "string" && rawTask.updatedAt.trim().length > 0
        ? rawTask.updatedAt
        : nowIso(),
    status: normalizedStatus,
    lastError:
      typeof rawTask.lastError === "string" && rawTask.lastError.trim().length > 0
        ? rawTask.lastError
        : null,
    lastResult:
      typeof rawTask.lastResult === "string" && rawTask.lastResult.trim().length > 0
        ? rawTask.lastResult
        : null,
  };
}

export function readWorkspaceQueue(workspacePath: string): WorkspaceQueueState {
  const resolvedWorkspace = path.resolve(workspacePath);
  const statePath = resolveWorkspaceQueuePath(resolvedWorkspace);
  const parsed = readJsonFile(statePath);

  if (!parsed || typeof parsed !== "object") {
    return createEmptyState(resolvedWorkspace);
  }

  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks
        .map((task) => normalizeTask(task, resolvedWorkspace))
        .filter((task): task is QueueTask => Boolean(task))
    : [];

  return {
    version: QUEUE_STATE_VERSION,
    workspace:
      typeof parsed.workspace === "string" && parsed.workspace.trim().length > 0
        ? path.resolve(parsed.workspace)
        : resolvedWorkspace,
    workspaceHash: hashWorkspace(resolvedWorkspace),
    updatedAt:
      typeof parsed.updatedAt === "string" && parsed.updatedAt.trim().length > 0
        ? parsed.updatedAt
        : nowIso(),
    tasks,
  };
}

export function writeWorkspaceQueue(workspacePath: string, state: WorkspaceQueueState) {
  const resolvedWorkspace = path.resolve(workspacePath);
  const statePath = resolveWorkspaceQueuePath(resolvedWorkspace);
  const nextState: WorkspaceQueueState = {
    ...state,
    version: QUEUE_STATE_VERSION,
    workspace: resolvedWorkspace,
    workspaceHash: hashWorkspace(resolvedWorkspace),
    updatedAt: nowIso(),
  };
  writeStateFile(statePath, nextState);
  return nextState;
}

export function listWorkspaceQueueTasks(workspacePath: string) {
  const state = readWorkspaceQueue(workspacePath);
  return [...state.tasks];
}

export function addWorkspaceQueueTask(params: {
  workspace: string;
  title: string;
  prompt: string;
}) {
  const workspace = path.resolve(params.workspace);
  const state = readWorkspaceQueue(workspace);
  const now = nowIso();
  const task: QueueTask = {
    id: crypto.randomUUID(),
    title: params.title.trim(),
    prompt: params.prompt.trim(),
    workspace,
    createdAt: now,
    updatedAt: now,
    status: "pending",
    lastError: null,
    lastResult: null,
  };
  state.tasks.push(task);
  writeWorkspaceQueue(workspace, state);
  return task;
}

export function removeWorkspaceQueueTask(workspacePath: string, taskId: string) {
  const workspace = path.resolve(workspacePath);
  const state = readWorkspaceQueue(workspace);
  const before = state.tasks.length;
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  if (state.tasks.length !== before) {
    writeWorkspaceQueue(workspace, state);
    return true;
  }
  return false;
}

export function clearWorkspaceQueue(workspacePath: string) {
  const workspace = path.resolve(workspacePath);
  const state = readWorkspaceQueue(workspace);
  const cleared = state.tasks.length;
  state.tasks = [];
  writeWorkspaceQueue(workspace, state);
  return cleared;
}

export function findNextPendingTask(workspacePath: string) {
  const state = readWorkspaceQueue(workspacePath);
  return state.tasks.find((task) => task.status === "pending") ?? null;
}

export function updateTaskStatus(params: {
  workspace: string;
  taskId: string;
  status: QueueTaskStatus;
  lastError?: string | null;
  lastResult?: string | null;
}) {
  const workspace = path.resolve(params.workspace);
  const state = readWorkspaceQueue(workspace);
  const task = state.tasks.find((entry) => entry.id === params.taskId);
  if (!task) {
    return null;
  }
  task.status = params.status;
  task.updatedAt = nowIso();
  if (params.lastError !== undefined) {
    task.lastError = params.lastError;
  }
  if (params.lastResult !== undefined) {
    task.lastResult = params.lastResult;
  }
  writeWorkspaceQueue(workspace, state);
  return task;
}

export function listQueueWorkspaceFiles() {
  const root = resolveQueueRootDir();
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => path.join(root, entry));
}

