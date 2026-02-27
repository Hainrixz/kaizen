/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { readConfig, writeConfig } from "../config.js";
import {
  resolveDefaultServiceCommand,
  resolveServiceManager,
  type KaizenServiceStatus,
} from "../service/manager.js";
import { runServiceWorker } from "../service/worker.js";

function toServiceState(status: KaizenServiceStatus): "running" | "stopped" | "unknown" {
  if (!status.installed) {
    return "unknown";
  }
  return status.running ? "running" : "stopped";
}

function saveServiceStatus(status: KaizenServiceStatus, extra: { installed?: boolean } = {}) {
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
}

function printStatus(status: KaizenServiceStatus) {
  console.log("");
  console.log("Kaizen service status");
  console.log(`Installed: ${status.installed ? "yes" : "no"}`);
  console.log(`Running: ${status.running ? "yes" : "no"}`);
  console.log(`Detail: ${status.detail}`);
}

export async function serviceRunCommand(options: { daemon?: boolean; quiet?: boolean } = {}) {
  await runServiceWorker({
    daemon: Boolean(options.daemon),
    quiet: Boolean(options.quiet),
  });
}

export async function serviceInstallCommand() {
  const manager = resolveServiceManager();
  const command = resolveDefaultServiceCommand();

  await manager.install(command);
  const status = await manager.status();
  saveServiceStatus(status, { installed: true });

  console.log("");
  console.log("Kaizen service installed.");
  printStatus(status);
  return status;
}

export async function serviceStartCommand() {
  const manager = resolveServiceManager();
  await manager.start();
  const status = await manager.status();
  saveServiceStatus(status, { installed: status.installed || true });

  console.log("");
  console.log("Kaizen service started.");
  printStatus(status);
  return status;
}

export async function serviceStopCommand() {
  const manager = resolveServiceManager();
  await manager.stop();
  const status = await manager.status();
  saveServiceStatus(status);

  console.log("");
  console.log("Kaizen service stopped.");
  printStatus(status);
  return status;
}

export async function serviceRestartCommand() {
  const manager = resolveServiceManager();
  await manager.restart();
  const status = await manager.status();
  saveServiceStatus(status, { installed: status.installed || true });

  console.log("");
  console.log("Kaizen service restarted.");
  printStatus(status);
  return status;
}

export async function serviceStatusCommand() {
  const manager = resolveServiceManager();
  const status = await manager.status();
  saveServiceStatus(status);
  printStatus(status);
  return status;
}

export async function serviceUninstallCommand() {
  const manager = resolveServiceManager();
  await manager.uninstall();
  const status = await manager.status().catch(() => ({
    installed: false,
    running: false,
    detail: "service removed",
  }));
  saveServiceStatus(status, { installed: false });

  console.log("");
  console.log("Kaizen service uninstalled.");
  printStatus({ ...status, installed: false, running: false });
  return status;
}

export async function installAndStartServiceForAlwaysOnMode() {
  try {
    await serviceInstallCommand();
    await serviceStartCommand();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("");
    console.log(`Unable to enable always-on mode: ${message}`);
    return false;
  }
}
