/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveKaizenHome } from "../config.js";
import type { KaizenServiceCommand, KaizenServiceStatus } from "./manager.js";

const SYSTEMD_SERVICE_NAME = "kaizen-agent.service";

function servicePath() {
  return path.join(os.homedir(), ".config", "systemd", "user", SYSTEMD_SERVICE_NAME);
}

function runSystemctl(args: string[]) {
  return spawnSync("systemctl", ["--user", ...args], {
    encoding: "utf8",
  });
}

function throwIfFailure(result: ReturnType<typeof spawnSync>, action: string) {
  if (result.status === 0) {
    return;
  }
  const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
  const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";
  const message = stderr || stdout || result.error?.message || "unknown error";
  throw new Error(`systemd ${action} failed: ${message}`);
}

function buildExecStart(command: KaizenServiceCommand) {
  return [command.nodePath, command.scriptPath, ...command.args].join(" ");
}

function buildServiceFile(command: KaizenServiceCommand) {
  const runDir = path.join(resolveKaizenHome(), "run");
  fs.mkdirSync(runDir, { recursive: true });

  return `[Unit]
Description=Kaizen Agent Service
After=network.target

[Service]
Type=simple
WorkingDirectory=${command.workingDirectory}
ExecStart=${buildExecStart(command)}
Restart=always
RestartSec=2
StandardOutput=append:${path.join(runDir, "service.stdout.log")}
StandardError=append:${path.join(runDir, "service.stderr.log")}

[Install]
WantedBy=default.target
`;
}

export async function installSystemdService(command: KaizenServiceCommand) {
  const targetPath = servicePath();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buildServiceFile(command), "utf8");

  throwIfFailure(runSystemctl(["daemon-reload"]), "daemon-reload");
  throwIfFailure(runSystemctl(["enable", "--now", SYSTEMD_SERVICE_NAME]), "enable");
}

export async function uninstallSystemdService() {
  runSystemctl(["disable", "--now", SYSTEMD_SERVICE_NAME]);
  const targetPath = servicePath();
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
  runSystemctl(["daemon-reload"]);
}

export async function startSystemdService() {
  throwIfFailure(runSystemctl(["start", SYSTEMD_SERVICE_NAME]), "start");
}

export async function stopSystemdService() {
  throwIfFailure(runSystemctl(["stop", SYSTEMD_SERVICE_NAME]), "stop");
}

export async function restartSystemdService() {
  throwIfFailure(runSystemctl(["restart", SYSTEMD_SERVICE_NAME]), "restart");
}

export async function systemdServiceStatus(): Promise<KaizenServiceStatus> {
  const targetPath = servicePath();
  const installed = fs.existsSync(targetPath);
  if (!installed) {
    return {
      installed: false,
      running: false,
      detail: `systemd unit missing at ${targetPath}`,
    };
  }

  const active = runSystemctl(["is-active", SYSTEMD_SERVICE_NAME]);
  const enabled = runSystemctl(["is-enabled", SYSTEMD_SERVICE_NAME]);
  const running = active.status === 0 && active.stdout.trim() === "active";

  return {
    installed: enabled.status === 0,
    running,
    detail: `is-enabled=${enabled.stdout.trim() || "unknown"}, is-active=${active.stdout.trim() || "unknown"}`,
  };
}
