import { readConfig, resolveWorkspacePath } from "../../config.js";
import {
  addWorkspaceQueueTask,
  clearWorkspaceQueue,
  listWorkspaceQueueTasks,
  removeWorkspaceQueueTask,
} from "../../runtime/queue-store.js";
import { runNextQueuedTask } from "../../runtime/autonomy-runner.js";

function resolveWorkspace(rawWorkspace: unknown) {
  const config = readConfig();
  return resolveWorkspacePath(
    typeof rawWorkspace === "string" ? rawWorkspace : undefined,
    config.defaults.workspace,
  );
}

function asObject(params: unknown) {
  if (!params || typeof params !== "object") {
    return {} as Record<string, unknown>;
  }
  return params as Record<string, unknown>;
}

export async function queueList(params: unknown) {
  const payload = asObject(params);
  const workspace = resolveWorkspace(payload.workspace);
  const tasks = listWorkspaceQueueTasks(workspace);
  return {
    workspace,
    tasks,
  };
}

export async function queueAdd(params: unknown) {
  const payload = asObject(params);
  const workspace = resolveWorkspace(payload.workspace);
  const title = String(payload.title ?? "").trim();
  const prompt = String(payload.prompt ?? "").trim();
  if (!title) {
    throw new Error("Queue task title is required.");
  }
  if (!prompt) {
    throw new Error("Queue task prompt is required.");
  }
  const task = addWorkspaceQueueTask({
    workspace,
    title,
    prompt,
  });
  return {
    workspace,
    task,
  };
}

export async function queueRemove(params: unknown) {
  const payload = asObject(params);
  const workspace = resolveWorkspace(payload.workspace);
  const id = String(payload.id ?? "").trim();
  if (!id) {
    throw new Error("Queue task id is required.");
  }
  const removed = removeWorkspaceQueueTask(workspace, id);
  return {
    workspace,
    removed,
    id,
  };
}

export async function queueClear(params: unknown) {
  const payload = asObject(params);
  const workspace = resolveWorkspace(payload.workspace);
  const removedCount = clearWorkspaceQueue(workspace);
  return {
    workspace,
    removedCount,
  };
}

export async function queueRunNext(params: unknown) {
  const payload = asObject(params);
  const workspace = resolveWorkspace(payload.workspace);
  const result = await runNextQueuedTask({
    workspace,
  });
  return {
    workspace,
    ...result,
  };
}

