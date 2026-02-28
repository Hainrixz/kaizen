/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

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
import { onboardCommand } from "./onboard.js";
import { installAbilityProfile } from "../mission-pack.js";
import { installMarketplaceSkillsForAbility } from "../skills-marketplace.js";
import { installAndStartServiceForAlwaysOnMode } from "./service.js";
import { launchKaizenAfterSetup, normalizeAutoStartOption } from "./post-setup-launch.js";

function parseAcceptAlwaysOnRisk(options: any) {
  if (typeof options.acceptAlwaysOnRisk === "boolean") {
    return options.acceptAlwaysOnRisk;
  }
  if (typeof options.acceptAlwaysOnRisk === "string") {
    const normalized = options.acceptAlwaysOnRisk.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

export async function setupCommand(options: any = {}) {
  const runWizard = Boolean(options.wizard);
  const runNonInteractiveWizard = Boolean(options.nonInteractive);
  const autoStart = normalizeAutoStartOption(
    options.noAutoStart === true ? false : options.autoStart,
    true,
  );

  if (runWizard || runNonInteractiveWizard) {
    await onboardCommand({
      nonInteractive: runNonInteractiveWizard,
      workspace: options.workspace,
      workspaceLocation: options.workspaceLocation,
      model: options.model,
      modelProvider: options.modelProvider,
      localRuntime: options.localRuntime,
      abilityProfile: options.abilityProfile,
      mission: options.mission,
      interaction: options.interaction,
      runMode: options.runMode,
      enableTelegram: options.enableTelegram,
      telegramBotToken: options.telegramBotToken,
      telegramAllowFrom: options.telegramAllowFrom,
      telegramPollIntervalMs: options.telegramPollIntervalMs,
      telegramLongPollTimeoutSec: options.telegramLongPollTimeoutSec,
      acceptAlwaysOnRisk: options.acceptAlwaysOnRisk,
      authProvider: options.authProvider,
      contextGuardEnabled: options.contextGuardEnabled,
      contextGuardThresholdPct: options.contextGuardThresholdPct,
      marketplaceSkills: options.marketplaceSkills,
      forceMarketplaceSkills: options.forceMarketplaceSkills,
      autoStart,
      login: options.login,
      skipLogin: options.skipLogin,
    });
    return;
  }

  const current = readConfig();
  if (
    typeof options.workspace === "string" &&
    options.workspace.trim().length > 0 &&
    isUnsafeWorkspaceInput(options.workspace)
  ) {
    throw new Error(
      "Invalid workspace path. Pass a filesystem path (example: ~/kaizen-workspace), not a shell command.",
    );
  }

  const workspace = resolveWorkspacePath(options.workspace, current.defaults.workspace);
  const modelProvider = normalizeModelProvider(
    options.model ?? options.modelProvider ?? current.defaults.modelProvider,
  );
  const localRuntime = normalizeLocalRuntime(options.localRuntime ?? current.defaults.localRuntime);
  const abilityProfile = normalizeAbilityProfile(
    options.abilityProfile ?? options.mission ?? current.defaults.abilityProfile,
  );
  const interactionMode = normalizeInteractionMode(
    options.interaction ?? current.defaults.interactionMode,
  );
  const runMode = normalizeRunMode(options.runMode ?? current.defaults.runMode);
  const authProvider = normalizeAuthProvider(options.authProvider ?? current.defaults.authProvider);
  const contextGuardEnabled = normalizeContextGuardEnabled(
    options.contextGuardEnabled ?? current.defaults.contextGuardEnabled,
  );
  const contextGuardThresholdPct = normalizeContextGuardThresholdPct(
    options.contextGuardThresholdPct ?? current.defaults.contextGuardThresholdPct,
  );
  const marketplaceSkillsEnabled = normalizeMarketplaceSkillsEnabled(
    options.marketplaceSkills ?? current.defaults.marketplaceSkillsEnabled,
  );
  const forceMarketplaceSkills = Boolean(options.forceMarketplaceSkills);

  const telegramEnabled =
    options.enableTelegram !== undefined
      ? normalizeTelegramEnabled(options.enableTelegram)
      : current.channels.telegram.enabled;
  const telegramBotToken = normalizeTelegramBotToken(
    options.telegramBotToken ?? current.channels.telegram.botToken,
  );
  const telegramAllowFrom = normalizeTelegramAllowFrom(
    options.telegramAllowFrom ?? current.channels.telegram.allowFrom,
  );
  const telegramPollIntervalMs = normalizeTelegramPollIntervalMs(
    options.telegramPollIntervalMs ?? current.channels.telegram.pollIntervalMs,
  );
  const telegramLongPollTimeoutSec = normalizeTelegramLongPollTimeoutSec(
    options.telegramLongPollTimeoutSec ?? current.channels.telegram.longPollTimeoutSec,
  );

  const acceptAlwaysOnRisk = parseAcceptAlwaysOnRisk(options) || Boolean(current.service.riskAcceptedAt);

  if (runMode === "always-on" && !acceptAlwaysOnRisk) {
    throw new Error("Always-on mode requires --accept-always-on-risk true.");
  }
  if (telegramEnabled && !telegramBotToken) {
    throw new Error("Telegram channel requires --telegram-bot-token.");
  }
  if (telegramEnabled && telegramAllowFrom.length === 0) {
    throw new Error("Telegram channel requires --telegram-allow-from with numeric IDs.");
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
    ...current,
    version: 5,
    defaults: {
      ...current.defaults,
      workspace,
      abilityProfile,
      mission: abilityProfile,
      modelProvider,
      localRuntime,
      interactionMode,
      runMode,
      authProvider,
      contextGuardEnabled,
      contextGuardThresholdPct,
      marketplaceSkillsEnabled,
    },
    channels: {
      ...current.channels,
      telegram: {
        ...current.channels.telegram,
        enabled: telegramEnabled,
        botToken: telegramEnabled ? telegramBotToken : current.channels.telegram.botToken,
        allowFrom: telegramEnabled ? telegramAllowFrom : current.channels.telegram.allowFrom,
        pollIntervalMs: telegramPollIntervalMs,
        longPollTimeoutSec: telegramLongPollTimeoutSec,
      },
    },
    service: {
      ...current.service,
      runtime: "node",
      riskAcceptedAt:
        runMode === "always-on" && acceptAlwaysOnRisk
          ? current.service.riskAcceptedAt ?? new Date().toISOString()
          : current.service.riskAcceptedAt,
    },
    engine: {
      ...(current.engine ?? {}),
      runner: current.engine?.runner ?? "codex",
    },
    heartbeat: {
      ...(current.heartbeat ?? {}),
      enabled: current.heartbeat?.enabled ?? true,
      intervalMs: current.heartbeat?.intervalMs ?? 1500,
      lastTickAt: current.heartbeat?.lastTickAt ?? null,
    },
    autonomy: {
      ...(current.autonomy ?? {}),
      enabled: current.autonomy?.enabled ?? false,
      mode: current.autonomy?.mode ?? "queued",
      freeRun: {
        maxTurns: current.autonomy?.freeRun?.maxTurns ?? 5,
        maxMinutes: current.autonomy?.freeRun?.maxMinutes ?? 20,
      },
    },
    access: {
      ...(current.access ?? {}),
      scope: current.access?.scope ?? "workspace",
      allowPaths: [...(current.access?.allowPaths ?? [])],
      fullAccessLastEnabledAt: current.access?.fullAccessLastEnabledAt ?? null,
    },
    queue: {
      ...(current.queue ?? {}),
      defaultWorkspaceHash: current.queue?.defaultWorkspaceHash ?? null,
      lastRunAt: current.queue?.lastRunAt ?? null,
    },
    updates: {
      ...(current.updates ?? {}),
      enabled: current.updates?.enabled ?? true,
      channel: current.updates?.channel ?? "stable",
      checkIntervalHours: current.updates?.checkIntervalHours ?? 24,
      sourceRepo: current.updates?.sourceRepo ?? "Hainrixz/kaizen",
    },
    auth: {
      ...current.auth,
      provider: authProvider,
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

  const configPath = writeConfig(nextConfig);

  if (options.login && modelProvider === "openai-codex") {
    await authLoginCommand({ provider: authProvider });
  }

  if (runMode === "always-on") {
    await installAndStartServiceForAlwaysOnMode();
  }

  console.log("");
  console.log("Setup complete.");
  console.log(`Config: ${configPath || resolveConfigPath()}`);
  console.log(`Workspace: ${nextConfig.defaults.workspace}`);
  console.log(`Model provider: ${nextConfig.defaults.modelProvider}`);
  console.log(`Ability profile: ${nextConfig.defaults.abilityProfile}`);
  console.log(`Interaction mode: ${nextConfig.defaults.interactionMode}`);
  console.log(`Run mode: ${nextConfig.defaults.runMode}`);
  console.log(`Telegram: ${nextConfig.channels.telegram.enabled ? "enabled" : "disabled"}`);
  console.log(`Auth provider: ${nextConfig.defaults.authProvider}`);
  console.log(
    `Context guard: ${nextConfig.defaults.contextGuardEnabled ? `enabled (${nextConfig.defaults.contextGuardThresholdPct}%)` : "disabled"}`,
  );
  console.log(
    `Marketplace skills: ${nextConfig.defaults.marketplaceSkillsEnabled ? "enabled" : "disabled"}`,
  );
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
  console.log("Run `kaizen onboard` anytime for the guided setup flow.");

  await launchKaizenAfterSetup(nextConfig, {
    autoStart,
  });
}
