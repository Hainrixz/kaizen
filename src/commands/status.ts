/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { readConfig } from "../config.js";
import { getKaizenStatusSnapshot } from "../runtime/snapshot.js";

export async function statusCommand() {
  const snapshot = await getKaizenStatusSnapshot();
  const config = readConfig();
  const installedProfile = config.missions?.[snapshot.abilityProfile];
  const marketplaceState = installedProfile?.marketplaceSkills ?? null;

  console.log("");
  console.log("Kaizen status");
  console.log(`Config: ${snapshot.configPath}`);
  console.log(`Workspace: ${snapshot.workspace}`);
  console.log(`Engine runner: ${snapshot.engineRunner}`);
  console.log(`Model provider: ${snapshot.modelProvider}`);
  if (snapshot.modelProvider === "local") {
    console.log(`Local runtime: ${snapshot.localRuntime}`);
  }
  console.log(`Ability profile: ${snapshot.abilityProfile}`);
  console.log(`Interaction mode: ${snapshot.interactionMode}`);
  console.log(`Run mode: ${snapshot.runMode}`);
  console.log(
    `Autonomy: ${snapshot.autonomy.enabled ? "enabled" : "disabled"} (${snapshot.autonomy.mode})`,
  );
  console.log(
    `Autonomy budget: ${snapshot.autonomy.freeRun.maxTurns} turns / ${snapshot.autonomy.freeRun.maxMinutes} minutes`,
  );
  console.log(`Autonomy runtime: ${snapshot.autonomy.runtime.running ? "active" : "idle"}`);
  console.log(`Access scope: ${snapshot.access.scope}`);
  console.log(`Allow paths: ${snapshot.access.allowPaths.join(", ") || "(none)"}`);
  console.log(`Auth provider: ${snapshot.authProvider}`);
  console.log(
    `Updates: ${config.updates?.enabled === false ? "disabled" : "enabled"} (${config.updates?.channel ?? "stable"}, every ${config.updates?.checkIntervalHours ?? 24}h)`,
  );
  console.log(`Update source: ${config.updates?.sourceRepo ?? "Hainrixz/kaizen"}`);
  console.log(
    `Context guard: ${snapshot.contextGuardEnabled ? `enabled (${snapshot.contextGuardThresholdPct}%)` : "disabled"}`,
  );
  console.log(
    `Marketplace skills: ${snapshot.marketplaceSkillsEnabled ? "enabled" : "disabled"}`,
  );
  console.log(`Telegram enabled: ${snapshot.telegram.enabled ? "yes" : "no"}`);
  console.log(`Telegram allowFrom: ${snapshot.telegram.allowFrom.join(", ") || "(empty)"}`);
  console.log(
    `Heartbeat: ${snapshot.heartbeat.enabled ? "enabled" : "disabled"} (${snapshot.heartbeat.intervalMs}ms, last tick ${snapshot.heartbeat.lastTickAt ?? "none"})`,
  );
  if (snapshot.heartbeat.lastError) {
    console.log(`Heartbeat last error: ${snapshot.heartbeat.lastError}`);
  }
  console.log(
    `Queue summary: ${snapshot.queue.summary.pending} pending, ${snapshot.queue.summary.running} running, ${snapshot.queue.summary.completed} completed, ${snapshot.queue.summary.failed} failed`,
  );
  console.log(
    `Service: ${snapshot.service.running ? "running" : "stopped"} (${snapshot.service.detail})`,
  );
  console.log(`Walkthrough: ${snapshot.profile.walkthroughFile}`);
  console.log(`Skills index: ${snapshot.profile.skillsIndexFile}`);
  console.log(`Marketplace skills catalog: ${snapshot.profile.marketplaceSkillsFile}`);
  if (marketplaceState?.syncedAt) {
    console.log(
      `Marketplace sync: ${marketplaceState.installedCount}/${marketplaceState.skillCount} installed, ${marketplaceState.failedCount} failed (${marketplaceState.syncedAt})`,
    );
  }
  console.log(`Memory file: ${snapshot.profile.memoryFile}`);
  console.log(`Last OAuth login: ${snapshot.lastOauthLoginAt ?? "not recorded"}`);
  console.log(
    `Profile installed: ${snapshot.profile.installed ? `yes (${snapshot.profile.installedAt})` : "no"}`,
  );
}
