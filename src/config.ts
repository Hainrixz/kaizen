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
const DEFAULT_CONTEXT_GUARD_THRESHOLD_PCT = 65;
const SHELL_OPERATOR_PATTERN = /(?:\r|\n|&&|\|\||;|\||`|\$\(|\$\{)/;
const SHELL_COMMAND_PREFIX_PATTERN =
  /^\s*(?:cd|bash|sh|zsh|fish|node|npm|pnpm|yarn|npx|corepack|curl|git)\b/i;

export function getDefaultConfig() {
  return {
    version: 2,
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
      contextGuardEnabled: true,
      contextGuardThresholdPct: DEFAULT_CONTEXT_GUARD_THRESHOLD_PCT,
      marketplaceSkillsEnabled: true,
    },
    auth: {
      provider: "openai-codex",
      lastLoginAt: null,
    },
    missions: {},
  };
}

function cloneConfig(config) {
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

export function normalizeFocus(rawFocus) {
  if (typeof rawFocus !== "string" || rawFocus.trim().length === 0) {
    return "web-app";
  }
  const normalized = rawFocus.trim().toLowerCase();
  return VALID_FOCUS.has(normalized) ? normalized : "web-app";
}

export function normalizeAbilityProfile(rawProfile) {
  if (typeof rawProfile !== "string" || rawProfile.trim().length === 0) {
    return "web-design";
  }
  const normalized = rawProfile.trim().toLowerCase();
  return VALID_ABILITY_PROFILES.has(normalized) ? normalized : "web-design";
}

export function normalizeMission(rawMission) {
  return normalizeAbilityProfile(rawMission);
}

export function normalizeModelProvider(rawProvider) {
  if (typeof rawProvider !== "string" || rawProvider.trim().length === 0) {
    return "openai-codex";
  }
  const normalized = rawProvider.trim().toLowerCase();
  return VALID_MODEL_PROVIDERS.has(normalized) ? normalized : "openai-codex";
}

export function normalizeAuthProvider(rawProvider) {
  if (typeof rawProvider !== "string" || rawProvider.trim().length === 0) {
    return "openai-codex";
  }
  const normalized = rawProvider.trim().toLowerCase();
  return VALID_AUTH_PROVIDERS.has(normalized) ? normalized : "openai-codex";
}

export function normalizeInteractionMode(rawMode) {
  if (typeof rawMode !== "string" || rawMode.trim().length === 0) {
    return "terminal";
  }
  const normalized = rawMode.trim().toLowerCase();
  return VALID_INTERACTION_MODES.has(normalized) ? normalized : "terminal";
}

export function normalizeLocalRuntime(rawRuntime) {
  if (typeof rawRuntime !== "string" || rawRuntime.trim().length === 0) {
    return "ollama";
  }
  const normalized = rawRuntime.trim().toLowerCase();
  return VALID_LOCAL_RUNTIMES.has(normalized) ? normalized : "ollama";
}

export function normalizeContextGuardEnabled(rawEnabled) {
  if (typeof rawEnabled === "boolean") {
    return rawEnabled;
  }
  if (typeof rawEnabled === "string" && rawEnabled.trim().length > 0) {
    const normalized = rawEnabled.trim().toLowerCase();
    if (normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no") {
      return false;
    }
    if (normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes") {
      return true;
    }
  }
  return true;
}

export function normalizeContextGuardThresholdPct(rawThreshold) {
  const fallback = DEFAULT_CONTEXT_GUARD_THRESHOLD_PCT;
  if (typeof rawThreshold === "number" && Number.isFinite(rawThreshold)) {
    const rounded = Math.round(rawThreshold);
    if (rounded < 40) {
      return 40;
    }
    if (rounded > 90) {
      return 90;
    }
    return rounded;
  }
  if (typeof rawThreshold === "string" && rawThreshold.trim().length > 0) {
    const parsed = Number.parseInt(rawThreshold.trim(), 10);
    if (!Number.isNaN(parsed)) {
      return normalizeContextGuardThresholdPct(parsed);
    }
  }
  return fallback;
}

export function normalizeMarketplaceSkillsEnabled(rawEnabled) {
  if (typeof rawEnabled === "boolean") {
    return rawEnabled;
  }
  if (typeof rawEnabled === "string" && rawEnabled.trim().length > 0) {
    const normalized = rawEnabled.trim().toLowerCase();
    if (normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no") {
      return false;
    }
    if (normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes") {
      return true;
    }
  }
  return true;
}

function resolveRawPath(rawPath) {
  const trimmed = rawPath.trim();
  if (trimmed === "~") {
    return os.homedir();
  }
  if (trimmed.startsWith("~/")) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return path.resolve(trimmed);
}

export function isUnsafeWorkspaceInput(rawWorkspace) {
  if (typeof rawWorkspace !== "string") {
    return false;
  }
  const trimmed = rawWorkspace.trim();
  if (!trimmed) {
    return false;
  }
  return (
    SHELL_OPERATOR_PATTERN.test(trimmed) ||
    SHELL_COMMAND_PREFIX_PATTERN.test(trimmed)
  );
}

export function resolveWorkspacePath(rawWorkspace, fallbackPath) {
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

export function readConfig() {
  const configPath = resolveConfigPath();
  const fallback = getDefaultConfig();

  if (!fs.existsSync(configPath)) {
    return cloneConfig(fallback);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const defaults = parsed?.defaults ?? {};
    const auth = parsed?.auth ?? {};
    const modelProvider = normalizeModelProvider(defaults.modelProvider ?? defaults.authProvider);
    const abilityProfile = normalizeAbilityProfile(defaults.abilityProfile ?? defaults.mission);
    const mission = abilityProfile;
    return {
      version: fallback.version,
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
        contextGuardEnabled: normalizeContextGuardEnabled(defaults.contextGuardEnabled),
        contextGuardThresholdPct: normalizeContextGuardThresholdPct(
          defaults.contextGuardThresholdPct,
        ),
        marketplaceSkillsEnabled: normalizeMarketplaceSkillsEnabled(
          defaults.marketplaceSkillsEnabled,
        ),
      },
      auth: {
        provider: normalizeAuthProvider(auth.provider ?? defaults.authProvider),
        lastLoginAt:
          typeof auth.lastLoginAt === "string" && auth.lastLoginAt.trim().length > 0
            ? auth.lastLoginAt
            : null,
      },
      missions:
        parsed?.missions && typeof parsed.missions === "object" && !Array.isArray(parsed.missions)
          ? parsed.missions
          : {},
    };
  } catch {
    return cloneConfig(fallback);
  }
}

export function writeConfig(config) {
  const configPath = resolveConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return configPath;
}
