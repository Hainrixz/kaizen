/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { spawn } from "node:child_process";

export const SUPPORTED_AUTH_PROVIDERS = ["openai-codex"];

type ProcessResult = {
  ok: boolean;
  code: number;
  errorMessage: string | null;
};

function runProcess(command: string, args: string[]): Promise<ProcessResult> {
  return new Promise<ProcessResult>((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
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

export async function runAuthLogin(provider: string): Promise<ProcessResult> {
  if (provider !== "openai-codex") {
    return {
      ok: false,
      code: 1,
      errorMessage: `unsupported auth provider: ${provider}`,
    };
  }

  return runProcess("codex", ["login"]);
}

export async function runAuthStatus(provider: string): Promise<ProcessResult> {
  if (provider !== "openai-codex") {
    return {
      ok: false,
      code: 1,
      errorMessage: `unsupported auth provider: ${provider}`,
    };
  }

  return runProcess("codex", ["login", "status"]);
}
