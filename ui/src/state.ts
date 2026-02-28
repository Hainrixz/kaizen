export type UiBootstrap = {
  version: string;
  sessionId: string;
  workspace: string;
  abilityProfile: string;
  modelProvider: string;
  localRuntime: string;
  interactionMode: string;
  runMode: string;
  theme: {
    name: string;
    mode: "light" | "dark";
    primary: string;
    accent: string;
  };
};

export type UiThemeMode = "dark" | "light";
export type UiDensity = "comfortable" | "compact";

export type UiClientPreferences = {
  themeMode: UiThemeMode;
  uiDensity: UiDensity;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  runId?: string | null;
};

export type ChatHistoryPayload = {
  sessionId: string;
  workspace: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  sessions: Array<{
    sessionId: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
  }>;
  activeSessionId: string;
};

export type RuntimeSnapshot = {
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
    runtime: {
      running: boolean;
      mode: "queued" | "free-run" | null;
      startedAt: string | null;
      workspace: string | null;
      turnsCompleted: number;
      maxTurns: number;
      maxMinutes: number;
      stopRequested: boolean;
      activeTaskId: string | null;
      lockFile: string;
      activeRun: boolean;
    };
  };
  access: {
    scope: "workspace" | "workspace-plus" | "full";
    allowPaths: string[];
    fullAccessLastEnabledAt: string | null;
  };
  queue: {
    defaultWorkspaceHash: string | null;
    lastRunAt: string | null;
    summary: {
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
    };
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

export type ServiceStatus = {
  installed: boolean;
  running: boolean;
  detail: string;
};

export type TelegramStatus = {
  enabled: boolean;
  botTokenConfigured: boolean;
  allowFrom: string[];
  pollIntervalMs: number;
  longPollTimeoutSec: number;
  botUsername: string | null;
  testSent?: boolean;
};

export type AuthStatus = {
  provider: string;
  ok: boolean;
  lastLoginAt: string | null;
  errorMessage: string | null;
};

export type AutonomyStatus = {
  config: {
    enabled: boolean;
    mode: "queued" | "free-run";
    freeRun: {
      maxTurns: number;
      maxMinutes: number;
    };
  };
  access: {
    scope: "workspace" | "workspace-plus" | "full";
    allowPaths: string[];
    fullAccessLastEnabledAt: string | null;
  };
  runtime: {
    running: boolean;
    mode: "queued" | "free-run" | null;
    startedAt: string | null;
    workspace: string | null;
    turnsCompleted: number;
    maxTurns: number;
    maxMinutes: number;
    stopRequested: boolean;
    activeTaskId: string | null;
    lockFile: string;
    activeRun: boolean;
  };
  queueSummary: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
};

export type QueueTask = {
  id: string;
  title: string;
  prompt: string;
  workspace: string;
  createdAt: string;
  updatedAt: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  lastError: string | null;
  lastResult: string | null;
};
