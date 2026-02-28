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
  appendSessionMemorySnapshot,
  ensureSessionMemoryFile,
} from "../../context-guard.js";
import { resolveKaizenHome } from "../../config.js";
import { buildKaizenPrompt } from "../../prompt.js";
import type {
  ModelInteractiveSessionParams,
  ModelRunner,
  ModelTurnParams,
  ModelTurnResult,
  RunnerProcessResult,
  RunnerStdio,
} from "../runner.js";

type SpawnCaptureResult = {
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
  return Math.ceil(text.length / 4);
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
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

function runCommandInherit(command: string, args: string[], stdio: RunnerStdio = "inherit") {
  return new Promise<RunnerProcessResult>((resolve) => {
    const child = spawn(command, args, {
      stdio,
      shell: false,
    });

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

function runCommandCapture(command: string, args: string[], abortSignal?: AbortSignal) {
  return new Promise<SpawnCaptureResult>((resolve) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let aborted = false;

    const abortHandler = () => {
      if (aborted) {
        return;
      }
      aborted = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, 2000).unref();
    };

    if (abortSignal) {
      if (abortSignal.aborted) {
        abortHandler();
      } else {
        abortSignal.addEventListener("abort", abortHandler, { once: true });
      }
    }

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      if (abortSignal) {
        abortSignal.removeEventListener("abort", abortHandler);
      }
      resolve({
        ok: false,
        exitCode: 1,
        stdout,
        stderr,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });

    child.on("close", (code, signal) => {
      if (abortSignal) {
        abortSignal.removeEventListener("abort", abortHandler);
      }
      if (aborted) {
        resolve({
          ok: false,
          exitCode: 1,
          stdout,
          stderr,
          errorMessage: "aborted",
        });
        return;
      }
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

function buildCodexArgsForInteractive(params: ModelInteractiveSessionParams) {
  const args: string[] = [];

  if (params.modelProvider === "local") {
    args.push("--oss");
    if (params.localRuntime) {
      args.push("--local-provider", params.localRuntime);
    }
  }

  args.push("--cd", params.workspace);
  args.push(params.prompt);
  return args;
}

async function runCodexTurn(params: ModelTurnParams): Promise<ModelTurnResult> {
  const memory = ensureSessionMemoryFile({
    workspace: params.workspace,
    abilityProfile: params.abilityProfile,
    thresholdPct: params.contextGuardThresholdPct,
  });

  const promptResult = buildKaizenPrompt({
    workspace: params.workspace,
    abilityProfile: params.abilityProfile,
    contextGuardEnabled: params.contextGuardEnabled,
    contextGuardThresholdPct: params.contextGuardThresholdPct,
    memoryPath: memory.memoryPath,
  });

  const runDir = path.join(resolveKaizenHome(), "run");
  fs.mkdirSync(runDir, { recursive: true });
  const outputPath = path.join(runDir, "codex-last-message.txt");

  const instruction = [
    promptResult.prompt,
    "",
    "Incoming user message:",
    params.userMessage,
    "",
    "Respond as Kaizen with practical implementation guidance and next action.",
  ].join("\n\n");

  if (params.contextGuardEnabled) {
    const usagePct = estimateUsagePct({
      modelProvider: params.modelProvider,
      prompt: promptResult.prompt,
      userMessage: params.userMessage,
      memoryPath: memory.memoryPath,
    });

    if (usagePct >= params.contextGuardThresholdPct) {
      appendSessionMemorySnapshot({
        memoryPath: memory.memoryPath,
        userMessage: truncate(params.userMessage, 500),
        assistantSummary: `Context guard checkpoint before reply. Estimated usage reached ${usagePct}% (threshold: ${params.contextGuardThresholdPct}%).`,
      });
    }
  }

  const args: string[] = [
    "exec",
    "--cd",
    params.workspace,
    "--skip-git-repo-check",
    "--output-last-message",
    outputPath,
  ];

  if (params.modelProvider === "local") {
    args.push("--oss");
    if (params.localRuntime) {
      args.push("--local-provider", params.localRuntime);
    }
  }

  args.push(instruction);

  const processResult = await runCommandCapture("codex", args, params.abortSignal);

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
    userMessage: truncate(params.userMessage, 500),
    assistantSummary: truncate(finalResponse, 900),
  });

  if (!processResult.ok && !params.quiet) {
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

class CodexRunner implements ModelRunner {
  id() {
    return "codex";
  }

  async runInteractiveSession(params: ModelInteractiveSessionParams): Promise<RunnerProcessResult> {
    const args = buildCodexArgsForInteractive(params);
    return runCommandInherit("codex", args, "inherit");
  }

  async runTurn(params: ModelTurnParams): Promise<ModelTurnResult> {
    return runCodexTurn(params);
  }

  async login(params?: { stdio?: RunnerStdio }): Promise<RunnerProcessResult> {
    return runCommandInherit("codex", ["login"], params?.stdio ?? "inherit");
  }

  async loginStatus(params?: { stdio?: RunnerStdio }): Promise<RunnerProcessResult> {
    return runCommandInherit("codex", ["login", "status"], params?.stdio ?? "inherit");
  }
}

export const codexRunner = new CodexRunner();

