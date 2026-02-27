/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { spawn } from "node:child_process";
import {
  isUnsafeWorkspaceInput,
  readConfig,
  resolveWorkspacePath,
} from "../config.js";
import { ensureSessionMemoryFile } from "../context-guard.js";
import { buildKaizenPrompt } from "../prompt.js";

type RunResult = {
  ok: boolean;
  code: number;
  errorMessage: string | null;
};

type ChatOptions = {
  workspace?: string;
  dryRun?: boolean;
};

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

  const promptResult = buildKaizenPrompt({
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
  args.push(promptResult.prompt);

  if (options.dryRun) {
    const previewArgs = [...args.slice(0, -1), "<kaizen-prompt>"];
    console.log("");
    console.log("Terminal chat dry run:");
    console.log(`codex ${previewArgs.join(" ")}`);
    console.log(
      `Context guard: ${contextGuardEnabled ? "enabled" : "disabled"} (${memory.thresholdPct}%)`,
    );
    console.log(`Memory file: ${memory.memoryPath}`);
    if (promptResult.usedFiles.length > 0) {
      console.log("Prompt files:");
      for (const file of promptResult.usedFiles) {
        console.log(`- ${file}`);
      }
    }
    return true;
  }

  console.log("");
  console.log(`Launching Kaizen terminal chat (${abilityProfile})...`);
  console.log(
    `Context guard: ${contextGuardEnabled ? "enabled" : "disabled"} (${memory.thresholdPct}%)`,
  );
  console.log(`Memory file: ${memory.memoryPath}`);
  if (promptResult.usedFiles.length > 0) {
    console.log("Prompt files:");
    for (const file of promptResult.usedFiles) {
      console.log(`- ${file}`);
    }
  }

  const result = await runProcess("codex", args);
  if (!result.ok && result.errorMessage) {
    console.log("");
    console.log(`Unable to launch Codex chat: ${result.errorMessage}`);
  }
  return result.ok;
}
