/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isCancel, text } from "@clack/prompts";
import { readConfig, resolveConfigPath, resolveKaizenHome } from "../config.js";
import { readInstallMetadata } from "../install-metadata.js";
import { serviceUninstallCommand } from "./service.js";

const PATH_START_MARKER = "# >>> kaizen path >>>";
const PATH_END_MARKER = "# <<< kaizen path <<<";
const UNINSTALL_CONFIRM_TEXT = "uninstall kaizen";

type UninstallMode = "minimal" | "standard" | "deep";
type StepStatus = "removed" | "skipped" | "failed";

type UninstallStep = {
  name: string;
  status: StepStatus;
  detail: string;
  critical: boolean;
};

type UninstallOptions = {
  mode?: string;
  yes?: boolean;
  pathCleanup?: boolean;
};

function normalizeMode(rawMode: unknown): UninstallMode {
  if (typeof rawMode !== "string" || rawMode.trim().length === 0) {
    return "standard";
  }
  const normalized = rawMode.trim().toLowerCase();
  if (normalized === "minimal" || normalized === "standard" || normalized === "deep") {
    return normalized;
  }
  return "standard";
}

function uniquePaths(paths: Array<string | null | undefined>): string[] {
  const values = new Set<string>();
  for (const rawPath of paths) {
    if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
      continue;
    }
    values.add(path.resolve(rawPath));
  }
  return [...values];
}

