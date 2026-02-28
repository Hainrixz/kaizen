import type { KaizenLatestRelease } from "./types.js";

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_SOURCE_REPO = "Hainrixz/kaizen";

type GithubLatestReleasePayload = {
  tag_name?: unknown;
  published_at?: unknown;
  prerelease?: unknown;
  draft?: unknown;
};

function normalizeReleaseVersion(rawValue: unknown) {
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

function normalizeReleaseTag(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePublishedAt(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return null;
  }
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSourceRepo(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return DEFAULT_SOURCE_REPO;
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return DEFAULT_SOURCE_REPO;
  }
  return trimmed;
}

export async function fetchLatestStableRelease(options: {
  repo?: string;
  signal?: AbortSignal;
} = {}): Promise<KaizenLatestRelease> {
  const repo = normalizeSourceRepo(options.repo);
  const url = `${GITHUB_API_BASE}/repos/${repo}/releases/latest`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "kaizen-agent-updater",
    },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed (${response.status} ${response.statusText}).`);
  }

  let payload: GithubLatestReleasePayload | null = null;
  try {
    payload = (await response.json()) as GithubLatestReleasePayload;
  } catch {
    payload = null;
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("GitHub release response was invalid.");
  }

  const prerelease = payload.prerelease === true;
  const draft = payload.draft === true;
  if (prerelease || draft) {
    throw new Error("Latest release is not a stable published release.");
  }

  const tag = normalizeReleaseTag(payload.tag_name);
  if (!tag) {
    throw new Error("Latest release tag was missing.");
  }

  const version = normalizeReleaseVersion(tag);
  if (!version) {
    throw new Error(`Latest release tag is not a stable semver: ${tag}`);
  }

  return {
    tag,
    version,
    publishedAt: normalizePublishedAt(payload.published_at),
  };
}
