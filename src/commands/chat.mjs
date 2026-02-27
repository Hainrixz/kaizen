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
} from "../config.mjs";

function buildKaizenPrompt(workspace, abilityProfile) {
  const profilePromptFile = path.join(
    workspace,
    ".kaizen",
    "profiles",
    abilityProfile,
    "SYSTEM_PROMPT.md",
  );

  if (fs.existsSync(profilePromptFile)) {
    return `You are Kaizen. Use the ${abilityProfile} profile instructions from ${profilePromptFile} and stay focused on that scope.`;
  }

  return `You are Kaizen. Stay focused on the ${abilityProfile} profile and ship production-ready web UI output.`;
}

function runProcess(command, args) {
  return new Promise((resolve) => {
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

export async function chatCommand(options = {}) {
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

  const prompt = buildKaizenPrompt(workspace, abilityProfile);
  const args = [];

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
    return true;
  }

  console.log("");
  console.log(`Launching Kaizen terminal chat (${abilityProfile})...`);
  const result = await runProcess("codex", args);
  if (!result.ok && result.errorMessage) {
    console.log("");
    console.log(`Unable to launch Codex chat: ${result.errorMessage}`);
  }
  return result.ok;
}
