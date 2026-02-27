/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { resolveKaizenHome } from "./config.mjs";

const OUTPUT_SIGNATURE = "# Scaffolded with the Project Builder by @soyEnriqueRocha x @tododeia";

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function writeTextFile(filePath, contents) {
  fs.writeFileSync(filePath, `${contents}\n`, "utf8");
}

function buildWebDesignSystemPrompt(params) {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Kaizen Web Design System Prompt",
    "",
    "You are Kaizen, a focused web design and landing-page build agent.",
    "Primary mission: create modern, high-converting web experiences.",
    "Keep outputs practical, visual, and implementation-ready.",
    "",
    "Rules:",
    "- prioritize layout, hierarchy, spacing, and typography quality",
    "- ship responsive desktop/mobile output by default",
    "- avoid backend complexity unless explicitly requested",
    "- prefer clear, brand-consistent UI decisions",
    "",
    `Model provider preset: ${params.modelProvider}`,
    `Local runtime preset: ${params.localRuntime}`,
  ].join("\n");
}

function buildWebDesignPackReadme(params) {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Kaizen Ability Pack: Web Design",
    "",
    "This profile focuses Kaizen on web design and landing-page execution.",
    "",
    `Ability profile: ${params.abilityProfile}`,
    `Installed at: ${params.installedAt}`,
    `Workspace: ${params.workspace}`,
    "",
    "Included:",
    "- system prompt tuned for UI/UX and frontend build outcomes",
    "- mission brief and output expectations",
    "- workspace-local context files for repeatable behavior",
  ].join("\n");
}

function buildWebDesignWorkspaceContext(params) {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Kaizen Workspace Context",
    "",
    "Active ability profile: web-design",
    "",
    "This workspace is configured for:",
    "- landing pages",
    "- UI design systems",
    "- frontend implementation",
    "",
    `Model provider: ${params.modelProvider}`,
    `Interaction mode: ${params.interactionMode}`,
    "",
    "If future profiles are installed, this file can be replaced or expanded.",
  ].join("\n");
}

export function installAbilityProfile(params) {
  const abilityProfile = params.abilityProfile ?? "web-design";
  const installedAt = new Date().toISOString();
  const workspace = path.resolve(params.workspace);
  const modelProvider = params.modelProvider ?? "openai-codex";
  const localRuntime = params.localRuntime ?? "ollama";
  const interactionMode = params.interactionMode ?? "terminal";

  if (abilityProfile !== "web-design") {
    throw new Error(`unsupported ability profile: ${abilityProfile}`);
  }

  const kaizenHome = resolveKaizenHome();
  const globalProfileDir = path.join(kaizenHome, "profiles", abilityProfile);
  const workspaceProfileDir = path.join(workspace, ".kaizen", "profiles", abilityProfile);

  ensureDir(globalProfileDir);
  ensureDir(workspaceProfileDir);

  writeTextFile(
    path.join(globalProfileDir, "README.md"),
    buildWebDesignPackReadme({
      abilityProfile,
      installedAt,
      workspace,
    }),
  );

  writeTextFile(
    path.join(globalProfileDir, "SYSTEM_PROMPT.md"),
    buildWebDesignSystemPrompt({
      modelProvider,
      localRuntime,
    }),
  );

  writeTextFile(
    path.join(workspaceProfileDir, "KAIZEN_PROFILE.md"),
    buildWebDesignWorkspaceContext({
      modelProvider,
      interactionMode,
    }),
  );

  writeTextFile(
    path.join(workspaceProfileDir, "SYSTEM_PROMPT.md"),
    buildWebDesignSystemPrompt({
      modelProvider,
      localRuntime,
    }),
  );

  return {
    abilityProfile,
    installedAt,
    globalProfileDir,
    workspaceProfileDir,
  };
}
