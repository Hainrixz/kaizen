/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { confirm, isCancel, select, text } from "@clack/prompts";
import {
  isUnsafeWorkspaceInput,
  normalizeAbilityProfile,
  normalizeAuthProvider,
  normalizeContextGuardEnabled,
  normalizeContextGuardThresholdPct,
  normalizeInteractionMode,
  normalizeLocalRuntime,
  normalizeMarketplaceSkillsEnabled,
  normalizeModelProvider,
  normalizeRunMode,
  normalizeTelegramAllowFrom,
  normalizeTelegramBotToken,
  normalizeTelegramEnabled,
  normalizeTelegramLongPollTimeoutSec,
  normalizeTelegramPollIntervalMs,
  readConfig,
  resolveConfigPath,
  resolveWorkspacePath,
  writeConfig,
} from "../config.js";
import { authLoginCommand } from "./auth.js";
import { installAbilityProfile } from "../mission-pack.js";
import { installMarketplaceSkillsForAbility } from "../skills-marketplace.js";
import { installAndStartServiceForAlwaysOnMode } from "./service.js";

const MODEL_CHOICE_OPENAI = "openai-codex";
const MODEL_CHOICE_LOCAL_OLLAMA = "local-ollama";
const MODEL_CHOICE_LOCAL_LMSTUDIO = "local-lmstudio";

const MODEL_CHOICES = [
  { value: MODEL_CHOICE_OPENAI, label: "OpenAI Codex (OAuth)" },
  { value: MODEL_CHOICE_LOCAL_OLLAMA, label: "Local AI (Ollama)" },
  { value: MODEL_CHOICE_LOCAL_LMSTUDIO, label: "Local AI (LM Studio)" },
];

const ABILITY_CHOICES = [
  { value: "web-design", label: "Web design (landing pages + frontend UI)" },
];

const INTERACTION_CHOICES = [
  { value: "terminal", label: "Terminal chat" },
  { value: "localhost", label: "Localhost UI (port 3000)" },
];

const RUN_MODE_CHOICES = [
  {
    value: "manual",
    label: "Manual (default) - stops when terminal closes",
  },
  {
    value: "always-on",
    label: "Always-on (service mode) - keeps running in background",
  },
];

const WORKSPACE_LOCATION_DESKTOP = "desktop";
const WORKSPACE_LOCATION_DOCUMENTS = "documents";
const WORKSPACE_LOCATION_HOME = "home";
const WORKSPACE_LOCATION_CUSTOM = "custom";
const WORKSPACE_FOLDER_NAME = "kaizen-workspace";

function normalizeWorkspaceLocation(rawValue: unknown) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }
  const normalized = rawValue.trim().toLowerCase();
  if (
    normalized !== WORKSPACE_LOCATION_DESKTOP &&
    normalized !== WORKSPACE_LOCATION_DOCUMENTS &&
    normalized !== WORKSPACE_LOCATION_HOME &&
    normalized !== WORKSPACE_LOCATION_CUSTOM
  ) {
    return null;
  }
  return normalized;
}

function resolveWorkspaceFromLocation(location: string) {
  const home = os.homedir();
  if (location === WORKSPACE_LOCATION_DESKTOP) {
    return path.join(home, "Desktop", WORKSPACE_FOLDER_NAME);
  }
  if (location === WORKSPACE_LOCATION_DOCUMENTS) {
    return path.join(home, "Documents", WORKSPACE_FOLDER_NAME);
  }
  return path.join(home, WORKSPACE_FOLDER_NAME);
}

function resolveWorkspaceLocationDefault(workspace: string) {
  if (workspace === resolveWorkspaceFromLocation(WORKSPACE_LOCATION_DESKTOP)) {
    return WORKSPACE_LOCATION_DESKTOP;
  }
  if (workspace === resolveWorkspaceFromLocation(WORKSPACE_LOCATION_DOCUMENTS)) {
    return WORKSPACE_LOCATION_DOCUMENTS;
  }
  if (workspace === resolveWorkspaceFromLocation(WORKSPACE_LOCATION_HOME)) {
    return WORKSPACE_LOCATION_HOME;
  }
  return WORKSPACE_LOCATION_CUSTOM;
}

