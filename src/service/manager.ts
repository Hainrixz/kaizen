/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import path from "node:path";
import { installLaunchdService, launchdServiceStatus, restartLaunchdService, startLaunchdService, stopLaunchdService, uninstallLaunchdService } from "./launchd.js";
import { installSystemdService, restartSystemdService, startSystemdService, stopSystemdService, systemdServiceStatus, uninstallSystemdService } from "./systemd.js";
import { installSchtasksService, restartSchtasksService, schtasksServiceStatus, startSchtasksService, stopSchtasksService, uninstallSchtasksService } from "./schtasks.js";

export type KaizenServiceCommand = {
  nodePath: string;
  scriptPath: string;
  args: string[];
  workingDirectory: string;
  env?: Record<string, string | undefined>;
};

export type KaizenServiceStatus = {
  installed: boolean;
  running: boolean;
  detail: string;
};

export type KaizenServiceManager = {
  platform: NodeJS.Platform;
  install: (command: KaizenServiceCommand) => Promise<void>;
  uninstall: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  status: () => Promise<KaizenServiceStatus>;
};

export const KAIZEN_SERVICE_LABEL = "ai.kaizen.agent";

export function resolveDefaultServiceCommand(): KaizenServiceCommand {
  const scriptPath = path.resolve(process.argv[1] || "./kaizen.mjs");
  return {
    nodePath: process.execPath,
    scriptPath,
    args: ["service", "run", "--daemon"],
    workingDirectory: path.dirname(scriptPath),
    env: {
      KAIZEN_HOME: process.env.KAIZEN_HOME,
      PATH: process.env.PATH,
    },
  };
}

export function resolveServiceManager(): KaizenServiceManager {
  if (process.platform === "darwin") {
    return {
      platform: process.platform,
      install: installLaunchdService,
      uninstall: uninstallLaunchdService,
      start: startLaunchdService,
      stop: stopLaunchdService,
      restart: restartLaunchdService,
      status: launchdServiceStatus,
    };
  }

  if (process.platform === "linux") {
    return {
      platform: process.platform,
      install: installSystemdService,
      uninstall: uninstallSystemdService,
      start: startSystemdService,
      stop: stopSystemdService,
      restart: restartSystemdService,
      status: systemdServiceStatus,
    };
  }

  if (process.platform === "win32") {
    return {
      platform: process.platform,
      install: installSchtasksService,
      uninstall: uninstallSchtasksService,
      start: startSchtasksService,
      stop: stopSchtasksService,
      restart: restartSchtasksService,
      status: schtasksServiceStatus,
    };
  }

  throw new Error(`Service mode is not supported on ${process.platform}.`);
}
