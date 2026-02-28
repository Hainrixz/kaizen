import { getKaizenVersion } from "../version.js";
import { fetchLatestStableRelease, normalizeSourceRepo } from "./github-releases.js";
import { readConfig } from "../config.js";
import { readUpdateCacheState, updateUpdateCacheState } from "./cache.js";
import type { KaizenUpdateCheckResult } from "./types.js";

const DEFAULT_CHECK_INTERVAL_HOURS = 24;

function normalizeVersion(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const withoutPrefix = trimmed.replace(/^v/i, "");
  const match = withoutPrefix.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return `${Number.parseInt(match[1] ?? "0", 10)}.${Number.parseInt(match[2] ?? "0", 10)}.${Number.parseInt(match[3] ?? "0", 10)}`;
}

function parseVersionTuple(rawValue: string) {
  const normalized = normalizeVersion(rawValue);
  if (!normalized) {
    return null;
  }
  const [major, minor, patch] = normalized.split(".").map((part) => Number.parseInt(part, 10));
  return {
    normalized,
    major,
    minor,
    patch,
  };
}

export function compareSemverVersions(left: string, right: string) {
  const parsedLeft = parseVersionTuple(left);
  const parsedRight = parseVersionTuple(right);
  if (!parsedLeft || !parsedRight) {
    return 0;
  }
  if (parsedLeft.major !== parsedRight.major) {
    return parsedLeft.major > parsedRight.major ? 1 : -1;
  }
  if (parsedLeft.minor !== parsedRight.minor) {
    return parsedLeft.minor > parsedRight.minor ? 1 : -1;
  }
  if (parsedLeft.patch !== parsedRight.patch) {
    return parsedLeft.patch > parsedRight.patch ? 1 : -1;
  }
  return 0;
}

function normalizeCheckIntervalHours(rawValue: unknown) {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return Math.max(1, Math.min(24 * 30, Math.round(rawValue)));
  }
  if (typeof rawValue === "string") {
    const parsed = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isNaN(parsed)) {
      return normalizeCheckIntervalHours(parsed);
    }
  }
  return DEFAULT_CHECK_INTERVAL_HOURS;
}

function isCacheFresh(lastCheckedAt: string | null, checkIntervalHours: number, nowMs: number) {
  if (!lastCheckedAt) {
    return false;
  }
  const parsed = Date.parse(lastCheckedAt);
  if (!Number.isFinite(parsed)) {
    return false;
  }
  const ageMs = nowMs - parsed;
  return ageMs >= 0 && ageMs < checkIntervalHours * 60 * 60 * 1000;
}

function buildResult(options: {
  currentVersion: string;
  latestVersion: string | null;
  latestTag: string | null;
  latestPublishedAt: string | null;
  checkedAt: string | null;
  error: string | null;
  source: "cache" | "remote" | "none";
  cache: ReturnType<typeof readUpdateCacheState>;
}): KaizenUpdateCheckResult {
  const updateAvailable =
    Boolean(options.latestVersion) &&
    compareSemverVersions(options.currentVersion, String(options.latestVersion)) < 0;

  return {
    currentVersion: options.currentVersion,
    latestVersion: options.latestVersion,
    latestTag: options.latestTag,
    latestPublishedAt: options.latestPublishedAt,
    updateAvailable,
    source: options.source,
    checkedAt: options.checkedAt,
    error: options.error,
    cache: options.cache,
  };
}

export async function checkForUpdate(
  options: {
    forceRemote?: boolean;
    config?: any;
  } = {},
): Promise<KaizenUpdateCheckResult> {
  const config = options.config ?? readConfig();
  const updates = config?.updates ?? {};
  const updatesEnabled = updates.enabled !== false;
  const checkIntervalHours = normalizeCheckIntervalHours(updates.checkIntervalHours);
  const sourceRepo = normalizeSourceRepo(updates.sourceRepo);
  const currentVersion = normalizeVersion(getKaizenVersion()) ?? getKaizenVersion();
  const now = new Date();
  const nowIso = now.toISOString();

  const cached = readUpdateCacheState();
  const cachedLatestVersion = normalizeVersion(cached.latestVersion);
  const cachedLatestTag = cached.latestTag;
  const cachedPublishedAt = cached.latestPublishedAt;

  if (!updatesEnabled) {
    return buildResult({
      currentVersion,
      latestVersion: cachedLatestVersion,
      latestTag: cachedLatestTag,
      latestPublishedAt: cachedPublishedAt,
      checkedAt: cached.lastCheckedAt,
      error: null,
      source: "none",
      cache: cached,
    });
  }

  const allowCached = !options.forceRemote;
  const freshCache = isCacheFresh(cached.lastCheckedAt, checkIntervalHours, now.getTime());
  if (allowCached && freshCache) {
    return buildResult({
      currentVersion,
      latestVersion: cachedLatestVersion,
      latestTag: cachedLatestTag,
      latestPublishedAt: cachedPublishedAt,
      checkedAt: cached.lastCheckedAt,
      error: cached.lastError,
      source: "cache",
      cache: cached,
    });
  }

  try {
    const latest = await fetchLatestStableRelease({
      repo: sourceRepo,
    });
    const normalizedLatestVersion = normalizeVersion(latest.version);
    const nextCache = updateUpdateCacheState({
      lastCheckedAt: nowIso,
      latestVersion: normalizedLatestVersion,
      latestTag: latest.tag,
      latestPublishedAt: latest.publishedAt,
      lastError: null,
    });

    return buildResult({
      currentVersion,
      latestVersion: normalizedLatestVersion,
      latestTag: latest.tag,
      latestPublishedAt: latest.publishedAt,
      checkedAt: nowIso,
      error: null,
      source: "remote",
      cache: nextCache,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nextCache = updateUpdateCacheState({
      lastCheckedAt: nowIso,
      lastError: message,
    });

    return buildResult({
      currentVersion,
      latestVersion: normalizeVersion(nextCache.latestVersion),
      latestTag: nextCache.latestTag,
      latestPublishedAt: nextCache.latestPublishedAt,
      checkedAt: nowIso,
      error: message,
      source: "cache",
      cache: nextCache,
    });
  }
}
