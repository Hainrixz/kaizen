/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const VALID_FOCUS = new Set(["landing-page", "web-app", "mobile-web-app", "tool"]);
const VALID_MODEL_PROVIDERS = new Set(["openai-codex", "local"]);
const VALID_AUTH_PROVIDERS = new Set(["openai-codex"]);
const VALID_ABILITY_PROFILES = new Set(["web-design"]);
const VALID_INTERACTION_MODES = new Set(["terminal", "localhost"]);
const VALID_LOCAL_RUNTIMES = new Set(["ollama", "lmstudio"]);
const VALID_RUN_MODES = new Set(["manual", "always-on"]);
const VALID_SERVICE_STATES = new Set(["running", "stopped", "unknown"]);
const VALID_ENGINE_RUNNERS = new Set(["codex"]);
const VALID_AUTONOMY_MODES = new Set(["queued", "free-run"]);
const VALID_ACCESS_SCOPES = new Set(["workspace", "workspace-plus", "full"]);

const DEFAULT_CONTEXT_GUARD_THRESHOLD_PCT = 65;
const DEFAULT_TELEGRAM_POLL_INTERVAL_MS = 1500;
const DEFAULT_TELEGRAM_LONG_POLL_TIMEOUT_SEC = 25;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 1500;
const DEFAULT_AUTONOMY_MAX_TURNS = 5;
const DEFAULT_AUTONOMY_MAX_MINUTES = 20;

