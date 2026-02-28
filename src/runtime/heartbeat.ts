/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { readConfig } from "../config.js";
import {
  getAutonomyRuntimeState,
  runNextQueuedTask,
} from "./autonomy-runner.js";
import { writeHeartbeatState } from "./heartbeat-state.js";

export type HeartbeatRuntimeKind = "manual" | "service";

type StartHeartbeatParams = {
  runtime: HeartbeatRuntimeKind;
  log?: (line: string) => void;
};

export type HeartbeatHandle = {
  stop: () => void;
  wait: () => Promise<void>;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function startHeartbeat(params: StartHeartbeatParams): HeartbeatHandle {
  const log = params.log ?? (() => {});
  let stopped = false;
  let resolveWait: (() => void) | null = null;

  const waitPromise = new Promise<void>((resolve) => {
    resolveWait = resolve;
  });

  const runLoop = async () => {
    while (!stopped) {
      const config = readConfig();
      const intervalMs = Math.max(500, Number(config.heartbeat?.intervalMs ?? 1500));
      const heartbeatEnabled = Boolean(config.heartbeat?.enabled ?? true);
      const autonomyEnabled = Boolean(config.autonomy?.enabled ?? false);

      const tickAt = new Date().toISOString();
      const activeAutonomy = getAutonomyRuntimeState();
      writeHeartbeatState({
        heartbeatEnabled,
        runtime: params.runtime,
        autonomyEnabled,
        activeRun: activeAutonomy.running,
        lastTickAt: heartbeatEnabled ? tickAt : null,
        lastError: null,
      });

      if (heartbeatEnabled && autonomyEnabled && !activeAutonomy.running) {
        try {
          const mode = config.autonomy?.mode === "free-run" ? "free-run" : "queued";
          if (mode === "queued") {
            await runNextQueuedTask({
              workspace: config.defaults.workspace,
              log: (line) => log(`[queue] ${line}`),
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          writeHeartbeatState({
            heartbeatEnabled,
            runtime: params.runtime,
            autonomyEnabled,
            activeRun: getAutonomyRuntimeState().running,
            lastTickAt: tickAt,
            lastError: message,
          });
          log(`[heartbeat] tick failed: ${message}`);
        }
      }

      await sleep(intervalMs);
    }

    resolveWait?.();
  };

  runLoop().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    writeHeartbeatState({
      runtime: params.runtime,
      heartbeatEnabled: true,
      autonomyEnabled: false,
      activeRun: false,
      lastTickAt: new Date().toISOString(),
      lastError: message,
    });
    log(`[heartbeat] loop crashed: ${message}`);
    resolveWait?.();
  });

  return {
    stop() {
      stopped = true;
    },
    wait() {
      return waitPromise;
    },
  };
}
