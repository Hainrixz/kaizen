/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import {
  isUnsafeWorkspaceInput,
  normalizeAccessScope,
  readConfig,
  resolveWorkspacePath,
} from "../config.js";
import { ensureSessionMemoryFile } from "../context-guard.js";
import { resolveRunner } from "../engine/runner-registry.js";
import { buildKaizenPrompt } from "../prompt.js";
import { assertPathAllowed } from "../runtime/access-policy.js";
import { startHeartbeat } from "../runtime/heartbeat.js";

type ChatOptions = {
  workspace?: string;
  dryRun?: boolean;
};

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
  const runner = resolveRunner(config);
  const workspace = resolveWorkspacePath(options.workspace, config.defaults.workspace);
  assertPathAllowed(
    workspace,
    {
      scope: normalizeAccessScope(config.access.scope) as "workspace" | "workspace-plus" | "full",
      allowPaths: config.access.allowPaths,
    },
    config.defaults.workspace,
  );
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

  const previewArgs: string[] = [];
  if (modelProvider === "local") {
    previewArgs.push("--oss");
    if (localRuntime) {
      previewArgs.push("--local-provider", localRuntime);
    }
  }
  previewArgs.push("--cd", workspace, "<kaizen-prompt>");

  if (options.dryRun) {
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

  const heartbeat = startHeartbeat({
    runtime: "manual",
  });

  try {
    const result = await runner.runInteractiveSession({
      workspace,
      prompt: promptResult.prompt,
      modelProvider,
      localRuntime,
    });

    if (!result.ok && result.errorMessage) {
      console.log("");
      console.log(`Unable to launch model session: ${result.errorMessage}`);
    }
    return result.ok;
  } finally {
    heartbeat.stop();
    await heartbeat.wait();
  }
}