function formatHomePath(targetPath: string) {
  const home = os.homedir();
  if (targetPath === home) {
    return "~";
  }
  if (targetPath.startsWith(`${home}${path.sep}`)) {
    return `~${targetPath.slice(home.length)}`;
  }
  return targetPath;
}

function findDefaultChoiceIndex(
  choices: Array<{ value: string; label: string }>,
  defaultValue: string,
) {
  const index = choices.findIndex((choice) => choice.value === defaultValue);
  return index >= 0 ? index : 0;
}

function cancelOnboarding(currentConfig: any) {
  console.log("");
  console.log("Onboarding cancelled. No changes were written.");
  return currentConfig;
}

async function askChoice(
  label: string,
  choices: Array<{ value: string; label: string }>,
  defaultValue: string,
) {
  const defaultIndex = findDefaultChoiceIndex(choices, defaultValue);
  const selection = await select({
    message: label,
    options: choices,
    initialValue: choices[defaultIndex]?.value,
  });
  if (isCancel(selection)) {
    return null;
  }
  return String(selection);
}

async function askPath(label: string, fallbackPath: string) {
  const rawPath = await text({
    message: label,
    defaultValue: fallbackPath,
    placeholder: fallbackPath,
    validate: (value) => {
      const normalized = String(value ?? "").trim();
      if (!normalized) {
        return "Enter a folder path.";
      }
      if (isUnsafeWorkspaceInput(normalized)) {
        return "Enter a folder path only (not a shell command).";
      }
      return;
    },
  });
  if (isCancel(rawPath)) {
    return null;
  }
  const normalized = String(rawPath).trim();
  return normalized || fallbackPath;
}

async function askText(label: string, defaultValue = "") {
  const response = await text({
    message: label,
    defaultValue,
    placeholder: defaultValue,
  });
  if (isCancel(response)) {
    return null;
  }
  return String(response ?? "").trim();
}

async function askYesNo(label: string, defaultValue = false) {
  const response = await confirm({
    message: label,
    initialValue: defaultValue,
  });
  if (isCancel(response)) {
    return null;
  }
  return Boolean(response);
}

function resolveModelChoiceDefault(modelProvider: string, localRuntime: string) {
  if (modelProvider !== "local") {
    return MODEL_CHOICE_OPENAI;
  }
  return localRuntime === "lmstudio" ? MODEL_CHOICE_LOCAL_LMSTUDIO : MODEL_CHOICE_LOCAL_OLLAMA;
}

