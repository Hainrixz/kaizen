/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { resolveKaizenHome } from "./config.js";

const INSTALL_METADATA_VERSION = 2;
const DEFAULT_REPO_URL = "https://github.com/Hainrixz/kaizen.git";
const DEFAULT_CHANNEL = "stable";

type ProfilePathConfig = {
  kind: "profile-block";
  profileFile: string;
  startMarker: string;
  endMarker: string;
  binDir: string;
};

type WindowsPathConfig = {
  kind: "windows-user-path";
  binDir: string;
};

type NonePathConfig = {
  kind: "none";
  binDir: string;
};

export type KaizenInstallPathConfig = ProfilePathConfig | WindowsPathConfig | NonePathConfig;

export type KaizenInstallMetadata = {
  version: number;
  platform: string;
  installDir: string;
  binDir: string;
  launcherPaths: string[];
  pathConfig: KaizenInstallPathConfig;
  installedAt: string;
  repoUrl: string;
  channel: "stable";
  installedVersion: string | null;
  installRef: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePathConfig(rawValue: unknown, fallbackBinDir: string): KaizenInstallPathConfig {
  if (!isObject(rawValue)) {
    return {
      kind: "none",
      binDir: fallbackBinDir,
    };
  }

  const kind = typeof rawValue.kind === "string" ? rawValue.kind.trim().toLowerCase() : "";
  const binDir =
    typeof rawValue.binDir === "string" && rawValue.binDir.trim().length > 0
      ? path.resolve(rawValue.binDir)
      : fallbackBinDir;

  if (kind === "profile-block") {
    const profileFile =
      typeof rawValue.profileFile === "string" && rawValue.profileFile.trim().length > 0
        ? path.resolve(rawValue.profileFile)
        : "";
    const startMarker =
      typeof rawValue.startMarker === "string" && rawValue.startMarker.trim().length > 0
        ? rawValue.startMarker
        : "# >>> kaizen path >>>";
    const endMarker =
      typeof rawValue.endMarker === "string" && rawValue.endMarker.trim().length > 0
        ? rawValue.endMarker
        : "# <<< kaizen path <<<";

    if (profileFile) {
      return {
        kind: "profile-block",
        profileFile,
        startMarker,
        endMarker,
        binDir,
      };
    }
  }

  if (kind === "windows-user-path") {
    return {
      kind: "windows-user-path",
      binDir,
    };
  }

  return {
    kind: "none",
    binDir,
  };
}

function normalizeInstallMetadata(parsed: unknown): KaizenInstallMetadata | null {
  if (!isObject(parsed)) {
    return null;
  }

  const installDir =
    typeof parsed.installDir === "string" && parsed.installDir.trim().length > 0
      ? path.resolve(parsed.installDir)
      : "";
  const binDir =
    typeof parsed.binDir === "string" && parsed.binDir.trim().length > 0
      ? path.resolve(parsed.binDir)
      : "";

  if (!installDir || !binDir) {
    return null;
  }

  const launcherPaths = Array.isArray(parsed.launcherPaths)
    ? parsed.launcherPaths
        .filter((entry) => typeof entry === "string" && entry.trim().length > 0)
        .map((entry) => path.resolve(String(entry)))
    : [];

  const normalizedLaunchers = [...new Set(launcherPaths)];
  const installedAt =
    typeof parsed.installedAt === "string" && parsed.installedAt.trim().length > 0
      ? parsed.installedAt
      : new Date().toISOString();
  const version =
    typeof parsed.version === "number" && Number.isFinite(parsed.version)
      ? Math.max(1, Math.trunc(parsed.version))
      : INSTALL_METADATA_VERSION;
  const platform =
    typeof parsed.platform === "string" && parsed.platform.trim().length > 0
      ? parsed.platform.trim()
      : process.platform;
  const repoUrl =
    typeof parsed.repoUrl === "string" && parsed.repoUrl.trim().length > 0
      ? parsed.repoUrl.trim()
      : DEFAULT_REPO_URL;
  const channel = "stable";
  const installedVersion =
    typeof parsed.installedVersion === "string" && parsed.installedVersion.trim().length > 0
      ? parsed.installedVersion.trim()
      : null;
  const installRef =
    typeof parsed.installRef === "string" && parsed.installRef.trim().length > 0
      ? parsed.installRef.trim()
      : null;

  return {
    version,
    platform,
    installDir,
    binDir,
    launcherPaths: normalizedLaunchers,
    pathConfig: normalizePathConfig(parsed.pathConfig, binDir),
    installedAt,
    repoUrl,
    channel,
    installedVersion,
    installRef,
  };
}

export function resolveInstallMetadataPath() {
  return path.join(resolveKaizenHome(), "install.json");
}

export function readInstallMetadata(): KaizenInstallMetadata | null {
  const metadataPath = resolveInstallMetadataPath();
  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    return normalizeInstallMetadata(parsed);
  } catch {
    return null;
  }
}

export function writeInstallMetadata(metadata: KaizenInstallMetadata) {
  const metadataPath = resolveInstallMetadataPath();
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return metadataPath;
}

export function createInstallMetadata(
  input: Omit<
    KaizenInstallMetadata,
    "version" | "platform" | "installedAt" | "repoUrl" | "channel" | "installedVersion" | "installRef"
  > & {
    version?: number;
    platform?: string;
    installedAt?: string;
    repoUrl?: string;
    channel?: "stable";
    installedVersion?: string | null;
    installRef?: string | null;
  },
): KaizenInstallMetadata {
  const installDir = path.resolve(input.installDir);
  const binDir = path.resolve(input.binDir);
  const launcherPaths = [...new Set(input.launcherPaths.map((entry) => path.resolve(entry)))];

  return {
    version:
      typeof input.version === "number" && Number.isFinite(input.version)
        ? Math.max(1, Math.trunc(input.version))
        : INSTALL_METADATA_VERSION,
    platform:
      typeof input.platform === "string" && input.platform.trim().length > 0
        ? input.platform.trim()
        : process.platform,
    installDir,
    binDir,
    launcherPaths,
    pathConfig: normalizePathConfig(input.pathConfig, binDir),
    installedAt:
      typeof input.installedAt === "string" && input.installedAt.trim().length > 0
        ? input.installedAt
        : new Date().toISOString(),
    repoUrl:
      typeof input.repoUrl === "string" && input.repoUrl.trim().length > 0
        ? input.repoUrl.trim()
        : DEFAULT_REPO_URL,
    channel: DEFAULT_CHANNEL,
    installedVersion:
      typeof input.installedVersion === "string" && input.installedVersion.trim().length > 0
        ? input.installedVersion.trim()
        : null,
    installRef:
      typeof input.installRef === "string" && input.installRef.trim().length > 0
        ? input.installRef.trim()
        : null,
  };
}
