/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { isCancel, select, text } from "@clack/prompts";
import {
  normalizeAccessAllowPaths,
  normalizeAccessScope,
  normalizeInteractionMode,
  readConfig,
  resolveConfigPath,
  writeConfig,
} from "../config.js";
import {
  clearFullAccessConsentMarker,
  writeFullAccessConsentMarker,
} from "../runtime/access-policy.js";
import { startCommand } from "./start.js";

type ConfigurationCommandOptions = {
  interaction?: string;
  autonomy?: string;
  access?: string;
  allowPath?: string[] | string;
  acceptFullAccessRisk?: string | boolean;
  yes?: boolean;
  show?: boolean;
  launch?: boolean;
};

function parseAutonomyToggle(rawValue: unknown, fallback: boolean) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    if (["on", "true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["off", "false", "0", "no"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function parseBoolean(rawValue: unknown, fallback: boolean) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    if (["on", "true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["off", "false", "0", "no"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function normalizeAllowPathInput(rawValue: string[] | string | undefined, fallback: string[]) {
  if (Array.isArray(rawValue)) {
    return normalizeAccessAllowPaths(rawValue);
  }
  if (typeof rawValue === "string") {
    return normalizeAccessAllowPaths(rawValue);
  }
  return [...fallback];
}

function printCurrentSettings() {
  const config = readConfig();
  console.log("");
  console.log("Kaizen configuration");
  console.log(`Config: ${resolveConfigPath()}`);
  console.log(`Default interaction: ${normalizeInteractionMode(config.defaults.interactionMode)}`);
  console.log(`Workspace: ${config.defaults.workspace}`);
  console.log(`Run mode: ${config.defaults.runMode}`);
  console.log(`Autonomy: ${config.autonomy.enabled ? "on" : "off"} (${config.autonomy.mode})`);
  console.log(`Access: ${config.access.scope}`);
  console.log(`Allow paths: ${config.access.allowPaths.join(", ") || "(none)"}`);
}

async function promptInteractionMode(defaultMode: string) {
  const selection = await select({
    message: "Choose default interaction mode for `kaizen`",
    initialValue: defaultMode,
    options: [
      {
        value: "terminal",
        label: "Terminal chat",
      },
      {
        value: "localhost",
        label: "Localhost UI (app mode)",
      },
    ],
  });

  if (isCancel(selection)) {
    return null;
  }

  return normalizeInteractionMode(selection);
}

async function promptAutonomyEnabled(defaultEnabled: boolean) {
  const selection = await select({
    message: "Autonomy default",
    initialValue: defaultEnabled ? "on" : "off",
    options: [
      { value: "off", label: "Off (default safe mode)" },
      { value: "on", label: "On (heartbeat may process queued tasks)" },
    ],
  });
  if (isCancel(selection)) {
    return null;
  }
  return selection === "on";
}

async function promptAccessScope(defaultScope: string) {
  const selection = await select({
    message: "Access boundary scope",
    initialValue: defaultScope,
    options: [
      { value: "workspace", label: "Workspace only" },
      { value: "workspace-plus", label: "Workspace + allowlist paths" },
      { value: "full", label: "Full computer access (high risk)" },
    ],
  });
  if (isCancel(selection)) {
    return null;
  }
  return normalizeAccessScope(selection);
}

async function ensureFullAccessConsent(options: ConfigurationCommandOptions) {
  const nonInteractiveAccepted =
    parseBoolean(options.acceptFullAccessRisk, false) && Boolean(options.yes);
  if (nonInteractiveAccepted) {
    return true;
  }

  const typed = await text({
    message: 'Type "enable full access" to confirm',
    placeholder: "enable full access",
  });
  if (isCancel(typed)) {
    return false;
  }
  return String(typed ?? "").trim().toLowerCase() === "enable full access";
}

export async function configurationCommand(options: ConfigurationCommandOptions = {}) {
  if (options.show) {
    printCurrentSettings();
    return true;
  }

  const currentConfig = readConfig();
  const currentInteraction = normalizeInteractionMode(currentConfig.defaults.interactionMode);
  const currentAutonomy = Boolean(currentConfig.autonomy?.enabled);
  const currentAccessScope = normalizeAccessScope(currentConfig.access?.scope);
  const currentAllowPaths = [...(currentConfig.access?.allowPaths ?? [])];

  const hasDirectOptions =
    Boolean(options.interaction) ||
    options.autonomy !== undefined ||
    options.access !== undefined ||
    (Array.isArray(options.allowPath)
      ? options.allowPath.length > 0
      : options.allowPath !== undefined);

  let nextInteraction = currentInteraction;
  let nextAutonomyEnabled = currentAutonomy;
  let nextAccessScope = currentAccessScope;
  let nextAllowPaths = [...currentAllowPaths];

  if (hasDirectOptions) {
    if (typeof options.interaction === "string" && options.interaction.trim().length > 0) {
      nextInteraction = normalizeInteractionMode(options.interaction);
    }
    if (options.autonomy !== undefined) {
      nextAutonomyEnabled = parseAutonomyToggle(options.autonomy, currentAutonomy);
    }
    if (typeof options.access === "string" && options.access.trim().length > 0) {
      nextAccessScope = normalizeAccessScope(options.access);
    }
    nextAllowPaths = normalizeAllowPathInput(options.allowPath, currentAllowPaths);
  } else {
    const pickedInteraction = await promptInteractionMode(currentInteraction);
    if (!pickedInteraction) {
      console.log("");
      console.log("Config update cancelled.");
      return false;
    }
    nextInteraction = pickedInteraction;

    const pickedAutonomy = await promptAutonomyEnabled(currentAutonomy);
    if (pickedAutonomy === null) {
      console.log("");
      console.log("Config update cancelled.");
      return false;
    }
    nextAutonomyEnabled = pickedAutonomy;

    const pickedAccessScope = await promptAccessScope(currentAccessScope);
    if (!pickedAccessScope) {
      console.log("");
      console.log("Config update cancelled.");
      return false;
    }
    nextAccessScope = pickedAccessScope;

    if (nextAccessScope === "workspace-plus") {
      const allowInput = await text({
        message: "Allowlist paths (comma-separated)",
        defaultValue: currentAllowPaths.join(","),
        placeholder: "/Users/you/Documents,/Users/you/Desktop",
      });
      if (isCancel(allowInput)) {
        console.log("");
        console.log("Config update cancelled.");
        return false;
      }
      nextAllowPaths = normalizeAccessAllowPaths(String(allowInput ?? ""));
    } else {
      nextAllowPaths = [];
    }
  }

  let fullAccessLastEnabledAt = currentConfig.access?.fullAccessLastEnabledAt ?? null;
  if (nextAccessScope === "full") {
    const consentAccepted = await ensureFullAccessConsent(options);
    if (!consentAccepted) {
      console.log("");
      console.log("Full access not enabled. Confirmation phrase was not accepted.");
      return false;
    }
    fullAccessLastEnabledAt = new Date().toISOString();
    writeFullAccessConsentMarker();
  } else {
    clearFullAccessConsentMarker();
  }

  const nextConfig = {
    ...currentConfig,
    defaults: {
      ...currentConfig.defaults,
      interactionMode: nextInteraction,
    },
    autonomy: {
      ...currentConfig.autonomy,
      enabled: nextAutonomyEnabled,
    },
    access: {
      ...currentConfig.access,
      scope: nextAccessScope,
      allowPaths: nextAccessScope === "workspace-plus" ? nextAllowPaths : [],
      fullAccessLastEnabledAt,
    },
  };

  const configPath = writeConfig(nextConfig);

  console.log("");
  console.log(`Saved interaction mode: ${nextInteraction}`);
  console.log(`Saved autonomy: ${nextAutonomyEnabled ? "on" : "off"}`);
  console.log(`Saved access scope: ${nextAccessScope}`);
  console.log(`Config updated: ${configPath}`);
  console.log("");
  console.log("Use `kaizen` to launch with this new default.");

  if (options.launch) {
    await startCommand({
      interaction: nextInteraction,
    });
  }

  return true;
}
