/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { normalizeEngineRunner, readConfig } from "../config.js";
import { codexRunner } from "./adapters/codex-runner.js";
import type { ModelRunner } from "./runner.js";

const runners = new Map<string, ModelRunner>([[codexRunner.id(), codexRunner]]);

export function resolveRunner(configLike?: any): ModelRunner {
  const source = configLike ?? readConfig();
  const runnerId = normalizeEngineRunner(source?.engine?.runner);
  return runners.get(runnerId) ?? codexRunner;
}

