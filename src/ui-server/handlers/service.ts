import { readConfig, writeConfig } from "../../config.js";
import {
  resolveDefaultServiceCommand,
  resolveServiceManager,
  type KaizenServiceStatus,
} from "../../service/manager.js";

function toServiceState(status: KaizenServiceStatus): "running" | "stopped" | "unknown" {
  if (!status.installed) {
    return "unknown";
  }
  return status.running ? "running" : "stopped";
}

function persistServiceStatus(status: KaizenServiceStatus, extra: { installed?: boolean } = {}) {
  const config = readConfig();
  const next = {
    ...config,
    service: {
      ...config.service,
      installed: extra.installed ?? status.installed,
      runtime: "node",
      lastKnownStatus: toServiceState(status),
    },
  };
  writeConfig(next);
  return next;
}

export async function serviceStatusSnapshot() {
  const manager = resolveServiceManager();
  const status = await manager.status();
  persistServiceStatus(status);
  return status;
}

export async function serviceRunAction(action: string) {
  const manager = resolveServiceManager();
  const normalizedAction = String(action ?? "").trim().toLowerCase();

  if (!normalizedAction) {
    throw new Error("Service action is required.");
  }

  if (normalizedAction === "install") {
    await manager.install(resolveDefaultServiceCommand());
    const status = await manager.status();
    persistServiceStatus(status, { installed: true });
    return status;
  }

  if (normalizedAction === "start") {
    await manager.start();
    const status = await manager.status();
    persistServiceStatus(status, { installed: true });
    return status;
  }

  if (normalizedAction === "stop") {
    await manager.stop();
    const status = await manager.status();
    persistServiceStatus(status);
    return status;
  }

  if (normalizedAction === "restart") {
    await manager.restart();
    const status = await manager.status();
    persistServiceStatus(status, { installed: true });
    return status;
  }

  if (normalizedAction === "uninstall") {
    await manager.uninstall();
    const status = await manager.status().catch(() => ({
      installed: false,
      running: false,
      detail: "service removed",
    }));
    persistServiceStatus(status, { installed: false });
    return {
      ...status,
      installed: false,
      running: false,
    };
  }

  if (normalizedAction === "status") {
    return serviceStatusSnapshot();
  }

  throw new Error(`Unsupported service action: ${normalizedAction}`);
}
