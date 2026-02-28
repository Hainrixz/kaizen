/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { readConfig, resolveKaizenHome } from "../config.js";
import { startTelegramPoller } from "../channels/telegram/poller.js";
import { startHeartbeat } from "../runtime/heartbeat.js";
import { stopAutonomyRun } from "../runtime/autonomy-runner.js";

type WorkerOptions = {
  daemon?: boolean;
  quiet?: boolean;
};

function resolvePidPath() {
  return path.join(resolveKaizenHome(), "run", "service.pid");
}

function writePidFile() {
  const pidPath = resolvePidPath();
  fs.mkdirSync(path.dirname(pidPath), { recursive: true });
  fs.writeFileSync(pidPath, `${process.pid}\n`, "utf8");
  return pidPath;
}

function removePidFile() {
  const pidPath = resolvePidPath();
  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath);
  }
}

function waitForever() {
  return new Promise<void>(() => {
    // no-op; resolved by process signals
  });
}

export async function runServiceWorker(options: WorkerOptions = {}) {
  const config = readConfig();
  const pidPath = writePidFile();
  const quiet = Boolean(options.quiet);
  const heartbeatHandle = startHeartbeat({
    runtime: "service",
    log: (line) => {
      if (!quiet) {
        console.log(line);
      }
    },
  });

  if (!quiet) {
    console.log("");
    console.log(`Kaizen worker started (pid ${process.pid})`);
    console.log(`PID file: ${pidPath}`);
  }

  let telegramHandle: ReturnType<typeof startTelegramPoller> | null = null;

  const telegramConfig = config.channels?.telegram;
  const token = (telegramConfig?.botToken ?? "").trim();
  const telegramEnabled = Boolean(telegramConfig?.enabled && token);

  if (telegramEnabled) {
    telegramHandle = startTelegramPoller({
      workspace: config.defaults.workspace,
      abilityProfile: config.defaults.abilityProfile,
      modelProvider: config.defaults.modelProvider,
      localRuntime: config.defaults.localRuntime,
      contextGuardEnabled: config.defaults.contextGuardEnabled,
      contextGuardThresholdPct: config.defaults.contextGuardThresholdPct,
      token,
      allowFrom: telegramConfig?.allowFrom ?? [],
      pollIntervalMs: telegramConfig?.pollIntervalMs ?? 1500,
      longPollTimeoutSec: telegramConfig?.longPollTimeoutSec ?? 25,
      log: (line) => {
        if (!quiet) {
          console.log(`[telegram] ${line}`);
        }
      },
    });

    if (!quiet) {
      console.log("Telegram channel enabled in worker mode.");
    }
  } else if (!quiet) {
    console.log("Worker running with no enabled channels. Waiting for stop signal.");
  }

  let stopping = false;
  const stopWorker = async (signal: NodeJS.Signals) => {
    if (stopping) {
      return;
    }
    stopping = true;
    if (!quiet) {
      console.log(`Stopping Kaizen worker (${signal})...`);
    }
    heartbeatHandle.stop();
    telegramHandle?.stop();
    if (telegramHandle) {
      await telegramHandle.wait();
    }
    await heartbeatHandle.wait();
    await stopAutonomyRun().catch(() => undefined);
    removePidFile();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void stopWorker("SIGINT");
  });
  process.on("SIGTERM", () => {
    void stopWorker("SIGTERM");
  });

  await waitForever();
}
