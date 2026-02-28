/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import {
  normalizeAccessScope,
  normalizeAutonomyMode,
  readConfig,
  resolveKaizenHome,
  writeConfig,
} from "../config.js";
import { runModelTurn } from "../engine/codex-turn.js";
import { assertPathAllowed } from "./access-policy.js";
import {
  addWorkspaceQueueTask,
  findNextPendingTask,
  hashWorkspace,
  listWorkspaceQueueTasks,
  updateTaskStatus,
} from "./queue-store.js";

export type AutonomyRuntimeMode = "queued" | "free-run";

type StartAutonomyOptions = {
  mode: AutonomyRuntimeMode;
  workspace?: string;
  maxTurns?: number;
  maxMinutes?: number;
  log?: (line: string) => void;
};

type QueueRunResult = {
  ran: boolean;
  taskId?: string;
  title?: string;
  ok?: boolean;
  response?: string;
  reason?: string;
};

type RuntimeState = {
  running: boolean;
  mode: AutonomyRuntimeMode | null;
  startedAt: string | null;
  workspace: string | null;
  turnsCompleted: number;
  maxTurns: number;
  maxMinutes: number;
  stopRequested: boolean;
  activeTaskId: string | null;
};

const AUTONOMY_LOCK_VERSION = 1;

let runtimeState: RuntimeState = {
  running: false,
  mode: null,
  startedAt: null,
  workspace: null,
  turnsCompleted: 0,
  maxTurns: 0,
  maxMinutes: 0,
  stopRequested: false,
  activeTaskId: null,
};

let activeAbortController: AbortController | null = null;
let activeRunPromise: Promise<void> | null = null;
let queuedTurnInFlight = false;

function resolveAutonomyLockPath() {
  return path.join(resolveKaizenHome(), "run", "autonomy.lock");
}

function nowIso() {
  return new Date().toISOString();
}

