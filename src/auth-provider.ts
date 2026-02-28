/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { readConfig } from "./config.js";
import { resolveRunner } from "./engine/runner-registry.js";
import type { RunnerStdio } from "./engine/runner.js";

export const SUPPORTED_AUTH_PROVIDERS = ["openai-codex"];

type ProcessResult = {
  ok: boolean;
  code: number;
  errorMessage: string | null;
};

type RunProcessOptions = {
  stdio?: RunnerStdio;
};

function unsupportedProvider(provider: string): ProcessResult {
  return {
    ok: false,
    code: 1,
    errorMessage: `unsupported auth provider: ${provider}`,
  };
}

export async function runAuthLogin(
  provider: string,
  options: RunProcessOptions = {},
): Promise<ProcessResult> {
  if (provider !== "openai-codex") {
    return unsupportedProvider(provider);
  }

  const runner = resolveRunner(readConfig());
  return runner.login({
    stdio: options.stdio ?? "inherit",
  });
}

export async function runAuthStatus(
  provider: string,
  options: RunProcessOptions = {},
): Promise<ProcessResult> {
  if (provider !== "openai-codex") {
    return unsupportedProvider(provider);
  }

  const runner = resolveRunner(readConfig());
  return runner.loginStatus({
    stdio: options.stdio ?? "inherit",
  });
}

