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
  ensureSessionMemoryFile,
  appendSessionMemorySnapshot,
} from "../context-guard.js";
import { resolveKaizenHome } from "../config.js";
import { buildKaizenPrompt } from "../prompt.js";

export type CodexTurnOptions = {
  workspace: string;
  abilityProfile: string;
  modelProvider: string;
  localRuntime: string;
  contextGuardEnabled: boolean;
  contextGuardThresholdPct: number;
  userMessage: string;
  quiet?: boolean;
};

export type CodexTurnResult = {
  ok: boolean;
  response: string;
  errorMessage: string | null;
  exitCode: number;
  memoryPath: string;
};

type ProcessResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  errorMessage: string | null;
};

function estimateContextWindowTokens(modelProvider: string) {
  return modelProvider === "openai-codex" ? 200_000 : 128_000;
}

function estimateTokenCount(text: string) {
  if (!text) {
    return 0;
  }
  // Lightweight approximation used for guardrail triggering in worker turns.
  return Math.ceil(text.length / 4);
}

function estimateUsagePct(params: {
  modelProvider: string;
  prompt: string;
  userMessage: string;
  memoryPath: string;
}) {
  let memoryText = "";
  try {
    if (fs.existsSync(params.memoryPath)) {
      memoryText = fs.readFileSync(params.memoryPath, "utf8");
    }
  } catch {
    memoryText = "";
  }

  const usedTokens =
    estimateTokenCount(params.prompt) +
    estimateTokenCount(params.userMessage) +
    estimateTokenCount(memoryText);
  const windowTokens = estimateContextWindowTokens(params.modelProvider);
  if (windowTokens <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((usedTokens / windowTokens) * 100));
}

function runProcess(command: string, args: string[]): Promise<ProcessResult> {
  return new Promise<ProcessResult>((resolve) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        exitCode: 1,
        stdout,
        stderr,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });

    child.on("close", (code, signal) => {
      if (signal) {
        resolve({
          ok: false,
          exitCode: 1,
          stdout,
          stderr,
          errorMessage: `process terminated by signal: ${signal}`,
        });
        return;
      }
      resolve({
        ok: code === 0,
        exitCode: code ?? 1,
        stdout,
        stderr,
        errorMessage: null,
      });
    });
  });
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

export async function runCodexTurn(options: CodexTurnOptions): Promise<CodexTurnResult> {
  const memory = ensureSessionMemoryFile({
    workspace: options.workspace,
    abilityProfile: options.abilityProfile,
    thresholdPct: options.contextGuardThresholdPct,
  });

  const promptResult = buildKaizenPrompt({
    workspace: options.workspace,
    abilityProfile: options.abilityProfile,
    contextGuardEnabled: options.contextGuardEnabled,
    contextGuardThresholdPct: options.contextGuardThresholdPct,
    memoryPath: memory.memoryPath,
  });

  const runDir = path.join(resolveKaizenHome(), "run");
  fs.mkdirSync(runDir, { recursive: true });
  const outputPath = path.join(runDir, "codex-last-message.txt");

  const instruction = [
    promptResult.prompt,
    "",
    "Incoming user message:",
    options.userMessage,
    "",
    "Respond as Kaizen with practical implementation guidance and next action.",
  ].join("\n\n");

  if (options.contextGuardEnabled) {
    const usagePct = estimateUsagePct({
      modelProvider: options.modelProvider,
      prompt: promptResult.prompt,
      userMessage: options.userMessage,
      memoryPath: memory.memoryPath,
    });

    if (usagePct >= options.contextGuardThresholdPct) {
      appendSessionMemorySnapshot({
        memoryPath: memory.memoryPath,
        userMessage: truncate(options.userMessage, 500),
        assistantSummary: `Context guard checkpoint before reply. Estimated usage reached ${usagePct}% (threshold: ${options.contextGuardThresholdPct}%).`,
      });
    }
  }

  const args: string[] = [
    "exec",
    "--cd",
    options.workspace,
    "--skip-git-repo-check",
    "--output-last-message",
    outputPath,
  ];

  if (options.modelProvider === "local") {
    args.push("--oss");
    if (options.localRuntime) {
      args.push("--local-provider", options.localRuntime);
    }
  }

  args.push(instruction);

  const processResult = await runProcess("codex", args);

  let response = "";
  if (fs.existsSync(outputPath)) {
    try {
      response = fs.readFileSync(outputPath, "utf8").trim();
    } catch {
      response = "";
    }
  }

  if (!response) {
    response = processResult.stdout.trim();
  }
  if (!response && processResult.stderr.trim()) {
    response = processResult.stderr.trim();
  }

  const fallbackResponse = "I could not generate a reply for this turn.";
  const finalResponse = response || fallbackResponse;

  appendSessionMemorySnapshot({
    memoryPath: memory.memoryPath,
    userMessage: truncate(options.userMessage, 500),
    assistantSummary: truncate(finalResponse, 900),
  });

  if (!processResult.ok && !options.quiet) {
    const message = processResult.errorMessage || processResult.stderr.trim() || "codex exec failed";
    console.log(`[kaizen] codex exec failed: ${message}`);
  }

  return {
    ok: processResult.ok,
    response: finalResponse,
    errorMessage: processResult.errorMessage,
    exitCode: processResult.exitCode,
    memoryPath: memory.memoryPath,
  };
}