function writeAutonomyLockFile(state: RuntimeState) {
  const lockPath = resolveAutonomyLockPath();
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  fs.writeFileSync(
    lockPath,
    `${JSON.stringify(
      {
        version: AUTONOMY_LOCK_VERSION,
        pid: process.pid,
        startedAt: state.startedAt,
        mode: state.mode,
        workspace: state.workspace,
        maxTurns: state.maxTurns,
        maxMinutes: state.maxMinutes,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function removeAutonomyLockFile() {
  const lockPath = resolveAutonomyLockPath();
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}

function updateQueueRuntimeMetadata(workspace: string) {
  const config = readConfig();
  const next = {
    ...config,
    queue: {
      ...(config.queue ?? {}),
      defaultWorkspaceHash: hashWorkspace(workspace),
      lastRunAt: nowIso(),
    },
  };
  writeConfig(next);
}

export function getAutonomyRuntimeState() {
  return {
    ...runtimeState,
    lockFile: resolveAutonomyLockPath(),
    activeRun: Boolean(activeRunPromise),
  };
}

export async function runNextQueuedTask(options: {
  workspace?: string;
  log?: (line: string) => void;
} = {}): Promise<QueueRunResult> {
  if (queuedTurnInFlight) {
    return {
      ran: false,
      reason: "queue run already active",
    };
  }
  queuedTurnInFlight = true;

  const config = readConfig();
  const workspace = path.resolve(options.workspace ?? config.defaults.workspace);
  const log = options.log ?? (() => {});

  assertPathAllowed(
    workspace,
    {
      scope: normalizeAccessScope(config.access.scope) as "workspace" | "workspace-plus" | "full",
      allowPaths: config.access.allowPaths,
    },
    config.defaults.workspace,
  );

  let activeTaskId: string | null = null;
  let activeTaskTitle: string | null = null;

  try {
    const nextTask = findNextPendingTask(workspace);
    if (!nextTask) {
      return {
        ran: false,
        reason: "no pending tasks",
      };
    }

    updateTaskStatus({
      workspace,
      taskId: nextTask.id,
      status: "running",
      lastError: null,
    });

    runtimeState.activeTaskId = nextTask.id;
    activeTaskId = nextTask.id;
    activeTaskTitle = nextTask.title;
    activeAbortController = new AbortController();

    log(`running queued task ${nextTask.id}: ${nextTask.title}`);
    const result = await runModelTurn({
      workspace,
      abilityProfile: config.defaults.abilityProfile,
      modelProvider: config.defaults.modelProvider,
      localRuntime: config.defaults.localRuntime,
      contextGuardEnabled: config.defaults.contextGuardEnabled,
      contextGuardThresholdPct: config.defaults.contextGuardThresholdPct,
      userMessage: nextTask.prompt,
      abortSignal: activeAbortController.signal,
      quiet: true,
    });

    updateTaskStatus({
      workspace,
      taskId: nextTask.id,
      status: result.ok ? "completed" : "failed",
      lastError: result.ok ? null : result.errorMessage ?? "model turn failed",
      lastResult: result.response,
    });
    updateQueueRuntimeMetadata(workspace);
    runtimeState.turnsCompleted += 1;
    return {
      ran: true,
      taskId: nextTask.id,
      title: nextTask.title,
      ok: result.ok,
      response: result.response,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (activeTaskId) {
      updateTaskStatus({
        workspace,
        taskId: activeTaskId,
        status: "failed",
        lastError: message,
      });
    }
    return {
      ran: true,
      taskId: activeTaskId ?? undefined,
      title: activeTaskTitle ?? undefined,
      ok: false,
      reason: message,
    };
  } finally {
    runtimeState.activeTaskId = null;
    activeAbortController = null;
    queuedTurnInFlight = false;
  }
}

function buildFreeRunPrompt(turnNumber: number, maxTurns: number, workspace: string, ability: string) {
  return [
    `Autonomous free-run turn ${turnNumber}/${maxTurns}.`,
    `Workspace: ${workspace}`,
    `Ability profile: ${ability}`,
    "",
    "Pick one concrete improvement for this project and execute it.",
    "Prioritize safe, reversible changes. Then summarize what changed and the next best follow-up task.",
  ].join("\n");
}

function applyRuntimeDefaults(mode: AutonomyRuntimeMode, options: StartAutonomyOptions) {
  const config = readConfig();
  return {
    mode,
    workspace: path.resolve(options.workspace ?? config.defaults.workspace),
    maxTurns:
      typeof options.maxTurns === "number" && Number.isFinite(options.maxTurns)
        ? Math.max(1, Math.round(options.maxTurns))
        : Math.max(1, Number(config.autonomy?.freeRun?.maxTurns ?? 5)),
    maxMinutes:
      typeof options.maxMinutes === "number" && Number.isFinite(options.maxMinutes)
        ? Math.max(1, Math.round(options.maxMinutes))
        : Math.max(1, Number(config.autonomy?.freeRun?.maxMinutes ?? 20)),
  };
}

async function runQueuedModeLoop(params: {
  workspace: string;
  maxTurns: number;
  maxMinutes: number;
  log: (line: string) => void;
}) {
  const startedAtMs = Date.now();
  while (!runtimeState.stopRequested) {
    if (runtimeState.turnsCompleted >= params.maxTurns) {
      params.log("autonomy budget reached: max turns");
      break;
    }
    const elapsedMinutes = (Date.now() - startedAtMs) / 60_000;
    if (elapsedMinutes >= params.maxMinutes) {
      params.log("autonomy budget reached: max minutes");
      break;
    }
    const result = await runNextQueuedTask({
      workspace: params.workspace,
      log: params.log,
    });
    if (!result.ran) {
      break;
    }
  }
}

async function runFreeRunLoop(params: {
  workspace: string;
  maxTurns: number;
  maxMinutes: number;
  log: (line: string) => void;
}) {
  const config = readConfig();
  const startedAtMs = Date.now();

  for (let turnNumber = 1; turnNumber <= params.maxTurns; turnNumber += 1) {
    if (runtimeState.stopRequested) {
      break;
    }

    const elapsedMinutes = (Date.now() - startedAtMs) / 60_000;
    if (elapsedMinutes >= params.maxMinutes) {
      params.log("autonomy budget reached: max minutes");
      break;
    }

    const prompt = buildFreeRunPrompt(
      turnNumber,
      params.maxTurns,
      params.workspace,
      config.defaults.abilityProfile,
    );
    const queuedTask = addWorkspaceQueueTask({
      workspace: params.workspace,
      title: `free-run turn ${turnNumber}`,
      prompt,
    });
    params.log(`free-run queued task created: ${queuedTask.id}`);
    await runNextQueuedTask({
      workspace: params.workspace,
      log: params.log,
    });
  }
}

export function startAutonomyRun(options: StartAutonomyOptions) {
  if (runtimeState.running || activeRunPromise) {
    return {
      started: false,
      reason: "autonomy runtime is already active",
      state: getAutonomyRuntimeState(),
    };
  }

  const resolved = applyRuntimeDefaults(options.mode, options);
  const log = options.log ?? (() => {});
  const config = readConfig();

  assertPathAllowed(
    resolved.workspace,
    {
      scope: normalizeAccessScope(config.access.scope) as "workspace" | "workspace-plus" | "full",
      allowPaths: config.access.allowPaths,
    },
    config.defaults.workspace,
  );

  runtimeState = {
    running: true,
    mode: resolved.mode,
    startedAt: nowIso(),
    workspace: resolved.workspace,
    turnsCompleted: 0,
    maxTurns: resolved.maxTurns,
    maxMinutes: resolved.maxMinutes,
    stopRequested: false,
    activeTaskId: null,
  };
  writeAutonomyLockFile(runtimeState);

  activeRunPromise = (async () => {
    try {
      if (resolved.mode === "queued") {
        await runQueuedModeLoop({
          workspace: resolved.workspace,
          maxTurns: resolved.maxTurns,
          maxMinutes: resolved.maxMinutes,
          log,
        });
      } else {
        await runFreeRunLoop({
          workspace: resolved.workspace,
          maxTurns: resolved.maxTurns,
          maxMinutes: resolved.maxMinutes,
          log,
        });
      }
    } finally {
      runtimeState.running = false;
      runtimeState.mode = null;
      runtimeState.stopRequested = false;
      runtimeState.activeTaskId = null;
      activeRunPromise = null;
      removeAutonomyLockFile();
    }
  })();

  return {
    started: true,
    state: getAutonomyRuntimeState(),
  };
}

export async function stopAutonomyRun() {
  if (!runtimeState.running && !activeRunPromise) {
    removeAutonomyLockFile();
    return {
      stopped: false,
      reason: "autonomy runtime is not active",
      state: getAutonomyRuntimeState(),
    };
  }

  runtimeState.stopRequested = true;
  activeAbortController?.abort();

  if (activeRunPromise) {
    await activeRunPromise;
  }

  removeAutonomyLockFile();

  return {
    stopped: true,
    state: getAutonomyRuntimeState(),
  };
}

export function getQueueSummary(workspacePath: string) {
  const tasks = listWorkspaceQueueTasks(workspacePath);
  return {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === "pending").length,
    running: tasks.filter((task) => task.status === "running").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    failed: tasks.filter((task) => task.status === "failed").length,
    cancelled: tasks.filter((task) => task.status === "cancelled").length,
  };
}
