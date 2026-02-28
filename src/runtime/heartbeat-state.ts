/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { resolveKaizenHome } from "../config.js";

const HEARTBEAT_STATE_VERSION = 1;

export type HeartbeatState = {
  version: number;
  heartbeatEnabled: boolean;
  lastTickAt: string | null;
  runtime: "manual" | "service";
  autonomyEnabled: boolean;
  activeRun: boolean;
  lastError: string | null;
  updatedAt: string;
};

function resolveHeartbeatStatusPath() {
  return path.join(resolveKaizenHome(), "state", "heartbeat", "status.json");
}

function nowIso() {
  return new Date().toISOString();
}

export function readHeartbeatState(): HeartbeatState {
  const fallback: HeartbeatState = {
    version: HEARTBEAT_STATE_VERSION,
    heartbeatEnabled: true,
    lastTickAt: null,
    runtime: "manual",
    autonomyEnabled: false,
    activeRun: false,
    lastError: null,
    updatedAt: nowIso(),
  };

  const filePath = resolveHeartbeatStatusPath();
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      version: HEARTBEAT_STATE_VERSION,
      heartbeatEnabled: Boolean(parsed?.heartbeatEnabled),
      lastTickAt:
        typeof parsed?.lastTickAt === "string" && parsed.lastTickAt.trim().length > 0
          ? parsed.lastTickAt
          : null,
      runtime: parsed?.runtime === "service" ? "service" : "manual",
      autonomyEnabled: Boolean(parsed?.autonomyEnabled),
      activeRun: Boolean(parsed?.activeRun),
      lastError:
        typeof parsed?.lastError === "string" && parsed.lastError.trim().length > 0
          ? parsed.lastError
          : null,
      updatedAt:
        typeof parsed?.updatedAt === "string" && parsed.updatedAt.trim().length > 0
          ? parsed.updatedAt
          : nowIso(),
    };
  } catch {
    return fallback;
  }
}

export function writeHeartbeatState(partialState: Partial<HeartbeatState>) {
  const current = readHeartbeatState();
  const next: HeartbeatState = {
    ...current,
    ...partialState,
    version: HEARTBEAT_STATE_VERSION,
    updatedAt: nowIso(),
  };
  const filePath = resolveHeartbeatStatusPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

