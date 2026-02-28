import {
  autonomyDisableCommand,
  autonomyEnableCommand,
  autonomyStartCommand,
  autonomyStatusCommand,
  autonomyStopCommand,
} from "../../commands/autonomy.js";
import { normalizeAccessAllowPaths, normalizeAccessScope, readConfig, writeConfig } from "../../config.js";
import {
  clearFullAccessConsentMarker,
  writeFullAccessConsentMarker,
} from "../../runtime/access-policy.js";

function asObject(params: unknown) {
  if (!params || typeof params !== "object") {
    return {} as Record<string, unknown>;
  }
  return params as Record<string, unknown>;
}

export async function autonomyStatus() {
  return autonomyStatusCommand();
}

export async function autonomyUpdate(params: unknown) {
  const payload = asObject(params);
  const action = String(payload.action ?? "").trim().toLowerCase();

  if (action === "enable") {
    await autonomyEnableCommand({
      yes: true,
      nonInteractive: true,
      acceptFullAccessRisk: true,
    });
    return autonomyStatusCommand();
  }

  if (action === "disable") {
    await autonomyDisableCommand();
    return autonomyStatusCommand();
  }

  if (action === "start") {
    await autonomyStartCommand({
      mode: typeof payload.mode === "string" ? payload.mode : undefined,
      maxTurns:
        typeof payload.maxTurns === "number" || typeof payload.maxTurns === "string"
          ? (payload.maxTurns as number | string)
          : undefined,
      maxMinutes:
        typeof payload.maxMinutes === "number" || typeof payload.maxMinutes === "string"
          ? (payload.maxMinutes as number | string)
          : undefined,
      workspace: typeof payload.workspace === "string" ? payload.workspace : undefined,
    });
    return autonomyStatusCommand();
  }

  if (action === "stop") {
    await autonomyStopCommand();
    return autonomyStatusCommand();
  }

  if (action === "configure") {
    const config = readConfig();
    const scope = payload.scope ? normalizeAccessScope(payload.scope) : config.access.scope;
    const allowPaths = normalizeAccessAllowPaths(payload.allowPaths ?? config.access.allowPaths);
    const enabled =
      typeof payload.enabled === "boolean" ? payload.enabled : Boolean(config.autonomy.enabled);
    const mode =
      payload.mode === "free-run" || payload.mode === "queued"
        ? payload.mode
        : config.autonomy.mode;
    const maxTurnsRaw = payload.maxTurns ?? config.autonomy.freeRun.maxTurns;
    const maxMinutesRaw = payload.maxMinutes ?? config.autonomy.freeRun.maxMinutes;
    const maxTurns = Number.isFinite(Number(maxTurnsRaw))
      ? Math.max(1, Math.round(Number(maxTurnsRaw)))
      : config.autonomy.freeRun.maxTurns;
    const maxMinutes = Number.isFinite(Number(maxMinutesRaw))
      ? Math.max(1, Math.round(Number(maxMinutesRaw)))
      : config.autonomy.freeRun.maxMinutes;

    const next = {
      ...config,
      autonomy: {
        ...config.autonomy,
        enabled,
        mode,
        freeRun: {
          maxTurns,
          maxMinutes,
        },
      },
      access: {
        ...config.access,
        scope,
        allowPaths: scope === "workspace-plus" ? allowPaths : [],
        fullAccessLastEnabledAt:
          scope === "full" ? config.access.fullAccessLastEnabledAt ?? new Date().toISOString() : null,
      },
    };
    if (scope === "full") {
      writeFullAccessConsentMarker();
    } else {
      clearFullAccessConsentMarker();
    }
    writeConfig(next);
    return autonomyStatusCommand();
  }

  throw new Error(`Unsupported autonomy action: ${action || "(empty)"}`);
}
