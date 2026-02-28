/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { startCommand } from "./start.js";

type AutoStartOptions = {
  autoStart?: unknown;
};

function shellQuote(value: string) {
  return value.replace(/"/g, '\\"');
}

export function normalizeAutoStartOption(rawValue: unknown, fallback = true) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
      return true;
    }
    if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
      return false;
    }
  }

  return fallback;
}

export async function launchKaizenAfterSetup(nextConfig: any, options: AutoStartOptions = {}) {
  const shouldAutoStart = normalizeAutoStartOption(options.autoStart, true);
  if (!shouldAutoStart) {
    return {
      autoStart: false,
      launched: false,
      ok: true,
    };
  }

  const defaults = nextConfig?.defaults ?? {};
  const interaction =
    typeof defaults.interactionMode === "string" && defaults.interactionMode.trim().length > 0
      ? defaults.interactionMode.trim()
      : "terminal";
  const workspace =
    typeof defaults.workspace === "string" && defaults.workspace.trim().length > 0
      ? defaults.workspace.trim()
      : "";

  const manualCommand = workspace
    ? `kaizen start --interaction ${interaction} --workspace "${shellQuote(workspace)}"`
    : `kaizen start --interaction ${interaction}`;

  console.log("");
  console.log(`Auto-starting Kaizen (${interaction})...`);

  try {
    const ok = await startCommand({
      interaction,
      workspace,
      noOpen: false,
    });

    if (!ok) {
      console.log("");
      console.log("Kaizen auto-start could not open an interactive session in this environment.");
      console.log(`Run manually: ${manualCommand}`);
    }

    return {
      autoStart: true,
      launched: true,
      ok: Boolean(ok),
      manualCommand,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("");
    console.log(`Kaizen auto-start failed: ${message}`);
    console.log(`Run manually: ${manualCommand}`);

    return {
      autoStart: true,
      launched: false,
      ok: false,
      manualCommand,
      error: message,
    };
  }
}
