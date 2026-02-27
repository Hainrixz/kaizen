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
  readConfig,
  resolveConfigPath,
  resolveWorkspacePath,
  writeConfig,
} from "../config.js";
import { authLoginCommand } from "./auth.js";
import { onboardCommand } from "./onboard.js";
import { installAbilityProfile } from "../mission-pack.js";
import { installMarketplaceSkillsForAbility } from "../skills-marketplace.js";

export async function setupCommand(options: any = {}) {
  const runWizard = Boolean(options.wizard);
  const runNonInteractiveWizard = Boolean(options.nonInteractive);

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
      authProvider: options.authProvider,
      contextGuardEnabled: options.contextGuardEnabled,
      contextGuardThresholdPct: options.contextGuardThresholdPct,
      marketplaceSkills: options.marketplaceSkills,
      forceMarketplaceSkills: options.forceMarketplaceSkills,
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
    defaults: {
      ...current.defaults,
      workspace,
      abilityProfile,
      mission: abilityProfile,
      modelProvider,
      localRuntime,
      interactionMode,
      authProvider,
      contextGuardEnabled,
      contextGuardThresholdPct,
      marketplaceSkillsEnabled,
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

  console.log("");
  console.log("Setup complete.");
  console.log(`Config: ${configPath || resolveConfigPath()}`);
  console.log(`Workspace: ${nextConfig.defaults.workspace}`);
  console.log(`Model provider: ${nextConfig.defaults.modelProvider}`);
  console.log(`Ability profile: ${nextConfig.defaults.abilityProfile}`);
  console.log(`Interaction mode: ${nextConfig.defaults.interactionMode}`);
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
}
