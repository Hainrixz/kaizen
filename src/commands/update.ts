/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { applyLatestUpdate } from "../update/apply.js";
import { checkForUpdate } from "../update/checker.js";

function parseBoolean(rawValue: unknown, fallback: boolean) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function printUpdateCheckResult(result: Awaited<ReturnType<typeof checkForUpdate>>) {
  console.log("");
  console.log("Kaizen update check");
  console.log(`Current version: ${result.currentVersion}`);
  console.log(`Latest version: ${result.latestVersion ?? "unknown"}`);
  if (result.latestTag) {
    console.log(`Latest tag: ${result.latestTag}`);
  }
  if (result.latestPublishedAt) {
    console.log(`Published at: ${result.latestPublishedAt}`);
  }
  console.log(`Update available: ${result.updateAvailable ? "yes" : "no"}`);
  console.log(`Source: ${result.source}`);
  if (result.error) {
    console.log(`Last check note: ${result.error}`);
  }
}

export async function updateCommand(options: {
  check?: boolean;
  force?: boolean;
  noRestartService?: boolean;
} = {}) {
  const checkOnly = Boolean(options.check);
  const force = Boolean(options.force);
  const restartService = parseBoolean(options.noRestartService, false) ? false : true;

  if (checkOnly) {
    const result = await checkForUpdate({
      forceRemote: true,
    });
    printUpdateCheckResult(result);
    return result;
  }

  const checkResult = await checkForUpdate({
    forceRemote: true,
  });
  if (!checkResult.latestVersion || !checkResult.latestTag) {
    const detail = checkResult.error ? ` (${checkResult.error})` : "";
    throw new Error(`Unable to resolve latest stable release${detail}`);
  }

  if (!checkResult.updateAvailable && !force) {
    console.log("");
    console.log(`Kaizen is already up to date (${checkResult.currentVersion}).`);
    console.log(`Latest stable: ${checkResult.latestVersion} (${checkResult.latestTag})`);
    return {
      updated: false,
    };
  }

  console.log("");
  if (force && !checkResult.updateAvailable) {
    console.log(
      `Force update requested. Rebuilding current release (${checkResult.latestTag ?? checkResult.currentVersion}).`,
    );
  } else {
    console.log(
      `Updating Kaizen from ${checkResult.currentVersion} to ${checkResult.latestVersion ?? "latest"}...`,
    );
  }

  const result = await applyLatestUpdate({
    force,
    restartService,
  });

  if (!result.updated) {
    console.log("");
    console.log(`Kaizen is already up to date (${result.currentVersion}).`);
    return result;
  }

  console.log("");
  console.log("Kaizen update complete.");
  console.log(`Install directory: ${result.installDir}`);
  console.log(`Version: ${result.currentVersion} -> ${result.targetVersion ?? "unknown"}`);
  console.log(`Release tag: ${result.targetTag ?? "unknown"}`);
  if (result.serviceWasRunning && result.serviceRestarted) {
    console.log("Service: restarted (was running before update)");
  } else if (result.serviceWasRunning && result.serviceRestartSkipped) {
    console.log("Service: left stopped (--no-restart-service)");
  } else if (!result.serviceWasRunning) {
    console.log("Service: unchanged (was not running)");
  }
  console.log("Run `kaizen update --check` to verify update state.");

  return result;
}