const SHELL_OPERATOR_PATTERN = /(?:\r|\n|&&|\|\||;|\||`|\$\(|\$\{)/;
const SHELL_COMMAND_PREFIX_PATTERN =
  /^\s*(?:cd|bash|sh|zsh|fish|node|npm|pnpm|yarn|npx|corepack|curl|git)\b/i;

function normalizeBoolean(rawValue: unknown, fallback: boolean) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }
  if (typeof rawValue === "string" && rawValue.trim().length > 0) {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no") {
      return false;
    }
    if (normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes") {
      return true;
    }
  }
  return fallback;
}

function normalizeNullableIsoString(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoundedInteger(
  rawValue: unknown,
  fallback: number,
  bounds: { min: number; max: number },
) {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const rounded = Math.round(rawValue);
    return Math.max(bounds.min, Math.min(bounds.max, rounded));
  }
  if (typeof rawValue === "string" && rawValue.trim().length > 0) {
    const parsed = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isNaN(parsed)) {
      return normalizeBoundedInteger(parsed, fallback, bounds);
    }
  }
  return fallback;
}

export function getDefaultConfig() {
  return {
    version: 4,
    defaults: {
      profile: "default",
      workspace: path.join(os.homedir(), "kaizen-workspace"),
      focus: "web-app",
      mission: "web-design",
      abilityProfile: "web-design",
      modelProvider: "openai-codex",
      localRuntime: "ollama",
      interactionMode: "terminal",
      authProvider: "openai-codex",
      runMode: "manual",
      contextGuardEnabled: true,
      contextGuardThresholdPct: DEFAULT_CONTEXT_GUARD_THRESHOLD_PCT,
      marketplaceSkillsEnabled: true,
    },
    auth: {
      provider: "openai-codex",
      lastLoginAt: null,
    },
    channels: {
      telegram: {
        enabled: false,
        botToken: null,
        allowFrom: [],
        pollIntervalMs: DEFAULT_TELEGRAM_POLL_INTERVAL_MS,
        longPollTimeoutSec: DEFAULT_TELEGRAM_LONG_POLL_TIMEOUT_SEC,
      },
    },
    service: {
      installed: false,
      runtime: "node",
      riskAcceptedAt: null,
      lastKnownStatus: "unknown",
    },
    engine: {
      runner: "codex",
    },
    heartbeat: {
      enabled: true,
      intervalMs: DEFAULT_HEARTBEAT_INTERVAL_MS,
      lastTickAt: null,
    },
    autonomy: {
      enabled: false,
      mode: "queued",
      freeRun: {
        maxTurns: DEFAULT_AUTONOMY_MAX_TURNS,
        maxMinutes: DEFAULT_AUTONOMY_MAX_MINUTES,
      },
    },
    access: {
      scope: "workspace",
      allowPaths: [],
      fullAccessLastEnabledAt: null,
    },
    queue: {
      defaultWorkspaceHash: null,
      lastRunAt: null,
    },
    missions: {},
  };
}

function cloneConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config));
}

export function resolveKaizenHome() {
  const custom = process.env.KAIZEN_HOME?.trim();
  if (custom) {
    return path.resolve(custom);
  }
  return path.join(os.homedir(), ".kaizen");
}

export function resolveConfigPath() {
  return path.join(resolveKaizenHome(), "kaizen.json");
}

export function normalizeFocus(rawFocus: unknown) {
  if (typeof rawFocus !== "string" || rawFocus.trim().length === 0) {
    return "web-app";
  }
  const normalized = rawFocus.trim().toLowerCase();
  return VALID_FOCUS.has(normalized) ? normalized : "web-app";
}

export function normalizeAbilityProfile(rawProfile: unknown) {
  if (typeof rawProfile !== "string" || rawProfile.trim().length === 0) {
    return "web-design";
  }
  const normalized = rawProfile.trim().toLowerCase();
  return VALID_ABILITY_PROFILES.has(normalized) ? normalized : "web-design";
}

export function normalizeMission(rawMission: unknown) {
  return normalizeAbilityProfile(rawMission);
}

export function normalizeModelProvider(rawProvider: unknown) {
  if (typeof rawProvider !== "string" || rawProvider.trim().length === 0) {
    return "openai-codex";
  }
  const normalized = rawProvider.trim().toLowerCase();
  return VALID_MODEL_PROVIDERS.has(normalized) ? normalized : "openai-codex";
}

export function normalizeAuthProvider(rawProvider: unknown) {
  if (typeof rawProvider !== "string" || rawProvider.trim().length === 0) {
    return "openai-codex";
  }
  const normalized = rawProvider.trim().toLowerCase();
  return VALID_AUTH_PROVIDERS.has(normalized) ? normalized : "openai-codex";
}

export function normalizeInteractionMode(rawMode: unknown) {
  if (typeof rawMode !== "string" || rawMode.trim().length === 0) {
    return "terminal";
  }
  const normalized = rawMode.trim().toLowerCase();
  return VALID_INTERACTION_MODES.has(normalized) ? normalized : "terminal";
}

export function normalizeRunMode(rawMode: unknown) {
  if (typeof rawMode !== "string" || rawMode.trim().length === 0) {
    return "manual";
  }
  const normalized = rawMode.trim().toLowerCase();
  return VALID_RUN_MODES.has(normalized) ? normalized : "manual";
}

export function normalizeLocalRuntime(rawRuntime: unknown) {
  if (typeof rawRuntime !== "string" || rawRuntime.trim().length === 0) {
    return "ollama";
  }
  const normalized = rawRuntime.trim().toLowerCase();
  return VALID_LOCAL_RUNTIMES.has(normalized) ? normalized : "ollama";
}

export function normalizeContextGuardEnabled(rawEnabled: unknown) {
  return normalizeBoolean(rawEnabled, true);
}

export function normalizeTelegramEnabled(rawEnabled: unknown) {
  return normalizeBoolean(rawEnabled, false);
}

export function normalizeContextGuardThresholdPct(rawThreshold: unknown) {
  return normalizeBoundedInteger(rawThreshold, DEFAULT_CONTEXT_GUARD_THRESHOLD_PCT, {
    min: 40,
    max: 90,
  });
}

export function normalizeMarketplaceSkillsEnabled(rawEnabled: unknown) {
  return normalizeBoolean(rawEnabled, true);
}

export function normalizeTelegramBotToken(rawToken: unknown) {
  if (typeof rawToken !== "string") {
    return null;
  }
  const token = rawToken.trim();
  return token.length > 0 ? token : null;
}

function normalizeTelegramAllowFromEntry(rawEntry: unknown) {
  if (typeof rawEntry === "number" && Number.isFinite(rawEntry)) {
    return String(Math.trunc(rawEntry));
  }
  if (typeof rawEntry === "string") {
    const trimmed = rawEntry.trim();
    if (/^-?\d+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

export function normalizeTelegramAllowFrom(rawAllowFrom: unknown): string[] {
  const entries: unknown[] =
    typeof rawAllowFrom === "string"
      ? rawAllowFrom
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : Array.isArray(rawAllowFrom)
        ? rawAllowFrom
        : [];

  const unique = new Set<string>();
  for (const entry of entries) {
    const normalized = normalizeTelegramAllowFromEntry(entry);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return [...unique];
}

export function normalizeTelegramPollIntervalMs(rawValue: unknown) {
  return normalizeBoundedInteger(rawValue, DEFAULT_TELEGRAM_POLL_INTERVAL_MS, {
    min: 300,
    max: 30_000,
  });
}

export function normalizeTelegramLongPollTimeoutSec(rawValue: unknown) {
  return normalizeBoundedInteger(rawValue, DEFAULT_TELEGRAM_LONG_POLL_TIMEOUT_SEC, {
    min: 5,
    max: 55,
  });
}

export function normalizeServiceInstalled(rawValue: unknown) {
  return Boolean(rawValue);
}

export function normalizeServiceLastKnownStatus(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return "unknown";
  }
  const normalized = rawValue.trim().toLowerCase();
  if (!VALID_SERVICE_STATES.has(normalized)) {
    return "unknown";
  }
  return normalized;
}

export function normalizeServiceRiskAcceptedAt(rawValue: unknown) {
  return normalizeNullableIsoString(rawValue);
}

export function normalizeEngineRunner(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return "codex";
  }
  const normalized = rawValue.trim().toLowerCase();
  if (!VALID_ENGINE_RUNNERS.has(normalized)) {
    return "codex";
  }
  return normalized;
}

export function normalizeHeartbeatEnabled(rawValue: unknown) {
  return normalizeBoolean(rawValue, true);
}

export function normalizeHeartbeatIntervalMs(rawValue: unknown) {
  return normalizeBoundedInteger(rawValue, DEFAULT_HEARTBEAT_INTERVAL_MS, {
    min: 500,
    max: 60_000,
  });
}

export function normalizeHeartbeatLastTickAt(rawValue: unknown) {
  return normalizeNullableIsoString(rawValue);
}

export function normalizeAutonomyEnabled(rawValue: unknown) {
  return normalizeBoolean(rawValue, false);
}

export function normalizeAutonomyMode(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return "queued";
  }
  const normalized = rawValue.trim().toLowerCase();
  if (!VALID_AUTONOMY_MODES.has(normalized)) {
    return "queued";
  }
  return normalized;
}

export function normalizeAutonomyMaxTurns(rawValue: unknown) {
  return normalizeBoundedInteger(rawValue, DEFAULT_AUTONOMY_MAX_TURNS, {
    min: 1,
    max: 200,
  });
}

export function normalizeAutonomyMaxMinutes(rawValue: unknown) {
  return normalizeBoundedInteger(rawValue, DEFAULT_AUTONOMY_MAX_MINUTES, {
    min: 1,
    max: 24 * 60,
  });
}

export function normalizeAccessScope(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return "workspace";
  }
  const normalized = rawValue.trim().toLowerCase();
  if (!VALID_ACCESS_SCOPES.has(normalized)) {
    return "workspace";
  }
  return normalized;
}

function resolveRawPath(rawPath: string) {
  const trimmed = rawPath.trim();
  if (trimmed === "~") {
    return os.homedir();
  }
  if (trimmed.startsWith("~/")) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return path.resolve(trimmed);
}

export function isUnsafeWorkspaceInput(rawWorkspace: unknown) {
  if (typeof rawWorkspace !== "string") {
    return false;
  }
  const trimmed = rawWorkspace.trim();
  if (!trimmed) {
    return false;
  }
  return SHELL_OPERATOR_PATTERN.test(trimmed) || SHELL_COMMAND_PREFIX_PATTERN.test(trimmed);
}

function normalizeAllowPathEntry(rawEntry: unknown): string | null {
  if (typeof rawEntry !== "string") {
    return null;
  }
  const trimmed = rawEntry.trim();
  if (!trimmed || isUnsafeWorkspaceInput(trimmed)) {
    return null;
  }
  const resolved = resolveRawPath(trimmed);
  if (isUnsafeWorkspaceInput(resolved)) {
    return null;
  }
  return resolved;
}

export function normalizeAccessAllowPaths(rawValue: unknown): string[] {
  const entries =
    typeof rawValue === "string"
      ? rawValue
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : Array.isArray(rawValue)
        ? rawValue
        : [];

  const unique = new Set<string>();
  for (const entry of entries) {
    const normalized = normalizeAllowPathEntry(entry);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return [...unique];
}

export function normalizeFullAccessLastEnabledAt(rawValue: unknown) {
  return normalizeNullableIsoString(rawValue);
}

export function normalizeQueueDefaultWorkspaceHash(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeQueueLastRunAt(rawValue: unknown) {
  return normalizeNullableIsoString(rawValue);
}

export function resolveWorkspacePath(rawWorkspace: unknown, fallbackPath: unknown) {
  const defaultWorkspace = path.join(os.homedir(), "kaizen-workspace");
  const fallbackInput =
    typeof fallbackPath === "string" && fallbackPath.trim().length > 0
      ? fallbackPath
      : defaultWorkspace;
  const safeFallback = isUnsafeWorkspaceInput(fallbackInput)
    ? defaultWorkspace
    : resolveRawPath(fallbackInput);

  if (typeof rawWorkspace !== "string" || rawWorkspace.trim().length === 0) {
    return safeFallback;
  }

  if (isUnsafeWorkspaceInput(rawWorkspace)) {
    return safeFallback;
  }

  const resolved = resolveRawPath(rawWorkspace);
  if (isUnsafeWorkspaceInput(resolved)) {
    return safeFallback;
  }
  return resolved;
}

function normalizeParsedConfig(parsed: any) {
  const fallback = getDefaultConfig();
  const defaults = parsed?.defaults ?? {};
  const auth = parsed?.auth ?? {};
  const channels = parsed?.channels ?? {};
  const telegram = channels?.telegram ?? {};
  const service = parsed?.service ?? {};
  const engine = parsed?.engine ?? {};
  const heartbeat = parsed?.heartbeat ?? {};
  const autonomy = parsed?.autonomy ?? {};
  const autonomyFreeRun = autonomy?.freeRun ?? {};
  const access = parsed?.access ?? {};
  const queue = parsed?.queue ?? {};

  const modelProvider = normalizeModelProvider(defaults.modelProvider ?? defaults.authProvider);
  const abilityProfile = normalizeAbilityProfile(defaults.abilityProfile ?? defaults.mission);
  const mission = abilityProfile;

  const normalized = {
    version: 4,
    defaults: {
      profile:
        typeof defaults.profile === "string" && defaults.profile.trim().length > 0
          ? defaults.profile.trim()
          : fallback.defaults.profile,
      workspace: resolveWorkspacePath(defaults.workspace, fallback.defaults.workspace),
      focus: normalizeFocus(defaults.focus),
      abilityProfile,
      mission,
      modelProvider,
      localRuntime: normalizeLocalRuntime(defaults.localRuntime),
      interactionMode: normalizeInteractionMode(defaults.interactionMode),
      authProvider: normalizeAuthProvider(defaults.authProvider ?? modelProvider),
      runMode: normalizeRunMode(defaults.runMode),
      contextGuardEnabled: normalizeContextGuardEnabled(defaults.contextGuardEnabled),
      contextGuardThresholdPct: normalizeContextGuardThresholdPct(defaults.contextGuardThresholdPct),
      marketplaceSkillsEnabled: normalizeMarketplaceSkillsEnabled(defaults.marketplaceSkillsEnabled),
    },
    auth: {
      provider: normalizeAuthProvider(auth.provider ?? defaults.authProvider),
      lastLoginAt: normalizeNullableIsoString(auth.lastLoginAt),
    },
    channels: {
      telegram: {
        enabled: normalizeTelegramEnabled(telegram.enabled),
        botToken: normalizeTelegramBotToken(telegram.botToken),
        allowFrom: normalizeTelegramAllowFrom(telegram.allowFrom),
        pollIntervalMs: normalizeTelegramPollIntervalMs(telegram.pollIntervalMs),
        longPollTimeoutSec: normalizeTelegramLongPollTimeoutSec(telegram.longPollTimeoutSec),
      },
    },
    service: {
      installed: normalizeServiceInstalled(service.installed),
      runtime: "node",
      riskAcceptedAt: normalizeServiceRiskAcceptedAt(service.riskAcceptedAt),
      lastKnownStatus: normalizeServiceLastKnownStatus(service.lastKnownStatus),
    },
    engine: {
      runner: normalizeEngineRunner(engine.runner),
    },
    heartbeat: {
      enabled: normalizeHeartbeatEnabled(heartbeat.enabled),
      intervalMs: normalizeHeartbeatIntervalMs(heartbeat.intervalMs),
      lastTickAt: normalizeHeartbeatLastTickAt(heartbeat.lastTickAt),
    },
    autonomy: {
      enabled: normalizeAutonomyEnabled(autonomy.enabled),
      mode: normalizeAutonomyMode(autonomy.mode),
      freeRun: {
        maxTurns: normalizeAutonomyMaxTurns(autonomyFreeRun.maxTurns),
        maxMinutes: normalizeAutonomyMaxMinutes(autonomyFreeRun.maxMinutes),
      },
    },
    access: {
      scope: normalizeAccessScope(access.scope),
      allowPaths: normalizeAccessAllowPaths(access.allowPaths),
      fullAccessLastEnabledAt: normalizeFullAccessLastEnabledAt(access.fullAccessLastEnabledAt),
    },
    queue: {
      defaultWorkspaceHash: normalizeQueueDefaultWorkspaceHash(queue.defaultWorkspaceHash),
      lastRunAt: normalizeQueueLastRunAt(queue.lastRunAt),
    },
    missions:
      parsed?.missions && typeof parsed.missions === "object" && !Array.isArray(parsed.missions)
        ? parsed.missions
        : {},
  };

  return normalized;
}

function shouldPersistNormalizedConfig(parsed: any) {
  const parsedVersion = typeof parsed?.version === "number" ? parsed.version : 2;
  if (parsedVersion < 4) {
    return true;
  }
  if (!parsed || typeof parsed !== "object") {
    return true;
  }
  if (!("engine" in parsed) || !("heartbeat" in parsed) || !("autonomy" in parsed)) {
    return true;
  }
  if (!("access" in parsed) || !("queue" in parsed)) {
    return true;
  }
  return false;
}

export function readConfig() {
  const configPath = resolveConfigPath();
  const fallback = getDefaultConfig();

  if (!fs.existsSync(configPath)) {
    return cloneConfig(fallback);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const normalized = normalizeParsedConfig(parsed);

    if (shouldPersistNormalizedConfig(parsed)) {
      try {
        writeConfig(normalized);
      } catch {
        // Keep non-destructive read behavior if writing fails.
      }
    }

    return normalized;
  } catch {
    return cloneConfig(fallback);
  }
}

export function writeConfig(config: any) {
  const configPath = resolveConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return configPath;
}
