/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { resolveKaizenHome } from "../../config.js";

type OffsetState = {
  version: number;
  updateOffset: number | null;
  updatedAt: string;
};

const STATE_VERSION = 1;

export function resolveTelegramOffsetStatePath(accountId = "default") {
  const safeAccountId = accountId.replace(/[^a-z0-9._-]/gi, "_") || "default";
  return path.join(
    resolveKaizenHome(),
    "state",
    "telegram",
    `update-offset-${safeAccountId}.json`,
  );
}

export function readTelegramUpdateOffset(accountId = "default") {
  const statePath = resolveTelegramOffsetStatePath(accountId);
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf8")) as OffsetState;
    if (!parsed || parsed.version !== STATE_VERSION) {
      return null;
    }
    if (parsed.updateOffset === null) {
      return null;
    }
    if (typeof parsed.updateOffset !== "number" || !Number.isFinite(parsed.updateOffset)) {
      return null;
    }
    return parsed.updateOffset;
  } catch {
    return null;
  }
}

export function writeTelegramUpdateOffset(accountId = "default", updateOffset: number) {
  const statePath = resolveTelegramOffsetStatePath(accountId);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const payload: OffsetState = {
    version: STATE_VERSION,
    updateOffset,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return statePath;
}

export function clearTelegramUpdateOffset(accountId = "default") {
  const statePath = resolveTelegramOffsetStatePath(accountId);
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}
