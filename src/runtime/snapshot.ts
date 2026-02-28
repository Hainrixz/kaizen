import path from "node:path";
import { readConfig, resolveConfigPath } from "../config.js";
import { resolveSessionMemoryPath } from "../context-guard.js";
import { resolveServiceManager } from "../service/manager.js";
import { getAutonomyRuntimeState, getQueueSummary } from "./autonomy-runner.js";
import { readHeartbeatState } from "./heartbeat-state.js";

export type KaizenStatusSnapshot = {
  configPath: string;
  workspace: string;
  engineRunner: string;
  modelProvider: string;
  localRuntime: string;
  abilityProfile: string;
  interactionMode: string;
  runMode: string;
  authProvider: string;
  lastOauthLoginAt: string | null;
  contextGuardEnabled: boolean;
  contextGuardThresholdPct: number;
  marketplaceSkillsEnabled: boolean;
  telegram: {
    enabled: boolean;
    tokenConfigured: boolean;
    allowFrom: string[];
    pollIntervalMs: number;
    longPollTimeoutSec: number;
  };
  service: {
    installed: boolean;
    running: boolean;
    detail: string;
    cachedStatus: string;
    riskAcceptedAt: string | null;
  };
  heartbeat: {
    enabled: boolean;
    intervalMs: number;
    lastTickAt: string | null;
    runtime: "manual" | "service";
    lastError: string | null;
  };
  autonomy: {
    enabled: boolean;
    mode: "queued" | "free-run";
    freeRun: {
      maxTurns: number;
      maxMinutes: number;
    };
    runtime: ReturnType<typeof getAutonomyRuntimeState>;
  };
  access: {
    scope: "workspace" | "workspace-plus" | "full";
    allowPaths: string[];
    fullAccessLastEnabledAt: string | null;
  };
  queue: {
    defaultWorkspaceHash: string | null;
    lastRunAt: string | null;
    summary: ReturnType<typeof getQueueSummary>;
  };
  profile: {
    installed: boolean;
    installedAt: string | null;
    walkthroughFile: string;
    skillsIndexFile: string;
    marketplaceSkillsFile: string;
    memoryFile: string;
  };
};

export async function getKaizenStatusSnapshot(): Promise<KaizenStatusSnapshot> {
  const config = readConfig();
  const heartbeatState = readHeartbeatState();
  const autonomyRuntime = getAutonomyRuntimeState();
  const queueSummary = getQueueSummary(config.defaults.workspace);
  const abilityProfile = config.defaults.abilityProfile;
  const installedProfile = config.missions?.[abilityProfile];

  const memoryFile = resolveSessionMemoryPath(config.defaults.workspace, abilityProfile);
  const walkthroughFile =
    installedProfile?.workspaceWalkthroughPath ??
    path.join(config.defaults.workspace, ".kaizen", "profiles", abilityProfile, "WALKTHROUGH.md");
  const skillsIndexFile =
    installedProfile?.workspaceSkillsIndexPath ??
    path.join(config.defaults.workspace, ".kaizen", "profiles", abilityProfile, "SKILLS_INDEX.md");
  const marketplaceSkillsFile =
    installedProfile?.workspaceMarketplaceSkillsPath ??
    path.join(config.defaults.workspace, ".kaizen", "profiles", abilityProfile, "MARKETPLACE_SKILLS.md");

  let serviceInstalled = Boolean(config.service.installed);
  let serviceRunning = false;
  let serviceDetail = `${config.service.lastKnownStatus} (cached)`;

  try {
    const manager = resolveServiceManager();
    const live = await manager.status();
    serviceInstalled = live.installed;
    serviceRunning = live.running;
    serviceDetail = live.detail;
  } catch {
    // unsupported platform or status lookup issue
  }

  return {
    configPath: resolveConfigPath(),
    workspace: config.defaults.workspace,
    engineRunner: config.engine?.runner ?? "codex",
    modelProvider: config.defaults.modelProvider,
    localRuntime: config.defaults.localRuntime,
    abilityProfile,
    interactionMode: config.defaults.interactionMode,
    runMode: config.defaults.runMode,
    authProvider: config.defaults.authProvider,
    lastOauthLoginAt: config.auth?.lastLoginAt ?? null,
    contextGuardEnabled: Boolean(config.defaults.contextGuardEnabled),
    contextGuardThresholdPct: Number(config.defaults.contextGuardThresholdPct ?? 65),
    marketplaceSkillsEnabled: Boolean(config.defaults.marketplaceSkillsEnabled),
    telegram: {
      enabled: Boolean(config.channels.telegram.enabled),
      tokenConfigured: Boolean(config.channels.telegram.botToken),
      allowFrom: [...(config.channels.telegram.allowFrom ?? [])],
      pollIntervalMs: Number(config.channels.telegram.pollIntervalMs ?? 1500),
      longPollTimeoutSec: Number(config.channels.telegram.longPollTimeoutSec ?? 25),
    },
    service: {
      installed: serviceInstalled,
      running: serviceRunning,
      detail: serviceDetail,
      cachedStatus: config.service.lastKnownStatus,
      riskAcceptedAt: config.service.riskAcceptedAt ?? null,
    },
    heartbeat: {
      enabled: Boolean(config.heartbeat?.enabled ?? true),
      intervalMs: Number(config.heartbeat?.intervalMs ?? 1500),
      lastTickAt: heartbeatState.lastTickAt ?? config.heartbeat?.lastTickAt ?? null,
      runtime: heartbeatState.runtime,
      lastError: heartbeatState.lastError,
    },
    autonomy: {
      enabled: Boolean(config.autonomy?.enabled),
      mode: config.autonomy?.mode === "free-run" ? "free-run" : "queued",
      freeRun: {
        maxTurns: Number(config.autonomy?.freeRun?.maxTurns ?? 5),
        maxMinutes: Number(config.autonomy?.freeRun?.maxMinutes ?? 20),
      },
      runtime: autonomyRuntime,
    },
    access: {
      scope: config.access?.scope === "full" ? "full" : config.access?.scope === "workspace-plus" ? "workspace-plus" : "workspace",
      allowPaths: [...(config.access?.allowPaths ?? [])],
      fullAccessLastEnabledAt: config.access?.fullAccessLastEnabledAt ?? null,
    },
    queue: {
      defaultWorkspaceHash: config.queue?.defaultWorkspaceHash ?? null,
      lastRunAt: config.queue?.lastRunAt ?? null,
      summary: queueSummary,
    },
    profile: {
      installed: Boolean(installedProfile?.installedAt),
      installedAt: installedProfile?.installedAt ?? null,
      walkthroughFile,
      skillsIndexFile,
      marketplaceSkillsFile,
      memoryFile,
    },
  };
}
