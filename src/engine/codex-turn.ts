/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { normalizeAccessScope, readConfig } from "../config.js";
import { resolveRunner } from "./runner-registry.js";
import type { ModelTurnParams, ModelTurnResult } from "./runner.js";
import { assertPathAllowed } from "../runtime/access-policy.js";

export type CodexTurnOptions = ModelTurnParams;
export type CodexTurnResult = ModelTurnResult;

let globalTurnQueue: Promise<void> = Promise.resolve();

function enqueueTurn<T>(job: () => Promise<T>) {
  const run = globalTurnQueue.then(job, job);
  globalTurnQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function runModelTurn(options: ModelTurnParams): Promise<ModelTurnResult> {
  return enqueueTurn(async () => {
    const config = readConfig();
    assertPathAllowed(
      options.workspace,
      {
        scope: normalizeAccessScope(config.access.scope) as "workspace" | "workspace-plus" | "full",
        allowPaths: config.access.allowPaths,
      },
      config.defaults.workspace,
    );
    const runner = resolveRunner(config);
    return runner.runTurn(options);
  });
}

export async function runCodexTurn(options: CodexTurnOptions): Promise<CodexTurnResult> {
  return runModelTurn(options);
}
