/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import {
  isUnsafeWorkspaceInput,
  readConfig,
  resolveWorkspacePath,
  writeConfig,
} from "../config.js";
import {
  addWorkspaceQueueTask,
  clearWorkspaceQueue,
  hashWorkspace,
  listWorkspaceQueueTasks,
  removeWorkspaceQueueTask,
} from "../runtime/queue-store.js";
import { runNextQueuedTask } from "../runtime/autonomy-runner.js";

type QueueWorkspaceOptions = {
  workspace?: string;
};

function resolveQueueWorkspace(options: QueueWorkspaceOptions) {
  const config = readConfig();
  if (
    typeof options.workspace === "string" &&
    options.workspace.trim().length > 0 &&
    isUnsafeWorkspaceInput(options.workspace)
  ) {
    throw new Error(
      "Invalid workspace path. Pass a filesystem path (example: ~/kaizen-workspace), not a shell command.",
    );
  }
  return resolveWorkspacePath(options.workspace, config.defaults.workspace);
}

function persistQueueWorkspace(workspace: string) {
  const config = readConfig();
  const next = {
    ...config,
    queue: {
      ...(config.queue ?? {}),
      defaultWorkspaceHash: hashWorkspace(workspace),
      lastRunAt: config.queue?.lastRunAt ?? null,
    },
  };
  writeConfig(next);
}

export async function queueAddCommand(options: {
  title?: string;
  prompt?: string;
  workspace?: string;
}) {
  const workspace = resolveQueueWorkspace(options);
  const title = String(options.title ?? "").trim();
  const prompt = String(options.prompt ?? "").trim();

  if (!title) {
    throw new Error("Queue task requires --title.");
  }
  if (!prompt) {
    throw new Error("Queue task requires --prompt.");
  }

  const task = addWorkspaceQueueTask({
    workspace,
    title,
    prompt,
  });
  persistQueueWorkspace(workspace);

  console.log("");
  console.log("Queue task added.");
  console.log(`Workspace: ${workspace}`);
  console.log(`Task id: ${task.id}`);
  console.log(`Title: ${task.title}`);
  return task;
}

export async function queueListCommand(options: QueueWorkspaceOptions = {}) {
  const workspace = resolveQueueWorkspace(options);
  const tasks = listWorkspaceQueueTasks(workspace);
  persistQueueWorkspace(workspace);

  console.log("");
  console.log(`Queue tasks (${workspace})`);
  if (tasks.length === 0) {
    console.log("No tasks queued.");
    return tasks;
  }

  for (const task of tasks) {
    console.log(
      `- ${task.id} [${task.status}] ${task.title} (updated ${task.updatedAt})${task.lastError ? ` error: ${task.lastError}` : ""}`,
    );
  }
  return tasks;
}

export async function queueRemoveCommand(options: {
  id?: string;
  workspace?: string;
}) {
  const workspace = resolveQueueWorkspace(options);
  const taskId = String(options.id ?? "").trim();
  if (!taskId) {
    throw new Error("Use --id to remove a queue task.");
  }

  const removed = removeWorkspaceQueueTask(workspace, taskId);
  console.log("");
  if (removed) {
    console.log(`Queue task removed: ${taskId}`);
  } else {
    console.log(`Queue task not found: ${taskId}`);
  }
  return removed;
}

export async function queueClearCommand(options: QueueWorkspaceOptions = {}) {
  const workspace = resolveQueueWorkspace(options);
  const clearedCount = clearWorkspaceQueue(workspace);
  console.log("");
  console.log(`Queue cleared (${clearedCount} task${clearedCount === 1 ? "" : "s"} removed).`);
  return clearedCount;
}

export async function queueRunNextCommand(options: QueueWorkspaceOptions = {}) {
  const workspace = resolveQueueWorkspace(options);
  const result = await runNextQueuedTask({
    workspace,
    log: (line) => console.log(`[queue] ${line}`),
  });

  console.log("");
  if (!result.ran) {
    console.log(`No task executed: ${result.reason ?? "no pending tasks"}`);
    return result;
  }

  console.log(`Ran task ${result.taskId} (${result.title ?? "untitled"}).`);
  console.log(`Result: ${result.ok ? "success" : "failed"}`);
  if (!result.ok && result.reason) {
    console.log(`Reason: ${result.reason}`);
  }
  return result;
}