function resolveGlobalLauncherPaths(binDir?: string | null): string[] {
  const home = os.homedir();
  const detectedPaths: string[] = [];
  const lookupCommand = process.platform === "win32" ? "where" : "which";
  const lookup = spawnSync(lookupCommand, ["kaizen"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (lookup.status === 0) {
    const lines = `${lookup.stdout}\n${lookup.stderr}`
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    for (const line of lines) {
      detectedPaths.push(line);
    }
  }

  const defaults =
    process.platform === "win32"
      ? [
          path.join(home, ".kaizen", "bin", "kaizen.cmd"),
          path.join(home, ".kaizen", "bin", "kaizen.ps1"),
          binDir ? path.join(binDir, "kaizen.cmd") : null,
          binDir ? path.join(binDir, "kaizen.ps1") : null,
        ]
      : [
          path.join(home, ".local", "bin", "kaizen"),
          path.join(home, "bin", "kaizen"),
          "/usr/local/bin/kaizen",
          "/opt/homebrew/bin/kaizen",
          binDir ? path.join(binDir, "kaizen") : null,
        ];

  return uniquePaths([...detectedPaths, ...defaults]);
}

function isUnsafeDeletionTarget(targetPath: string) {
  const resolved = path.resolve(targetPath);
  const root = path.parse(resolved).root;
  if (resolved === root) {
    return true;
  }
  if (resolved === os.homedir()) {
    return true;
  }
  return false;
}

function removeFile(targetPath: string): UninstallStep {
  if (!fs.existsSync(targetPath)) {
    return {
      name: `launcher ${targetPath}`,
      status: "skipped",
      detail: "file not found",
      critical: false,
    };
  }

  try {
    fs.unlinkSync(targetPath);
    return {
      name: `launcher ${targetPath}`,
      status: "removed",
      detail: "deleted",
      critical: true,
    };
  } catch (error) {
    return {
      name: `launcher ${targetPath}`,
      status: "failed",
      detail: error instanceof Error ? error.message : String(error),
      critical: true,
    };
  }
}

function removeDirectory(targetPath: string, name: string): UninstallStep {
  if (!fs.existsSync(targetPath)) {
    return {
      name,
      status: "skipped",
      detail: "directory not found",
      critical: false,
    };
  }

  if (isUnsafeDeletionTarget(targetPath)) {
    return {
      name,
      status: "failed",
      detail: `blocked unsafe deletion target: ${targetPath}`,
      critical: true,
    };
  }

  try {
    fs.rmSync(targetPath, {
      recursive: true,
      force: false,
    });
    return {
      name,
      status: "removed",
      detail: `deleted ${targetPath}`,
      critical: true,
    };
  } catch (error) {
    return {
      name,
      status: "failed",
      detail: error instanceof Error ? error.message : String(error),
      critical: true,
    };
  }
}

function removeMarkerBlock(
  profileFile: string,
  startMarker: string,
  endMarker: string,
): { changed: boolean; error: string | null } {
  if (!fs.existsSync(profileFile)) {
    return {
      changed: false,
      error: null,
    };
  }

  try {
    const current = fs.readFileSync(profileFile, "utf8");
    const startIndex = current.indexOf(startMarker);
    if (startIndex < 0) {
      return {
        changed: false,
        error: null,
      };
    }

    const endIndex = current.indexOf(endMarker, startIndex);
    if (endIndex < 0) {
      return {
        changed: false,
        error: `found start marker but missing end marker in ${profileFile}`,
      };
    }

    const before = current.slice(0, startIndex).replace(/\s*$/, "");
    let after = current.slice(endIndex + endMarker.length);
    after = after.replace(/^\s*\n?/, "");

    const next = `${before}${before && after ? "\n\n" : ""}${after}`.replace(/\n{3,}/g, "\n\n");
    if (next === current) {
      return {
        changed: false,
        error: null,
      };
    }
    fs.writeFileSync(profileFile, next.endsWith("\n") ? next : `${next}\n`, "utf8");
    return {
      changed: true,
      error: null,
    };
  } catch (error) {
    return {
      changed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resolveProfileCandidates(preferredProfileFile?: string | null) {
  const home = os.homedir();
  return uniquePaths([
    preferredProfileFile ?? null,
    path.join(home, ".zshrc"),
    path.join(home, ".bashrc"),
    path.join(home, ".bash_profile"),
    path.join(home, ".profile"),
    path.join(home, ".config", "fish", "config.fish"),
  ]);
}

function escapePowerShell(value: string) {
  return value.replace(/'/g, "''");
}

function removeWindowsUserPathEntry(binDir: string): { changed: boolean; error: string | null } {
  const script = `
$target = '${escapePowerShell(binDir)}'
$current = [Environment]::GetEnvironmentVariable("Path", "User")
if ([string]::IsNullOrWhiteSpace($current)) {
  Write-Output "unchanged"
  exit 0
}
$targetNormalized = $target.Trim().TrimEnd("\\").ToLowerInvariant()
$items = $current.Split(";") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$filtered = @()
$removed = $false
foreach ($item in $items) {
  $normalized = $item.Trim().TrimEnd("\\").ToLowerInvariant()
  if ($normalized -eq $targetNormalized) {
    $removed = $true
  } else {
    $filtered += $item
  }
}
if ($removed) {
  [Environment]::SetEnvironmentVariable("Path", ($filtered -join ";"), "User")
  Write-Output "updated"
} else {
  Write-Output "unchanged"
}
`;

  const candidates = ["powershell", "pwsh"];
  for (const command of candidates) {
    const result = spawnSync(command, ["-NoProfile", "-Command", script], {
      encoding: "utf8",
      shell: process.platform === "win32",
    });

    if (result.error) {
      continue;
    }

    if (result.status !== 0) {
      const message =
        result.stderr?.trim() ||
        result.stdout?.trim() ||
        `${command} exited with status ${result.status}`;
      return {
        changed: false,
        error: message,
      };
    }

    const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
    return {
      changed: output.includes("updated"),
      error: null,
    };
  }

  return {
    changed: false,
    error: "PowerShell executable not found for user PATH update.",
  };
}

async function confirmUninstall(options: { yes: boolean; mode: UninstallMode }) {
  if (options.yes) {
    return true;
  }

  console.log("");
  console.log("Type confirmation required.");
  console.log(`Enter '${UNINSTALL_CONFIRM_TEXT}' to continue (${options.mode} mode).`);

  const typed = await text({
    message: "Confirmation text",
    placeholder: UNINSTALL_CONFIRM_TEXT,
  });

  if (isCancel(typed)) {
    console.log("");
    console.log("Kaizen uninstall cancelled.");
    return false;
  }

  const normalized = String(typed ?? "").trim().toLowerCase();
  if (normalized !== UNINSTALL_CONFIRM_TEXT) {
    console.log("");
    console.log("Confirmation text did not match. Uninstall aborted.");
    return false;
  }

  return true;
}

function printPreflightSummary(summary: {
  mode: UninstallMode;
  launcherPaths: string[];
  installDirs: string[];
  kaizenHome: string;
  workspaceMetaPath: string | null;
  pathCleanup: boolean;
}) {
  console.log("");
  console.log("Kaizen uninstall preflight");
  console.log(`Mode: ${summary.mode}`);
  console.log("This operation only removes Kaizen runtime/config artifacts.");
  console.log("Project source files are not removed.");

  if (summary.launcherPaths.length > 0) {
    console.log("Launcher targets:");
    for (const launcherPath of summary.launcherPaths) {
      console.log(`- ${launcherPath}`);
    }
  }

  if (summary.mode !== "minimal") {
    if (summary.installDirs.length > 0) {
      console.log("Install directories:");
      for (const installDir of summary.installDirs) {
        console.log(`- ${installDir}`);
      }
    }
    console.log(`Kaizen home: ${summary.kaizenHome}`);
  }

  if (summary.mode === "deep") {
    console.log(`Workspace metadata: ${summary.workspaceMetaPath ?? "(not found)"}`);
  }

  console.log(`PATH cleanup: ${summary.pathCleanup ? "enabled" : "disabled"}`);
}

function printSummary(steps: UninstallStep[]) {
  console.log("");
  console.log("Kaizen uninstall summary");
  for (const step of steps) {
    console.log(`- [${step.status}] ${step.name}: ${step.detail}`);
  }
}

export async function uninstallCommand(options: UninstallOptions = {}) {
  const mode = normalizeMode(options.mode);
  const yes = Boolean(options.yes);
  const pathCleanup = options.pathCleanup !== false;

  const metadata = readInstallMetadata();
  const configPath = resolveConfigPath();
  const hasConfigFile = fs.existsSync(configPath);
  const config = hasConfigFile ? readConfig() : null;
  const kaizenHome = resolveKaizenHome();
  const fallbackInstallDir = path.join(kaizenHome, "agent");
  const installDirs = uniquePaths([metadata?.installDir, fallbackInstallDir]);
  const launcherPaths = uniquePaths([
    ...(metadata?.launcherPaths ?? []),
    ...resolveGlobalLauncherPaths(metadata?.binDir),
  ]);
  const workspaceMetaPath =
    mode === "deep" && config?.defaults?.workspace
      ? path.join(config.defaults.workspace, ".kaizen")
      : null;

  printPreflightSummary({
    mode,
    launcherPaths,
    installDirs,
    kaizenHome,
    workspaceMetaPath,
    pathCleanup,
  });

  const confirmed = await confirmUninstall({ yes, mode });
  if (!confirmed) {
    return false;
  }

  const steps: UninstallStep[] = [];

  try {
    await serviceUninstallCommand();
    steps.push({
      name: "service",
      status: "removed",
      detail: "service uninstall command executed",
      critical: false,
    });
  } catch (error) {
    steps.push({
      name: "service",
      status: "skipped",
      detail: error instanceof Error ? error.message : String(error),
      critical: false,
    });
  }

  for (const launcherPath of launcherPaths) {
    steps.push(removeFile(launcherPath));
  }

  if (pathCleanup) {
    if (process.platform === "win32") {
      const winBinDir = metadata?.binDir ?? path.join(os.homedir(), ".kaizen", "bin");
      const pathResult = removeWindowsUserPathEntry(winBinDir);
      steps.push({
        name: "windows user PATH cleanup",
        status: pathResult.error ? "failed" : pathResult.changed ? "removed" : "skipped",
        detail: pathResult.error ?? (pathResult.changed ? `removed ${winBinDir}` : "entry not found"),
        critical: false,
      });
    } else {
      const pathConfig = metadata?.pathConfig;
      const startMarker =
        pathConfig?.kind === "profile-block" ? pathConfig.startMarker : PATH_START_MARKER;
      const endMarker = pathConfig?.kind === "profile-block" ? pathConfig.endMarker : PATH_END_MARKER;
      const profiles = resolveProfileCandidates(
        pathConfig?.kind === "profile-block" ? pathConfig.profileFile : null,
      );

      let removedAnyProfile = false;
      let profileError = "";
      for (const profile of profiles) {
        const result = removeMarkerBlock(profile, startMarker, endMarker);
        if (result.error) {
          profileError = profileError || result.error;
          continue;
        }
        if (result.changed) {
          removedAnyProfile = true;
        }
      }

      steps.push({
        name: "shell profile PATH cleanup",
        status: profileError ? "failed" : removedAnyProfile ? "removed" : "skipped",
        detail: profileError || (removedAnyProfile ? "removed installer PATH block" : "marker block not found"),
        critical: false,
      });
    }
  } else {
    steps.push({
      name: "PATH cleanup",
      status: "skipped",
      detail: "disabled by --no-path-cleanup",
      critical: false,
    });
    console.log("");
    console.log("Manual PATH cleanup may still be needed.");
    if (process.platform === "win32") {
      console.log("Remove Kaizen bin path from your User PATH if still present.");
    } else {
      console.log("Remove the '# >>> kaizen path >>>' block from your shell profile.");
    }
  }

  if (mode !== "minimal") {
    for (const installDir of installDirs) {
      steps.push(removeDirectory(installDir, `install directory ${installDir}`));
    }
    steps.push(removeDirectory(kaizenHome, `Kaizen home ${kaizenHome}`));
  }

  if (mode === "deep") {
    if (workspaceMetaPath) {
      steps.push(removeDirectory(workspaceMetaPath, `workspace metadata ${workspaceMetaPath}`));
    } else {
      steps.push({
        name: "workspace metadata",
        status: "skipped",
        detail: "config workspace not found; no workspace metadata target",
        critical: false,
      });
    }
  }

  printSummary(steps);

  const criticalFailures = steps.filter((step) => step.status === "failed" && step.critical);
  if (criticalFailures.length > 0) {
    console.log("");
    console.log(`Kaizen uninstall finished with ${criticalFailures.length} critical failure(s).`);
    process.exitCode = 1;
    return false;
  }

  console.log("");
  console.log("Kaizen uninstall complete.");
  return true;
}