function parseAcceptAlwaysOnRisk(options: any) {
  if (typeof options.acceptAlwaysOnRisk === "boolean") {
    return options.acceptAlwaysOnRisk;
  }
  if (typeof options.acceptAlwaysOnRisk === "string") {
    const normalized = options.acceptAlwaysOnRisk.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

export async function onboardCommand(options: any = {}) {
  const current = readConfig();
  const configPath = resolveConfigPath();
  const nonInteractive = Boolean(options.nonInteractive);

  const hasWorkspaceOverride =
    typeof options.workspace === "string" && options.workspace.trim().length > 0;
  const workspaceLocationFromOption = normalizeWorkspaceLocation(options.workspaceLocation);

  if (
    typeof options.workspaceLocation === "string" &&
    options.workspaceLocation.trim().length > 0 &&
    !workspaceLocationFromOption
  ) {
    throw new Error("Invalid workspace location. Use: desktop, documents, home, or custom.");
  }

  if (hasWorkspaceOverride && isUnsafeWorkspaceInput(options.workspace)) {
    throw new Error(
      "Invalid workspace path. Pass a filesystem path (example: ~/kaizen-workspace), not a shell command.",
    );
  }

  if (
    nonInteractive &&
    workspaceLocationFromOption === WORKSPACE_LOCATION_CUSTOM &&
    !hasWorkspaceOverride
  ) {
    throw new Error("Non-interactive mode needs --workspace when --workspace-location custom is used.");
  }

  let workspace =
    hasWorkspaceOverride
      ? resolveWorkspacePath(options.workspace, current.defaults.workspace)
      : workspaceLocationFromOption && workspaceLocationFromOption !== WORKSPACE_LOCATION_CUSTOM
        ? resolveWorkspaceFromLocation(workspaceLocationFromOption)
        : current.defaults.workspace;

  let modelProvider = normalizeModelProvider(
    options.model ?? options.modelProvider ?? current.defaults.modelProvider,
  );
  let localRuntime = normalizeLocalRuntime(options.localRuntime ?? current.defaults.localRuntime);
  let abilityProfile = normalizeAbilityProfile(
    options.abilityProfile ?? options.mission ?? current.defaults.abilityProfile,
  );
  let interactionMode = normalizeInteractionMode(
    options.interaction ?? current.defaults.interactionMode,
  );
  let runMode = normalizeRunMode(options.runMode ?? current.defaults.runMode);
  let authProvider = normalizeAuthProvider(options.authProvider ?? current.defaults.authProvider);

  const contextGuardEnabled = normalizeContextGuardEnabled(
    options.contextGuardEnabled ?? current.defaults.contextGuardEnabled,
  );
  const contextGuardThresholdPct = normalizeContextGuardThresholdPct(
    options.contextGuardThresholdPct ?? current.defaults.contextGuardThresholdPct,
  );

  const hasMarketplaceSkillsOption = options.marketplaceSkills !== undefined;
  let marketplaceSkillsEnabled = normalizeMarketplaceSkillsEnabled(
    options.marketplaceSkills ?? current.defaults.marketplaceSkillsEnabled,
  );
  const forceMarketplaceSkills = Boolean(options.forceMarketplaceSkills);

  const hasExplicitLoginChoice = Boolean(options.login) || Boolean(options.skipLogin);
  let runLogin = Boolean(options.login);

  let telegramEnabled =
    options.enableTelegram !== undefined
      ? normalizeTelegramEnabled(options.enableTelegram)
      : Boolean(current.channels?.telegram?.enabled);
  let telegramBotToken = normalizeTelegramBotToken(
    options.telegramBotToken ?? current.channels?.telegram?.botToken,
  );
  let telegramAllowFrom = normalizeTelegramAllowFrom(
    options.telegramAllowFrom ?? current.channels?.telegram?.allowFrom,
  );
  const telegramPollIntervalMs = normalizeTelegramPollIntervalMs(
    options.telegramPollIntervalMs ?? current.channels?.telegram?.pollIntervalMs,
  );
  const telegramLongPollTimeoutSec = normalizeTelegramLongPollTimeoutSec(
    options.telegramLongPollTimeoutSec ?? current.channels?.telegram?.longPollTimeoutSec,
  );

  let alwaysOnRiskAccepted = parseAcceptAlwaysOnRisk(options) || Boolean(current.service?.riskAcceptedAt);

  if (modelProvider === "local") {
    runLogin = false;
  }

  if (nonInteractive) {
    if (runMode === "always-on" && !alwaysOnRiskAccepted) {
      throw new Error("Non-interactive always-on mode requires --accept-always-on-risk true.");
    }
    if (telegramEnabled) {
      if (!telegramBotToken) {
        throw new Error("Non-interactive Telegram setup requires --telegram-bot-token.");
      }
      if (telegramAllowFrom.length === 0) {
        throw new Error("Non-interactive Telegram setup requires --telegram-allow-from with numeric IDs.");
      }
    }
  }

  if (!nonInteractive) {
    console.log("");
    console.log("Kaizen onboarding wizard");
    console.log("Use arrow keys to choose options, then press Enter.");
    console.log("");

    const modelChoice = await askChoice(
      "Choose model provider",
      MODEL_CHOICES,
      resolveModelChoiceDefault(modelProvider, localRuntime),
    );
    if (!modelChoice) {
      return cancelOnboarding(current);
    }
    if (modelChoice === MODEL_CHOICE_OPENAI) {
      modelProvider = "openai-codex";
      localRuntime = "ollama";
    } else if (modelChoice === MODEL_CHOICE_LOCAL_LMSTUDIO) {
      modelProvider = "local";
      localRuntime = "lmstudio";
    } else {
      modelProvider = "local";
      localRuntime = "ollama";
    }

    const selectedAbilityProfile = await askChoice(
      "Choose ability profile (v1)",
      ABILITY_CHOICES,
      abilityProfile,
    );
    if (!selectedAbilityProfile) {
      return cancelOnboarding(current);
    }
    abilityProfile = normalizeAbilityProfile(selectedAbilityProfile);

    if (!hasMarketplaceSkillsOption) {
      const shouldInstallMarketplaceSkills = await askYesNo(
        "Install curated web-development marketplace skills now?",
        marketplaceSkillsEnabled,
      );
      if (shouldInstallMarketplaceSkills === null) {
        return cancelOnboarding(current);
      }
      marketplaceSkillsEnabled = shouldInstallMarketplaceSkills;
    }

    const selectedInteractionMode = await askChoice(
      "Choose interaction mode",
      INTERACTION_CHOICES,
      interactionMode,
    );
    if (!selectedInteractionMode) {
      return cancelOnboarding(current);
    }
    interactionMode = normalizeInteractionMode(selectedInteractionMode);

    const selectedRunMode = await askChoice(
      "Choose runtime mode",
      RUN_MODE_CHOICES,
      runMode,
    );
    if (!selectedRunMode) {
      return cancelOnboarding(current);
    }
    runMode = normalizeRunMode(selectedRunMode);

    if (runMode === "always-on") {
      console.log("");
      console.log("Always-on mode keeps Kaizen active after terminal closes.");
      console.log("Use only on trusted machines and keep channel allowlists strict.");
      const acceptedRisk = await askYesNo("Accept always-on runtime risk?", alwaysOnRiskAccepted);
      if (acceptedRisk === null || !acceptedRisk) {
        return cancelOnboarding(current);
      }
      alwaysOnRiskAccepted = true;
    }

    if (!hasWorkspaceOverride) {
      const defaultWorkspaceLocation =
        workspaceLocationFromOption ?? resolveWorkspaceLocationDefault(workspace);
      const locationChoice = await askChoice(
        "Where should Kaizen save projects by default?",
        [
          {
            value: WORKSPACE_LOCATION_DESKTOP,
            label: `Desktop (${formatHomePath(resolveWorkspaceFromLocation(WORKSPACE_LOCATION_DESKTOP))})`,
          },
          {
            value: WORKSPACE_LOCATION_DOCUMENTS,
            label: `Documents (${formatHomePath(resolveWorkspaceFromLocation(WORKSPACE_LOCATION_DOCUMENTS))})`,
          },
          {
            value: WORKSPACE_LOCATION_HOME,
            label: `Home folder (${formatHomePath(resolveWorkspaceFromLocation(WORKSPACE_LOCATION_HOME))})`,
          },
          {
            value: WORKSPACE_LOCATION_CUSTOM,
            label: "Custom path",
          },
        ],
        defaultWorkspaceLocation,
      );
      if (!locationChoice) {
        return cancelOnboarding(current);
      }

      if (locationChoice === WORKSPACE_LOCATION_CUSTOM) {
        const workspaceInput = await askPath("Workspace path", formatHomePath(workspace));
        if (!workspaceInput) {
          return cancelOnboarding(current);
        }
        workspace = resolveWorkspacePath(workspaceInput, workspace);
      } else {
        workspace = resolveWorkspaceFromLocation(locationChoice);
      }
    }

    const enableTelegram = await askYesNo(
      "Enable Telegram channel in this profile?",
      telegramEnabled,
    );
    if (enableTelegram === null) {
      return cancelOnboarding(current);
    }
    telegramEnabled = enableTelegram;

    if (telegramEnabled) {
      const tokenInput = await askText(
        "Telegram bot token",
        telegramBotToken ?? "",
      );
      if (tokenInput === null) {
        return cancelOnboarding(current);
      }
      telegramBotToken = normalizeTelegramBotToken(tokenInput);

      const allowFromInput = await askText(
        "Telegram allowFrom IDs (comma separated numeric IDs)",
        telegramAllowFrom.join(","),
      );
      if (allowFromInput === null) {
        return cancelOnboarding(current);
      }
      telegramAllowFrom = normalizeTelegramAllowFrom(allowFromInput);

      if (!telegramBotToken) {
        throw new Error("Telegram bot token is required when Telegram is enabled.");
      }
      if (telegramAllowFrom.length === 0) {
        throw new Error("Telegram allowFrom must include at least one numeric ID.");
      }
    }

    if (modelProvider === "openai-codex") {
      authProvider = "openai-codex";
      if (!hasExplicitLoginChoice) {
        const shouldRunLogin = await askYesNo("Connect OpenAI Codex OAuth now?", true);
        if (shouldRunLogin === null) {
          return cancelOnboarding(current);
        }
        runLogin = shouldRunLogin;
      }
    } else {
      runLogin = false;
    }

    console.log("");
    console.log("Review setup:");
    console.log(`- model provider: ${modelProvider}`);
    if (modelProvider === "local") {
      console.log(`- local runtime: ${localRuntime}`);
    }
    console.log(`- ability profile: ${abilityProfile}`);
    console.log(`- interaction mode: ${interactionMode}`);
    console.log(`- run mode: ${runMode}`);
    console.log(`- workspace: ${workspace}`);
    console.log(`- telegram: ${telegramEnabled ? "enabled" : "disabled"}`);
    if (telegramEnabled) {
      console.log(`- telegram allowFrom: ${telegramAllowFrom.join(", ")}`);
    }
    console.log(`- run OAuth login now: ${runLogin ? "yes" : "no"}`);
    console.log(
      `- context guard: ${contextGuardEnabled ? `enabled (${contextGuardThresholdPct}%)` : "disabled"}`,
    );
    console.log(
      `- marketplace skills: ${marketplaceSkillsEnabled ? "install enabled" : "disabled"}`,
    );
    if (forceMarketplaceSkills) {
      console.log("- marketplace skills force-sync: enabled");
    }

    const approved = await askYesNo("Apply this configuration?", true);
    if (approved === null || !approved) {
      return cancelOnboarding(current);
    }
  }

  if (modelProvider === "openai-codex") {
    authProvider = "openai-codex";
  }

  const installResult = installAbilityProfile({
    abilityProfile,
    workspace,
    modelProvider,
    localRuntime,
    interactionMode,
    contextGuardThresholdPct,
  });

  let marketplaceSkillsResult = null;
  if (marketplaceSkillsEnabled) {
    console.log("");
    console.log("Syncing curated marketplace skills...");
    marketplaceSkillsResult = await installMarketplaceSkillsForAbility({
      workspace,
      abilityProfile,
      force: forceMarketplaceSkills,
      log: (line) => console.log(line),
    });
    const cacheLabel = marketplaceSkillsResult.cached ? " (already up to date)" : "";
    console.log(
      `Marketplace skills sync: ${marketplaceSkillsResult.installedCount}/${marketplaceSkillsResult.skillCount} installed, ${marketplaceSkillsResult.failedCount} failed${cacheLabel}.`,
    );
    if (marketplaceSkillsResult.failedCount > 0) {
      console.log(
        "Some marketplace skills failed to install. You can retry with --force-marketplace-skills.",
      );
    }
  }

  const nextConfig = {
    version: 3,
    defaults: {
      ...current.defaults,
      workspace,
      focus: "web-app",
      mission: abilityProfile,
      abilityProfile,
      modelProvider,
      localRuntime,
      interactionMode,
      authProvider,
      runMode,
      contextGuardEnabled,
      contextGuardThresholdPct,
      marketplaceSkillsEnabled,
    },
    auth: {
      provider: authProvider,
      lastLoginAt: current.auth?.lastLoginAt ?? null,
    },
    channels: {
      ...current.channels,
      telegram: {
        enabled: telegramEnabled,
        botToken: telegramEnabled ? telegramBotToken : current.channels?.telegram?.botToken ?? null,
        allowFrom: telegramEnabled ? telegramAllowFrom : current.channels?.telegram?.allowFrom ?? [],
        pollIntervalMs: telegramPollIntervalMs,
        longPollTimeoutSec: telegramLongPollTimeoutSec,
      },
    },
    service: {
      installed: current.service?.installed ?? false,
      runtime: "node",
      riskAcceptedAt:
        runMode === "always-on" && alwaysOnRiskAccepted
          ? new Date().toISOString()
          : current.service?.riskAcceptedAt ?? null,
      lastKnownStatus: current.service?.lastKnownStatus ?? "unknown",
    },
    missions: {
      ...(current.missions ?? {}),
      [abilityProfile]: {
        installedAt: installResult.installedAt,
        globalProfileDir: installResult.globalProfileDir,
        workspaceProfileDir: installResult.workspaceProfileDir,
        workspaceSkillsIndexPath: installResult.workspaceSkillsIndexPath,
        workspaceWalkthroughPath: installResult.workspaceWalkthroughPath,
        workspaceMarketplaceSkillsPath: installResult.workspaceMarketplaceSkillsPath,
        memoryFilePath: installResult.memoryFilePath,
        contextGuardThresholdPct: installResult.contextGuardThresholdPct,
        marketplaceSkills: marketplaceSkillsResult
          ? {
              enabled: marketplaceSkillsEnabled,
              version: marketplaceSkillsResult.version,
              statePath: marketplaceSkillsResult.statePath,
              syncedAt: marketplaceSkillsResult.completedAt,
              cached: marketplaceSkillsResult.cached,
              skillCount: marketplaceSkillsResult.skillCount,
              installedCount: marketplaceSkillsResult.installedCount,
              failedCount: marketplaceSkillsResult.failedCount,
            }
          : {
              enabled: marketplaceSkillsEnabled,
              version: null,
              statePath: null,
              syncedAt: null,
              cached: false,
              skillCount: 0,
              installedCount: 0,
              failedCount: 0,
            },
      },
    },
  };

  writeConfig(nextConfig);

  if (runLogin && modelProvider === "openai-codex") {
    await authLoginCommand({ provider: authProvider });
  }

  if (runMode === "always-on" && alwaysOnRiskAccepted) {
    await installAndStartServiceForAlwaysOnMode();
  }

  console.log("");
  console.log("Onboarding complete.");
  console.log(`Config: ${configPath}`);
  console.log(`Workspace: ${nextConfig.defaults.workspace}`);
  console.log(`Model provider: ${nextConfig.defaults.modelProvider}`);
  if (nextConfig.defaults.modelProvider === "local") {
    console.log(`Local runtime: ${nextConfig.defaults.localRuntime}`);
  }
  console.log(`Ability profile: ${nextConfig.defaults.abilityProfile}`);
  console.log(`Interaction mode: ${nextConfig.defaults.interactionMode}`);
  console.log(`Run mode: ${nextConfig.defaults.runMode}`);
  console.log(`Telegram: ${nextConfig.channels.telegram.enabled ? "enabled" : "disabled"}`);
  if (nextConfig.channels.telegram.enabled) {
    console.log(`Telegram allowFrom: ${nextConfig.channels.telegram.allowFrom.join(", ")}`);
  }
  console.log(
    `Context guard: ${nextConfig.defaults.contextGuardEnabled ? `enabled (${nextConfig.defaults.contextGuardThresholdPct}%)` : "disabled"}`,
  );
  console.log(
    `Marketplace skills: ${nextConfig.defaults.marketplaceSkillsEnabled ? "enabled" : "disabled"}`,
  );
  console.log(`Global profile files: ${installResult.globalProfileDir}`);
  console.log(`Workspace profile files: ${installResult.workspaceProfileDir}`);
  console.log(`Walkthrough: ${installResult.workspaceWalkthroughPath}`);
  console.log(`Skills index: ${installResult.workspaceSkillsIndexPath}`);
  console.log(`Marketplace skills catalog: ${installResult.workspaceMarketplaceSkillsPath}`);
  if (marketplaceSkillsResult) {
    console.log(
      `Marketplace sync result: ${marketplaceSkillsResult.installedCount}/${marketplaceSkillsResult.skillCount} installed, ${marketplaceSkillsResult.failedCount} failed.`,
    );
    console.log(`Marketplace state: ${marketplaceSkillsResult.statePath}`);
  }
  console.log(`Memory file: ${installResult.memoryFilePath}`);

  return nextConfig;
}
