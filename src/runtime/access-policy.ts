/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveKaizenHome } from "../config.js";

export type AccessScope = "workspace" | "workspace-plus" | "full";

export type AccessPolicy = {
  scope: AccessScope;
  allowPaths: string[];
};

type FullAccessConsentRecord = {
  enabledAt: string;
  pid: number;
  host: string;
};

function normalizePath(targetPath: string) {
  if (targetPath.trim() === "~") {
    return os.homedir();
  }
  if (targetPath.trim().startsWith("~/")) {
    return path.join(os.homedir(), targetPath.trim().slice(2));
  }
  return path.resolve(targetPath);
}

function isPathWithin(targetPath: string, rootPath: string) {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedRoot = normalizePath(rootPath);
  if (normalizedTarget === normalizedRoot) {
    return true;
  }
  const relative = path.relative(normalizedRoot, normalizedTarget);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveFullAccessConsentPath() {
  return path.join(resolveKaizenHome(), "run", "full-access-consent.json");
}

export function assertPathAllowed(
  targetPath: string,
  policy: AccessPolicy,
  workspacePath: string,
) {
  const target = normalizePath(targetPath);
  const workspace = normalizePath(workspacePath);

  if (policy.scope === "full") {
    return true;
  }

  if (isPathWithin(target, workspace)) {
    return true;
  }

  if (policy.scope === "workspace-plus") {
    const allowPaths = Array.isArray(policy.allowPaths) ? policy.allowPaths : [];
    for (const entry of allowPaths) {
      if (isPathWithin(target, entry)) {
        return true;
      }
    }
  }

  throw new Error(
    `Access policy blocked path: ${target}. Scope is "${policy.scope}" and workspace is "${workspace}".`,
  );
}

export function writeFullAccessConsentMarker() {
  const markerPath = resolveFullAccessConsentPath();
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  const payload: FullAccessConsentRecord = {
    enabledAt: new Date().toISOString(),
    pid: process.pid,
    host: os.hostname(),
  };
  fs.writeFileSync(markerPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return markerPath;
}

export function readFullAccessConsentMarker(): FullAccessConsentRecord | null {
  const markerPath = resolveFullAccessConsentPath();
  if (!fs.existsSync(markerPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      enabledAt: typeof parsed.enabledAt === "string" ? parsed.enabledAt : new Date().toISOString(),
      pid: typeof parsed.pid === "number" ? parsed.pid : 0,
      host: typeof parsed.host === "string" ? parsed.host : "",
    };
  } catch {
    return null;
  }
}

export function clearFullAccessConsentMarker() {
  const markerPath = resolveFullAccessConsentPath();
  if (fs.existsSync(markerPath)) {
    fs.unlinkSync(markerPath);
    return true;
  }
  return false;
}

