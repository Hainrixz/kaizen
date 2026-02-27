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
import { KAIZEN_SERVICE_LABEL, type KaizenServiceCommand, type KaizenServiceStatus } from "./manager.js";

function plistPath() {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${KAIZEN_SERVICE_LABEL}.plist`);
}

function runLaunchctl(args: string[]) {
  return spawnSync("launchctl", args, {
    encoding: "utf8",
  });
}

function ensureRunLogPaths() {
  const runDir = path.join(resolveKaizenHome(), "run");
  fs.mkdirSync(runDir, { recursive: true });
  return {
    outPath: path.join(runDir, "service.stdout.log"),
    errPath: path.join(runDir, "service.stderr.log"),
  };
}

function buildPlist(command: KaizenServiceCommand) {
  const logs = ensureRunLogPaths();
  const args = [command.nodePath, command.scriptPath, ...command.args]
    .map((value) => `    <string>${value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${KAIZEN_SERVICE_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
${args}
    </array>
    <key>WorkingDirectory</key>
    <string>${command.workingDirectory}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${logs.outPath}</string>
    <key>StandardErrorPath</key>
    <string>${logs.errPath}</string>
  </dict>
</plist>
`;
}

function throwIfFailure(result: ReturnType<typeof spawnSync>, action: string) {
  if (result.status === 0) {
    return;
  }
  const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
  const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";
  const message = stderr || stdout || result.error?.message || "unknown error";
  throw new Error(`launchd ${action} failed: ${message}`);
}

function uidDomain() {
  return `gui/${process.getuid()}`;
}

export async function installLaunchdService(command: KaizenServiceCommand) {
  const targetPath = plistPath();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buildPlist(command), "utf8");

  runLaunchctl(["bootout", uidDomain(), targetPath]);
  const bootstrap = runLaunchctl(["bootstrap", uidDomain(), targetPath]);
  throwIfFailure(bootstrap, "bootstrap");
  const enable = runLaunchctl(["enable", `${uidDomain()}/${KAIZEN_SERVICE_LABEL}`]);
  if (enable.status !== 0) {
    // keep best effort; bootstrap succeeded already
  }
}

export async function uninstallLaunchdService() {
  const targetPath = plistPath();
  runLaunchctl(["bootout", uidDomain(), targetPath]);
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
}

export async function startLaunchdService() {
  const result = runLaunchctl(["kickstart", "-k", `${uidDomain()}/${KAIZEN_SERVICE_LABEL}`]);
  throwIfFailure(result, "start");
}

export async function stopLaunchdService() {
  const targetPath = plistPath();
  const result = runLaunchctl(["bootout", uidDomain(), targetPath]);
  if (result.status !== 0 && !result.stderr?.includes("No such process")) {
    throwIfFailure(result, "stop");
  }
}

export async function restartLaunchdService() {
  await startLaunchdService();
}

export async function launchdServiceStatus(): Promise<KaizenServiceStatus> {
  const targetPath = plistPath();
  const installed = fs.existsSync(targetPath);
  const result = runLaunchctl(["print", `${uidDomain()}/${KAIZEN_SERVICE_LABEL}`]);

  if (!installed) {
    return {
      installed: false,
      running: false,
      detail: `LaunchAgent file missing at ${targetPath}`,
    };
  }

  if (result.status !== 0) {
    return {
      installed: true,
      running: false,
      detail: (result.stderr || result.stdout || "service not loaded").trim(),
    };
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const running = !output.includes('"state" = waiting') && !output.includes("state = waiting");
  return {
    installed: true,
    running,
    detail: running ? "launchd service loaded" : "launchd service loaded but idle",
  };
}
