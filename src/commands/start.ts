/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { chatCommand } from "./chat.js";
import { uiCommand } from "./ui.js";
import { normalizeInteractionMode, readConfig } from "../config.js";

export async function startCommand(options: any = {}) {
  const config = readConfig();
  const interactionMode = normalizeInteractionMode(
    options.interaction ?? config.defaults.interactionMode,
  );

  if (interactionMode === "localhost") {
    return uiCommand({
      host: options.host,
      port: options.port,
      noOpen: Boolean(options.noOpen),
      session: options.session,
      dryRun: options.dryRun,
    });
  }

  return chatCommand({
    workspace: options.workspace,
    dryRun: options.dryRun,
  });
}
