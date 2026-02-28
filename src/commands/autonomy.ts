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
  normalizeAutonomyMaxMinutes,
  normalizeAutonomyMaxTurns,
  normalizeAutonomyMode,
  readConfig,
  writeConfig,
} from "../config.js";
import {
  clearFullAccessConsentMarker,
  writeFullAccessConsentMarker,
} from "../runtime/access-policy.js";
import {
  getAutonomyRuntimeState,
  getQueueSummary,
  startAutonomyRun,
  stopAutonomyRun,
} from "../runtime/autonomy-runner.js";

type MaybeBoolean = boolean | string | undefined;

function parseBooleanFlag(rawValue: MaybeBoolean, fallback = false) {
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

async function ensureFullAccessConsent(params: {
  nonInteractive: boolean;
  yes?: boolean;
  acceptFullAccessRisk?: MaybeBoolean;
}) {
  if (params.nonInteractive) {
    const accepted = parseBooleanFlag(params.acceptFullAccessRisk, false);
    if (!accepted || params.yes !== true) {
      throw new Error(
        "Full access requires explicit acceptance in non-interactive mode: --accept-full-access-risk true --yes",
      );
    }
    return true;
  }

  const phrase = await text({
    message: 'Type "enable full access" to confirm full computer access',
    placeholder: "enable full access",
  });

  if (isCancel(phrase)) {
    return false;
  }

  if (String(phrase).trim().toLowerCase() !== "enable full access") {
    console.log("");
    console.log("Full access not enabled (confirmation phrase mismatch).");
    return false;
  }

  return true;
}

function updateAutonomyConfig(nextPartial: Record<string, unknown>) {
  const config = readConfig();
  const next = {
    ...config,
    ...nextPartial,
  };
  writeConfig(next);
  return next;
}

export async function autonomyStatusCommand() {
  const config = readConfig();
  const runtime = getAutonomyRuntimeState();
  const queueSummary = getQueueSummary(config.defaults.workspace);

  console.log("");
  console.log("Kaizen autonomy status");
  console.log(`Enabled: ${config.autonomy.enabled ? "yes" : "no"}`);
  console.log(`Mode: ${config.autonomy.mode}`);
  console.log(
    `Free-run budget: ${config.autonomy.freeRun.maxTurns} turns / ${config.autonomy.freeRun.maxMinutes} minutes`,
  );
  console.log(`Access scope: ${config.access.scope}`);
  console.log(`Allow paths: ${config.access.allowPaths.join(", ") || "(none)"}`);
  console.log(`Runtime active: ${runtime.running ? "yes" : "no"}`);
  console.log(`Runtime mode: ${runtime.mode ?? "(idle)"}`);
  if (runtime.workspace) {
    console.log(`Runtime workspace: ${runtime.workspace}`);
  }
  if (runtime.startedAt) {
    console.log(`Runtime started: ${runtime.startedAt}`);
  }
  console.log(
    `Queue summary: ${queueSummary.pending} pending, ${queueSummary.running} running, ${queueSummary.completed} completed, ${queueSummary.failed} failed`,
  );
  return {
    config: config.autonomy,
    access: config.access,
    runtime,
    queueSummary,
  };
}

export async function autonomyConfigureCommand() {
  const config = readConfig();

  const enabledPick = await select({
    message: "Autonomy state",
    initialValue: config.autonomy.enabled ? "on" : "off",
    options: [
      { value: "off", label: "Off (default)" },
      { value: "on", label: "On" },
    ],
  });
  if (isCancel(enabledPick)) {
    return false;
  }
  const enabled = enabledPick === "on";

  const modePick = await select({
    message: "Autonomy mode",
    initialValue: config.autonomy.mode,
    options: [
      { value: "queued", label: "Queued (run explicit queued tasks only)" },
      { value: "free-run", label: "Free-run (manual start with budget)" },
    ],
  });
  if (isCancel(modePick)) {
    return false;
  }
  const mode = normalizeAutonomyMode(modePick);

  const accessScopePick = await select({
    message: "Access boundary scope",
    initialValue: config.access.scope,
    options: [
      { value: "workspace", label: "Workspace only" },
      { value: "workspace-plus", label: "Workspace + allowlist paths" },
      { value: "full", label: "Full computer access (high risk)" },
    ],
  });
  if (isCancel(accessScopePick)) {
    return false;
  }
  const accessScope = normalizeAccessScope(accessScopePick);

  let allowPaths = [...config.access.allowPaths];
  if (accessScope === "workspace-plus") {
    const allowInput = await text({
      message: "Allowlist paths (comma-separated)",
      defaultValue: allowPaths.join(","),
      placeholder: "/Users/you/Documents,/Users/you/Desktop",
    });
    if (isCancel(allowInput)) {
      return false;
    }
    allowPaths = normalizeAccessAllowPaths(String(allowInput ?? ""));
  } else if (accessScope !== "workspace-plus") {
    allowPaths = [];
  }

  let fullAccessAcceptedAt = config.access.fullAccessLastEnabledAt;
  if (accessScope === "full") {
    const consent = await ensureFullAccessConsent({
      nonInteractive: false,
    });
    if (!consent) {
      return false;
    }
    fullAccessAcceptedAt = new Date().toISOString();
    writeFullAccessConsentMarker();
  } else {
    clearFullAccessConsentMarker();
  }

  const next = updateAutonomyConfig({
    autonomy: {
      ...config.autonomy,
      enabled,
      mode,
    },
    access: {
      ...config.access,
      scope: accessScope,
      allowPaths,
      fullAccessLastEnabledAt: fullAccessAcceptedAt,
    },
  });

  console.log("");
  console.log("Autonomy configuration saved.");
  console.log(`Enabled: ${next.autonomy.enabled ? "yes" : "no"}`);
  console.log(`Mode: ${next.autonomy.mode}`);
  console.log(`Access scope: ${next.access.scope}`);
  return true;
}

export async function autonomyEnableCommand(options: {
  yes?: boolean;
  nonInteractive?: boolean;
  acceptFullAccessRisk?: MaybeBoolean;
} = {}) {
  const config = readConfig();
  let fullAccessLastEnabledAt = config.access.fullAccessLastEnabledAt;

  if (config.access.scope === "full") {
    const consent = await ensureFullAccessConsent({
      nonInteractive: Boolean(options.nonInteractive),
      yes: Boolean(options.yes),
      acceptFullAccessRisk: options.acceptFullAccessRisk,
    });
    if (!consent) {
      return false;
    }
    fullAccessLastEnabledAt = new Date().toISOString();
    writeFullAccessConsentMarker();
  }

  const next = updateAutonomyConfig({
    autonomy: {
      ...config.autonomy,
      enabled: true,
    },
    access: {
      ...config.access,
      fullAccessLastEnabledAt,
    },
  });

  console.log("");
  console.log("Autonomy enabled.");
  console.log(`Mode: ${next.autonomy.mode}`);
  return true;
}

export async function autonomyDisableCommand() {
  const config = readConfig();
  await stopAutonomyRun();
  clearFullAccessConsentMarker();

  updateAutonomyConfig({
    autonomy: {
      ...config.autonomy,
      enabled: false,
    },
  });

  console.log("");
  console.log("Autonomy disabled.");
  return true;
}

export async function autonomyStartCommand(options: {
  mode?: string;
  maxTurns?: string | number;
  maxMinutes?: string | number;
  workspace?: string;
}) {
  const config = readConfig();
  if (!config.autonomy.enabled) {
    throw new Error("Autonomy is disabled. Run `kaizen autonomy enable` first.");
  }

  const mode = normalizeAutonomyMode(options.mode ?? config.autonomy.mode) as "queued" | "free-run";
  const maxTurns = normalizeAutonomyMaxTurns(options.maxTurns ?? config.autonomy.freeRun.maxTurns);
  const maxMinutes = normalizeAutonomyMaxMinutes(
    options.maxMinutes ?? config.autonomy.freeRun.maxMinutes,
  );

  const started = startAutonomyRun({
    mode,
    workspace: options.workspace ?? config.defaults.workspace,
    maxTurns,
    maxMinutes,
    log: (line) => console.log(`[autonomy] ${line}`),
  });

  if (!started.started) {
    console.log("");
    console.log(`Autonomy start skipped: ${started.reason}`);
    return started;
  }

  const next = updateAutonomyConfig({
    autonomy: {
      ...config.autonomy,
      mode,
      freeRun: {
        maxTurns,
        maxMinutes,
      },
    },
  });

  console.log("");
  console.log("Autonomy run started.");
  console.log(`Mode: ${mode}`);
  console.log(`Budget: ${maxTurns} turns / ${maxMinutes} minutes`);
  console.log(`Workspace: ${started.state.workspace}`);
  console.log(`Configured mode saved: ${next.autonomy.mode}`);
  return started;
}

export async function autonomyStopCommand() {
  const result = await stopAutonomyRun();
  console.log("");
  if (!result.stopped) {
    console.log(`Autonomy stop skipped: ${result.reason}`);
    return result;
  }
  console.log("Autonomy run stopped.");
  return result;
}
