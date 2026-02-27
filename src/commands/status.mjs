/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { readConfig, resolveConfigPath } from "../config.mjs";

export async function statusCommand() {
  const config = readConfig();
  const activeProfile = config.defaults.abilityProfile;
  const installedProfile = config.missions?.[activeProfile];

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
  console.log(`Last OAuth login: ${config.auth?.lastLoginAt ?? "not recorded"}`);
  console.log(
    `Profile installed: ${installedProfile?.installedAt ? `yes (${installedProfile.installedAt})` : "no"}`,
  );
}
