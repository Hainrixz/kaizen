/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import path from "node:path";
import { readConfig, resolveConfigPath } from "../config.js";
import { resolveSessionMemoryPath } from "../context-guard.js";

export async function statusCommand() {
  const config = readConfig();
  const activeProfile = config.defaults.abilityProfile;
  const installedProfile = config.missions?.[activeProfile];
  const memoryFile = resolveSessionMemoryPath(config.defaults.workspace, activeProfile);
  const skillsIndexFile =
    installedProfile?.workspaceSkillsIndexPath ??
    path.join(
      config.defaults.workspace,
      ".kaizen",
      "profiles",
      activeProfile,
      "SKILLS_INDEX.md",
    );
  const walkthroughFile =
    installedProfile?.workspaceWalkthroughPath ??
    path.join(
      config.defaults.workspace,
      ".kaizen",
      "profiles",
      activeProfile,
      "WALKTHROUGH.md",
    );
  const marketplaceSkillsFile =
    installedProfile?.workspaceMarketplaceSkillsPath ??
    path.join(
      config.defaults.workspace,
      ".kaizen",
      "profiles",
      activeProfile,
      "MARKETPLACE_SKILLS.md",
    );
  const marketplaceState = installedProfile?.marketplaceSkills ?? null;

  console.log("");
  console.log("Kaizen status");
  console.log(`Config: ${resolveConfigPath()}`);
  console.log(`Workspace: ${config.defaults.workspace}`);
  console.log(`Model provider: ${config.defaults.modelProvider}`);
  if (config.defaults.modelProvider === "local") {
    console.log(`Local runtime: ${config.defaults.localRuntime}`);
  }
  console.log(`Ability profile: ${activeProfile}`);
  console.log(`Interaction mode: ${config.defaults.interactionMode}`);
  console.log(`Auth provider: ${config.defaults.authProvider}`);
  console.log(
    `Context guard: ${config.defaults.contextGuardEnabled ? `enabled (${config.defaults.contextGuardThresholdPct}%)` : "disabled"}`,
  );
  console.log(
    `Marketplace skills: ${config.defaults.marketplaceSkillsEnabled ? "enabled" : "disabled"}`,
  );
  console.log(`Walkthrough: ${walkthroughFile}`);
  console.log(`Skills index: ${skillsIndexFile}`);
  console.log(`Marketplace skills catalog: ${marketplaceSkillsFile}`);
  if (marketplaceState?.syncedAt) {
    console.log(
      `Marketplace sync: ${marketplaceState.installedCount}/${marketplaceState.skillCount} installed, ${marketplaceState.failedCount} failed (${marketplaceState.syncedAt})`,
    );
  }
  console.log(`Memory file: ${memoryFile}`);
  console.log(`Last OAuth login: ${config.auth?.lastLoginAt ?? "not recorded"}`);
  console.log(
    `Profile installed: ${installedProfile?.installedAt ? `yes (${installedProfile.installedAt})` : "no"}`,
  );
}
