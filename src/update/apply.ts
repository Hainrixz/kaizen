import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readConfig } from "../config.js";
import { createInstallMetadata, readInstallMetadata, writeInstallMetadata } from "../install-metadata.js";
import { resolveServiceManager, type KaizenServiceManager } from "../service/manager.js";
import { updateUpdateCacheState } from "./cache.js";
import { checkForUpdate, compareSemverVersions } from "./checker.js";
import { normalizeSourceRepo } from "./github-releases.js";

export type ApplyUpdateOptions = {
  force?: boolean;
  restartService?: boolean;
};

export type ApplyUpdateResult = {
  updated: boolean;
  currentVersion: string;
  targetVersion: string | null;
  targetTag: string | null;
  installDir: string;
  sourceRepo: string;
  serviceWasRunning: boolean;
  serviceRestarted: boolean;
  serviceRestartSkipped: boolean;
};

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

function commandExists(command: string) {
  const lookupCommand = process.platform === "win32" ? "where" : "which";
  const lookup = spawnSync(lookupCommand, [command], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return lookup.status === 0;
}

function runCommand(command: string, args: string[], options: { cwd?: string } = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw new Error(`${command} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const details = stderr || stdout || `${command} exited with status ${result.status}`;
    throw new Error(details);
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function assertUpdatePreflightTools() {
  const requiredTools = ["git", "node", "corepack"];
  for (const tool of requiredTools) {
    if (!commandExists(tool)) {
      throw new Error(`Required tool is missing: ${tool}`);
    }
  }
}

function assertManagedInstallDir(installDir: string) {
  const gitDir = path.join(installDir, ".git");
  if (!fs.existsSync(installDir) || !fs.statSync(installDir).isDirectory()) {
    throw new Error(`Install directory does not exist: ${installDir}`);
  }
  if (!fs.existsSync(gitDir)) {
    throw new Error(
      `Install directory is not a git checkout: ${installDir}. Reinstall Kaizen and retry.`,
    );
  }
}

function assertCleanGitWorktree(installDir: string) {
  const status = runCommand("git", ["-C", installDir, "status", "--porcelain"]);
  if (status.stdout.trim().length > 0) {
    throw new Error(
      "Install directory has local changes. Commit/stash them or reinstall before running `kaizen update`.",
    );
  }
}

function resolveServiceContext(): { manager: KaizenServiceManager | null; running: boolean } {
  try {
    const manager = resolveServiceManager();
    return {
      manager,
      running: false,
    };
  } catch {
    return {
      manager: null,
      running: false,
    };
  }
}

export async function applyLatestUpdate(
  options: ApplyUpdateOptions = {},
): Promise<ApplyUpdateResult> {
  const config = readConfig();
  const sourceRepo = normalizeSourceRepo(config?.updates?.sourceRepo);
  const restartService = options.restartService !== false;
  const force = Boolean(options.force);

  const metadata = readInstallMetadata();
  if (!metadata) {
    throw new Error(
      "Install metadata is missing (~/.kaizen/install.json). Re-run installer, then run `kaizen update` again.",
    );
  }

  const installDir = path.resolve(metadata.installDir);
  assertUpdatePreflightTools();
  assertManagedInstallDir(installDir);
  assertCleanGitWorktree(installDir);

  const checkResult = await checkForUpdate({
    forceRemote: true,
    config,
  });
  const currentVersion = checkResult.currentVersion;
  const targetVersion = normalizeVersion(checkResult.latestVersion);
  const targetTag = checkResult.latestTag;

  if (!targetVersion || !targetTag) {
    const fallback = checkResult.error ? ` (${checkResult.error})` : "";
    throw new Error(`Unable to resolve latest stable release${fallback}`);
  }

  const needsUpdate = compareSemverVersions(currentVersion, targetVersion) < 0;
  if (!needsUpdate && !force) {
    return {
      updated: false,
      currentVersion,
      targetVersion,
      targetTag,
      installDir,
      sourceRepo,
      serviceWasRunning: false,
      serviceRestarted: false,
      serviceRestartSkipped: false,
    };
  }

  const service = resolveServiceContext();
  let serviceWasRunning = false;
  let serviceRestarted = false;
  let serviceStoppedForUpdate = false;
  let serviceRestartSkipped = false;

  try {
    if (service.manager) {
      const currentStatus = await service.manager.status();
      serviceWasRunning = currentStatus.installed && currentStatus.running;
      if (serviceWasRunning) {
        await service.manager.stop();
        serviceStoppedForUpdate = true;
      }
    }

    runCommand("git", ["-C", installDir, "fetch", "--tags", "origin"]);
    runCommand("git", ["-C", installDir, "checkout", "-B", "kaizen-stable", `refs/tags/${targetTag}`]);
    runCommand("corepack", ["pnpm", "install", "--frozen-lockfile"], {
      cwd: installDir,
    });
    runCommand("corepack", ["pnpm", "build"], {
      cwd: installDir,
    });

    const nextMetadata = createInstallMetadata({
      ...metadata,
      installDir,
      binDir: metadata.binDir,
      launcherPaths: metadata.launcherPaths,
      pathConfig: metadata.pathConfig,
      repoUrl: metadata.repoUrl || `https://github.com/${sourceRepo}.git`,
      channel: "stable",
      installedVersion: targetVersion,
      installRef: targetTag,
      installedAt: metadata.installedAt,
      version: Math.max(2, metadata.version ?? 1),
      platform: metadata.platform,
    });
    writeInstallMetadata(nextMetadata);

    updateUpdateCacheState({
      latestVersion: targetVersion,
      latestTag: targetTag,
      lastError: null,
      lastNotifiedVersion: null,
    });

    if (serviceWasRunning && service.manager) {
      if (restartService) {
        await service.manager.start();
        serviceRestarted = true;
      } else {
        serviceRestartSkipped = true;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let recoveryNote = "";

    if (serviceStoppedForUpdate && serviceWasRunning && service.manager && restartService) {
      try {
        await service.manager.start();
        recoveryNote = " Service was restarted after update failure.";
      } catch (restartError) {
        const restartMessage =
          restartError instanceof Error ? restartError.message : String(restartError);
        recoveryNote = ` Service restart after failure also failed: ${restartMessage}`;
      }
    }

    throw new Error(`Update failed: ${message}${recoveryNote}`);
  }

  return {
    updated: true,
    currentVersion,
    targetVersion,
    targetTag,
    installDir,
    sourceRepo,
    serviceWasRunning,
    serviceRestarted,
    serviceRestartSkipped,
  };
}
