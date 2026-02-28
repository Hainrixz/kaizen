import fs from "node:fs";
import path from "node:path";
import { resolveKaizenHome } from "../config.js";
import {
  createDefaultUpdateCacheState,
  type KaizenUpdateCacheState,
} from "./types.js";

function normalizeIsoString(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeVersionString(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCacheState(rawValue: unknown): KaizenUpdateCacheState {
  const fallback = createDefaultUpdateCacheState();
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return fallback;
  }

  const parsed = rawValue as Record<string, unknown>;
  return {
    lastCheckedAt: normalizeIsoString(parsed.lastCheckedAt),
    latestVersion: normalizeVersionString(parsed.latestVersion),
    latestTag: normalizeVersionString(parsed.latestTag),
    latestPublishedAt: normalizeIsoString(parsed.latestPublishedAt),
    lastNotifiedVersion: normalizeVersionString(parsed.lastNotifiedVersion),
    lastError: normalizeVersionString(parsed.lastError),
  };
}

export function resolveUpdateCachePath() {
  return path.join(resolveKaizenHome(), "state", "update", "status.json");
}

export function readUpdateCacheState(): KaizenUpdateCacheState {
  const cachePath = resolveUpdateCachePath();
  if (!fs.existsSync(cachePath)) {
    return createDefaultUpdateCacheState();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    return normalizeCacheState(parsed);
  } catch {
    return createDefaultUpdateCacheState();
  }
}

export function writeUpdateCacheState(nextState: KaizenUpdateCacheState) {
  const cachePath = resolveUpdateCachePath();
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  return cachePath;
}

export function updateUpdateCacheState(
  patch: Partial<KaizenUpdateCacheState>,
): KaizenUpdateCacheState {
  const current = readUpdateCacheState();
  const next = normalizeCacheState({
    ...current,
    ...patch,
  });
  writeUpdateCacheState(next);
  return next;
}

export function markVersionAsNotified(version: string) {
  return updateUpdateCacheState({
    lastNotifiedVersion: version,
  });
}
