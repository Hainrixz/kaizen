/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

export type RunnerStdio = "inherit" | "pipe";

export type RunnerProcessResult = {
  ok: boolean;
  code: number;
  errorMessage: string | null;
  stdout?: string;
  stderr?: string;
};

export type ModelInteractiveSessionParams = {
  workspace: string;
  prompt: string;
  modelProvider: string;
  localRuntime: string;
};

export type ModelTurnParams = {
  workspace: string;
  abilityProfile: string;
  modelProvider: string;
  localRuntime: string;
  contextGuardEnabled: boolean;
  contextGuardThresholdPct: number;
  userMessage: string;
  quiet?: boolean;
  abortSignal?: AbortSignal;
};

export type ModelTurnResult = {
  ok: boolean;
  response: string;
  errorMessage: string | null;
  exitCode: number;
  memoryPath: string;
};

export interface ModelRunner {
  id(): string;
  runInteractiveSession(params: ModelInteractiveSessionParams): Promise<RunnerProcessResult>;
  runTurn(params: ModelTurnParams): Promise<ModelTurnResult>;
  login(params?: { stdio?: RunnerStdio }): Promise<RunnerProcessResult>;
  loginStatus(params?: { stdio?: RunnerStdio }): Promise<RunnerProcessResult>;
}

