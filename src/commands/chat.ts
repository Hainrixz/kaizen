/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  isUnsafeWorkspaceInput,
  readConfig,
  resolveWorkspacePath,
} from "../config.js";
import {
  buildContextGuardPromptBlock,
  ensureSessionMemoryFile,
} from "../context-guard.js";

type RunResult = {
  ok: boolean;
  code: number;
  errorMessage: string | null;
};

type ChatOptions = {
  workspace?: string;
  dryRun?: boolean;
};

function buildKaizenPrompt(params: {
  workspace: string;
  abilityProfile: string;
  contextGuardEnabled: boolean;
  contextGuardThresholdPct: number;
  memoryPath: string;
}) {
  const {
    workspace,
    abilityProfile,
    contextGuardEnabled,
    contextGuardThresholdPct,
    memoryPath,
  } = params;
  const profilePromptFile = path.join(
    workspace,
    ".kaizen",
    "profiles",
    abilityProfile,
    "SYSTEM_PROMPT.md",
  );

  if (fs.existsSync(profilePromptFile)) {
    return [
      "You are Kaizen.",
      `Use the ${abilityProfile} profile instructions from ${profilePromptFile} and stay focused on that scope.`,
      buildContextGuardPromptBlock({
        enabled: contextGuardEnabled,
        thresholdPct: contextGuardThresholdPct,
        memoryPath,
      }),
    ].join("\n");
  }

  return [
    "You are Kaizen.",
    `Stay focused on the ${abilityProfile} profile and ship production-ready web UI output.`,
    buildContextGuardPromptBlock({
      enabled: contextGuardEnabled,
      thresholdPct: contextGuardThresholdPct,
      memoryPath,
    }),
  ].join("\n");
}

function runProcess(command: string, args: string[]): Promise<RunResult> {
  return new Promise<RunResult>((resolve) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", (error) => {
      resolve({
        ok: false,
        code: 1,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });
    child.on("close", (code, signal) => {
      if (signal) {
        resolve({
          ok: false,
          code: 1,
          errorMessage: `process terminated by signal: ${signal}`,
        });
        return;
      }
      resolve({
        ok: code === 0,
        code: code ?? 1,
        errorMessage: null,
      });
    });
  });
}

export async function chatCommand(options: ChatOptions = {}) {
  if (
    typeof options.workspace === "string" &&
    options.workspace.trim().length > 0 &&
    isUnsafeWorkspaceInput(options.workspace)
  ) {
    throw new Error(
      "Invalid workspace path. Pass a filesystem path (example: ~/kaizen-workspace), not a shell command.",
    );
  }

  const config = readConfig();
  const workspace = resolveWorkspacePath(options.workspace, config.defaults.workspace);
  const abilityProfile = config.defaults.abilityProfile ?? "web-design";
  const modelProvider = config.defaults.modelProvider;
  const localRuntime = config.defaults.localRuntime;
  const contextGuardEnabled = config.defaults.contextGuardEnabled ?? true;
  const contextGuardThresholdPct = config.defaults.contextGuardThresholdPct ?? 65;
  const memory = ensureSessionMemoryFile({
    workspace,
    abilityProfile,
    thresholdPct: contextGuardThresholdPct,
  });

  const prompt = buildKaizenPrompt({
    workspace,
    abilityProfile,
    contextGuardEnabled,
    contextGuardThresholdPct,
    memoryPath: memory.memoryPath,
  });
  const args: string[] = [];

  if (modelProvider === "local") {
    args.push("--oss");
    if (localRuntime) {
      args.push("--local-provider", localRuntime);
    }
  }

  args.push("--cd", workspace);
  args.push(prompt);

  if (options.dryRun) {
    console.log("");
    console.log("Terminal chat dry run:");
    console.log(`codex ${args.join(" ")}`);
    console.log(`Context guard: ${contextGuardEnabled ? "enabled" : "disabled"} (${memory.thresholdPct}%)`);
    console.log(`Memory file: ${memory.memoryPath}`);
    return true;
  }

  console.log("");
  console.log(`Launching Kaizen terminal chat (${abilityProfile})...`);
  console.log(`Context guard: ${contextGuardEnabled ? "enabled" : "disabled"} (${memory.thresholdPct}%)`);
  console.log(`Memory file: ${memory.memoryPath}`);
  const result = await runProcess("codex", args);
  if (!result.ok && result.errorMessage) {
    console.log("");
    console.log(`Unable to launch Codex chat: ${result.errorMessage}`);
  }
  return result.ok;
}
