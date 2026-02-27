/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";

const OUTPUT_SIGNATURE = "# Scaffolded with the Project Builder by @soyEnriqueRocha x @tododeia";
const DEFAULT_CONTEXT_GUARD_THRESHOLD_PCT = 65;

type ContextGuardParams = {
  workspace: string;
  abilityProfile: string;
  thresholdPct?: number;
};

function normalizeThreshold(rawValue: unknown) {
  const fallback = DEFAULT_CONTEXT_GUARD_THRESHOLD_PCT;
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const rounded = Math.round(rawValue);
    if (rounded < 40) {
      return 40;
    }
    if (rounded > 90) {
      return 90;
    }
    return rounded;
  }
  return fallback;
}

function createMemoryTemplate(params: Required<ContextGuardParams>) {
  const now = new Date().toISOString();
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Kaizen Session Memory",
    "",
    `Ability profile: ${params.abilityProfile}`,
    `Context guard threshold: ${params.thresholdPct}%`,
    `Last updated: ${now}`,
    "",
    "## Project Goal",
    "-",
    "",
    "## Current State",
    "-",
    "",
    "## Decisions",
    "-",
    "",
    "## Constraints",
    "-",
    "",
    "## Changed Files",
    "-",
    "",
    "## Next Steps",
    "-",
    "",
    "## Last Compression Snapshot",
    "- summarize what got compressed and what must not be lost",
  ].join("\n");
}

export function resolveSessionMemoryPath(workspace: string, abilityProfile: string) {
  return path.join(workspace, ".kaizen", "memory", `${abilityProfile}.md`);
}

export function ensureSessionMemoryFile(params: ContextGuardParams) {
  const normalized: Required<ContextGuardParams> = {
    workspace: path.resolve(params.workspace),
    abilityProfile: params.abilityProfile || "web-design",
    thresholdPct: normalizeThreshold(params.thresholdPct),
  };
  const memoryPath = resolveSessionMemoryPath(
    normalized.workspace,
    normalized.abilityProfile,
  );
  const memoryDir = path.dirname(memoryPath);

  fs.mkdirSync(memoryDir, { recursive: true });
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, `${createMemoryTemplate(normalized)}\n`, "utf8");
  }

  return {
    memoryPath,
    thresholdPct: normalized.thresholdPct,
  };
}

export function buildContextGuardPromptBlock(params: {
  enabled: boolean;
  thresholdPct?: number;
  memoryPath: string;
}) {
  const thresholdPct = normalizeThreshold(params.thresholdPct);
  const lines = [
    "",
    "Context Guard Policy:",
    `- Persistent memory file: ${params.memoryPath}`,
  ];

  if (!params.enabled) {
    lines.push("- Context guard is disabled for automatic compression.");
    lines.push("- Still keep the memory file updated at major milestones.");
    return lines.join("\n");
  }

  lines.push(`- Context compression threshold: ${thresholdPct}% of the model context window.`);
  lines.push("- Track context usage estimates across the conversation.");
  lines.push(`- When estimated usage reaches ${thresholdPct}% or more, compress before continuing.`);
  lines.push("- Compression cycle:");
  lines.push("  1) Update the memory markdown with goal, current state, decisions, constraints, changed files, and next steps.");
  lines.push("  2) Keep only essential summary context in the active thread.");
  lines.push("  3) Continue from the condensed state and do not lose required constraints.");
  lines.push("- At the start of each session, read memory first and continue from it.");

  return lines.join("\n");
}

export function appendSessionMemorySnapshot(params: {
  memoryPath: string;
  userMessage: string;
  assistantSummary: string;
}) {
  const now = new Date().toISOString();
  const lines = [
    "",
    `### Turn Snapshot (${now})`,
    "",
    "User message:",
    params.userMessage || "(empty)",
    "",
    "Assistant summary:",
    params.assistantSummary || "(empty)",
  ];

  fs.mkdirSync(path.dirname(params.memoryPath), { recursive: true });
  fs.appendFileSync(params.memoryPath, `${lines.join("\n")}\n`, "utf8");
}
