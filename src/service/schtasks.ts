/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { spawnSync } from "node:child_process";
import type { KaizenServiceCommand, KaizenServiceStatus } from "./manager.js";

const TASK_NAME = "Kaizen Agent";

function runSchtasks(args: string[]) {
  return spawnSync("schtasks", args, {
    encoding: "utf8",
    shell: true,
  });
}

function throwIfFailure(result: ReturnType<typeof spawnSync>, action: string) {
  if (result.status === 0) {
    return;
  }
  const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
  const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";
  const message = stderr || stdout || result.error?.message || "unknown error";
  throw new Error(`schtasks ${action} failed: ${message}`);
}

function buildTaskCommand(command: KaizenServiceCommand) {
  const commandLine = [command.nodePath, command.scriptPath, ...command.args]
    .map((value) => `"${value}"`)
    .join(" ");
  return `cmd /d /c "cd /d \"${command.workingDirectory}\" && ${commandLine}"`;
}

export async function installSchtasksService(command: KaizenServiceCommand) {
  const taskCommand = buildTaskCommand(command);
  const create = runSchtasks([
    "/Create",
    "/F",
    "/SC",
    "ONLOGON",
    "/TN",
    `"${TASK_NAME}"`,
    "/TR",
    `"${taskCommand}"`,
  ]);
  throwIfFailure(create, "create");
}

export async function uninstallSchtasksService() {
  runSchtasks(["/Delete", "/F", "/TN", `"${TASK_NAME}"`]);
}

export async function startSchtasksService() {
  throwIfFailure(runSchtasks(["/Run", "/TN", `"${TASK_NAME}"`]), "start");
}

export async function stopSchtasksService() {
  throwIfFailure(runSchtasks(["/End", "/TN", `"${TASK_NAME}"`]), "stop");
}

export async function restartSchtasksService() {
  runSchtasks(["/End", "/TN", `"${TASK_NAME}"`]);
  throwIfFailure(runSchtasks(["/Run", "/TN", `"${TASK_NAME}"`]), "restart");
}

export async function schtasksServiceStatus(): Promise<KaizenServiceStatus> {
  const query = runSchtasks(["/Query", "/TN", `"${TASK_NAME}"`, "/FO", "LIST", "/V"]);
  if (query.status !== 0) {
    return {
      installed: false,
      running: false,
      detail: (query.stderr || query.stdout || "task missing").trim(),
    };
  }

  const output = `${query.stdout}\n${query.stderr}`;
  const statusLine = output
    .split(/\r?\n/)
    .find((line) => line.toLowerCase().startsWith("status:"));
  const running = Boolean(statusLine && statusLine.toLowerCase().includes("running"));

  return {
    installed: true,
    running,
    detail: statusLine?.trim() || "task registered",
  };
}
