/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { chatCommand } from "./chat.mjs";
import { uiCommand } from "./ui.mjs";
import { normalizeInteractionMode, readConfig } from "../config.mjs";

export async function startCommand(options = {}) {
  const config = readConfig();
  const interactionMode = normalizeInteractionMode(
    options.interaction ?? config.defaults.interactionMode,
  );

  if (interactionMode === "localhost") {
    return uiCommand({
      port: options.port,
      dryRun: options.dryRun,
    });
  }

  return chatCommand({
    workspace: options.workspace,
    dryRun: options.dryRun,
  });
}
