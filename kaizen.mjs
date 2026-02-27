#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import module from "node:module";

if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // ignore cache bootstrap errors
  }
}

const isModuleNotFoundError = (error) =>
  error &&
  typeof error === "object" &&
  "code" in error &&
  error.code === "ERR_MODULE_NOT_FOUND";

const tryImport = async (specifier) => {
  try {
    await import(specifier);
    return true;
  } catch (error) {
    if (isModuleNotFoundError(error)) {
      return false;
    }
    throw error;
  }
};

if (!(await tryImport("./dist/entry.js"))) {
  throw new Error("kaizen: missing dist/entry.js. Run `pnpm build`.");
}
