/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { buildContextGuardPromptBlock } from "./context-guard.js";

export type KaizenPromptParams = {
  workspace: string;
  abilityProfile: string;
  contextGuardEnabled: boolean;
  contextGuardThresholdPct: number;
  memoryPath: string;
};

function readTextFileIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
}

export function buildKaizenPrompt(params: KaizenPromptParams) {
  const {
    workspace,
    abilityProfile,
    contextGuardEnabled,
    contextGuardThresholdPct,
    memoryPath,
  } = params;

  const profileDir = path.join(workspace, ".kaizen", "profiles", abilityProfile);
  const profilePromptFile = path.join(profileDir, "SYSTEM_PROMPT.md");
  const walkthroughFile = path.join(profileDir, "WALKTHROUGH.md");
  const skillsIndexFile = path.join(profileDir, "SKILLS_INDEX.md");
  const designSkillsFile = path.join(profileDir, "DESIGN_SKILLS.md");
  const workflowFile = path.join(profileDir, "WORKFLOW.md");
  const outputTemplateFile = path.join(profileDir, "OUTPUT_TEMPLATE.md");
  const marketplaceSkillsFile = path.join(profileDir, "MARKETPLACE_SKILLS.md");

  const profilePromptContents = readTextFileIfExists(profilePromptFile);
  const walkthroughContents = readTextFileIfExists(walkthroughFile);
  const skillsIndexContents = readTextFileIfExists(skillsIndexFile);
  const designSkillsContents = readTextFileIfExists(designSkillsFile);
  const workflowContents = readTextFileIfExists(workflowFile);
  const outputTemplateContents = readTextFileIfExists(outputTemplateFile);
  const marketplaceSkillsContents = readTextFileIfExists(marketplaceSkillsFile);

  const promptSections: string[] = ["You are Kaizen."];
  const usedFiles: string[] = [];

  if (profilePromptContents) {
    promptSections.push(`Profile instructions loaded from ${profilePromptFile}:`);
    promptSections.push(profilePromptContents);
    usedFiles.push(profilePromptFile);
  } else {
    promptSections.push(
      `Stay focused on the ${abilityProfile} profile and ship production-ready web UI output.`,
    );
  }

  if (walkthroughContents) {
    promptSections.push(`Guided walkthrough loaded from ${walkthroughFile}:`);
    promptSections.push(walkthroughContents);
    usedFiles.push(walkthroughFile);
  }

  if (skillsIndexContents) {
    promptSections.push(`Skills index loaded from ${skillsIndexFile}:`);
    promptSections.push(skillsIndexContents);
    usedFiles.push(skillsIndexFile);
  }

  if (designSkillsContents) {
    promptSections.push(`Design skills guidance loaded from ${designSkillsFile}:`);
    promptSections.push(designSkillsContents);
    usedFiles.push(designSkillsFile);
  }

  if (workflowContents) {
    promptSections.push(`Workflow loaded from ${workflowFile}:`);
    promptSections.push(workflowContents);
    usedFiles.push(workflowFile);
  }

  if (outputTemplateContents) {
    promptSections.push(`Output template loaded from ${outputTemplateFile}:`);
    promptSections.push(outputTemplateContents);
    usedFiles.push(outputTemplateFile);
  }

  if (marketplaceSkillsContents) {
    promptSections.push(`Marketplace skills catalog loaded from ${marketplaceSkillsFile}:`);
    promptSections.push(marketplaceSkillsContents);
    usedFiles.push(marketplaceSkillsFile);
  }

  promptSections.push(
    buildContextGuardPromptBlock({
      enabled: contextGuardEnabled,
      thresholdPct: contextGuardThresholdPct,
      memoryPath,
    }),
  );

  return {
    prompt: promptSections.join("\n\n"),
    usedFiles,
  };
}
