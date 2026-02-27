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
  normalizeInteractionMode,
  normalizeLocalRuntime,
  normalizeModelProvider,
  readConfig,
  resolveConfigPath,
  resolveWorkspacePath,
  writeConfig,
} from "../config.mjs";
import { authLoginCommand } from "./auth.mjs";
import { onboardCommand } from "./onboard.mjs";
import { installAbilityProfile } from "../mission-pack.mjs";

export async function setupCommand(options = {}) {
  const runWizard = Boolean(options.wizard);
  const runNonInteractiveWizard = Boolean(options.nonInteractive);

  if (runWizard || runNonInteractiveWizard) {
    await onboardCommand({
      nonInteractive: runNonInteractiveWizard,
      workspace: options.workspace,
      model: options.model,
      modelProvider: options.modelProvider,
      localRuntime: options.localRuntime,
      abilityProfile: options.abilityProfile,
      mission: options.mission,
      interaction: options.interaction,
      authProvider: options.authProvider,
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
  const installResult = installAbilityProfile({
    abilityProfile,
    workspace,
    modelProvider,
    localRuntime,
    interactionMode,
  });

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
  console.log("Run `kaizen onboard` anytime for the guided setup flow.");
}
