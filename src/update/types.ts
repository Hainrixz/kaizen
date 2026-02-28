export type KaizenUpdateChannel = "stable";

export type KaizenLatestRelease = {
  tag: string;
  version: string;
  publishedAt: string | null;
};

export type KaizenUpdateCacheState = {
  lastCheckedAt: string | null;
  latestVersion: string | null;
  latestTag: string | null;
  latestPublishedAt: string | null;
  lastNotifiedVersion: string | null;
  lastError: string | null;
};

export type KaizenUpdateCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  latestTag: string | null;
  latestPublishedAt: string | null;
  updateAvailable: boolean;
  source: "cache" | "remote" | "none";
  checkedAt: string | null;
  error: string | null;
  cache: KaizenUpdateCacheState;
};

export function createDefaultUpdateCacheState(): KaizenUpdateCacheState {
  return {
    lastCheckedAt: null,
    latestVersion: null,
    latestTag: null,
    latestPublishedAt: null,
    lastNotifiedVersion: null,
    lastError: null,
  };
}
