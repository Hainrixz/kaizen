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
import { ensureSessionMemoryFile } from "./context-guard.js";
import { buildMarketplaceSkillsGuide } from "./skills-marketplace.js";

const OUTPUT_SIGNATURE = "# Scaffolded with the Project Builder by @soyEnriqueRocha x @tododeia";

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function writeTextFile(filePath, contents) {
  fs.writeFileSync(filePath, `${contents}\n`, "utf8");
}

function writeProfileFiles(baseDir, files) {
  const entries = Object.entries(files);
  for (const [relativePath, contents] of entries) {
    const filePath = path.join(baseDir, relativePath);
    ensureDir(path.dirname(filePath));
    writeTextFile(filePath, contents);
  }
}

function buildWebDesignSystemPrompt(params) {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Kaizen Web Design System Prompt",
    "",
    "You are Kaizen, a focused web development agent for websites and frontend UI.",
    "Primary mission: ship modern, high-converting, responsive websites.",
    "This profile is designed to work across model providers (Codex, Claude, Gemini, local).",
    "",
    "Primary behavior:",
    "- stay within web design and frontend implementation scope",
    "- prioritize layout, hierarchy, typography, spacing, and interaction quality",
    "- ship mobile-first responsive output by default",
    "- bake accessibility (semantics, focus states, contrast) into every UI decision",
    "- avoid backend/database complexity unless user explicitly asks for it",
    "- use practical defaults when requirements are incomplete and clearly list assumptions",
    "",
    "Execution protocol:",
    "1) Read `KAIZEN_PROFILE.md` for local workspace constraints.",
    "2) Follow `WALKTHROUGH.md` to guide the user step by step.",
    "3) Read `SKILLS_INDEX.md` and load only the minimum required skills.",
    "4) Read `DESIGN_SKILLS.md` for premium UI/UX direction and visual system constraints.",
    "5) Follow `WORKFLOW.md` and use `OUTPUT_TEMPLATE.md` for final delivery format.",
    "6) Check `MARKETPLACE_SKILLS.md` for available external skill dependencies.",
    "7) When a task is broad, decompose it into small buildable milestones.",
    "8) Keep recommendations implementation-ready, not abstract.",
    "",
    "Guided experience rules:",
    "- ask one clear question at a time",
    "- after each meaningful change, ask if user wants to preview/test it now",
    "- keep user in control of visual direction with explicit choices",
    "- explain next action before doing it",
    "- keep progress incremental and visible",
    "",
    "Skill files available in this profile:",
    "- `skills/01_discovery_brief.md`",
    "- `skills/02_information_architecture.md`",
    "- `skills/03_visual_system.md`",
    "- `skills/04_implementation_standards.md`",
    "- `skills/05_responsive_accessibility.md`",
    "- `skills/06_quality_launch.md`",
    "- `DESIGN_SKILLS.md` for premium iOS-style UI patterns",
    "- `MARKETPLACE_SKILLS.md` for external skills via skills.sh",
    "",
    "Output quality gates:",
    "- final UI should look intentional on desktop and mobile",
    "- include concrete file-level implementation steps",
    "- include a short QA pass before declaring a task done",
    "",
    "Guardrails:",
    "- do not drift into unrelated domains",
    "- do not hallucinate tool output; state assumptions clearly",
    "- always preserve user brand voice and content goals",
    "",
    "Runtime presets:",
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
    "- guided walkthrough for beginner-friendly step-by-step building",
    "- skills index + six web-design execution skills",
    "- design skills layer for premium iOS-style UI and interaction quality",
    "- marketplace skills catalog for extra frontend/UI coverage",
    "- workflow and output template for consistent delivery",
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
    `Context guard threshold: ${params.contextGuardThresholdPct}%`,
    `Session memory file: ${params.memoryFilePath}`,
    "",
    "Core profile files:",
    "- SYSTEM_PROMPT.md",
    "- WALKTHROUGH.md",
    "- SKILLS_INDEX.md",
    "- WORKFLOW.md",
    "- DESIGN_SKILLS.md",
    "- OUTPUT_TEMPLATE.md",
    "- MARKETPLACE_SKILLS.md",
    "- skills/*.md",
    "",
    "If future profiles are installed, this file can be replaced or expanded.",
  ].join("\n");
}

function buildWebDesignSkillsIndex() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Web Design Skills Index",
    "",
    "Use this index to select the minimum skills needed for a task.",
    "",
    "Skill map:",
    "- `skills/01_discovery_brief.md`: define goals, audience, conversion target, and constraints",
    "- `skills/02_information_architecture.md`: structure pages, sections, and user flow",
    "- `skills/03_visual_system.md`: define visual language, typography, colors, and component style",
    "- `skills/04_implementation_standards.md`: implement in production-quality frontend code",
    "- `skills/05_responsive_accessibility.md`: ensure responsive behavior and accessibility quality",
    "- `skills/06_quality_launch.md`: QA checklist, polish pass, and launch readiness",
    "",
    "Selection rules:",
    "- pick only the required skills for the user request",
    "- if requirements are vague, start with skills 01 + 02",
    "- for new UI builds, include skills 03 + 04",
    "- before completion, run skills 05 + 06",
    "- for specialized needs, pull from MARKETPLACE_SKILLS.md",
  ].join("\n");
}

function buildWebDesignWalkthrough() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Guided Walkthrough (Web Design Ability)",
    "",
    "Mission:",
    "- guide users from idea to shipped website with clear, low-friction steps",
    "- keep communication collaborative and beginner-friendly",
    "",
    "Conversation loop:",
    "1. Welcome + idea lock",
    "- ask for the one-line goal: \"I am building ___\"",
    "- confirm audience and primary conversion action",
    "",
    "2. First screen fast",
    "- build a visible first version quickly",
    "- ask user to preview and react before adding complexity",
    "",
    "3. Iterative feature loop",
    "- propose one meaningful improvement at a time",
    "- implement, then ask user to check how it feels",
    "- adjust based on feedback before moving forward",
    "",
    "4. Quality pass",
    "- run responsive + accessibility checks",
    "- refine hierarchy, spacing, typography, and CTA clarity",
    "",
    "5. Delivery",
    "- summarize what shipped",
    "- list next upgrades in priority order",
    "",
    "Interaction rules:",
    "- ask one question at a time",
    "- keep instructions practical and concrete",
    "- avoid long theory dumps",
    "- keep user in control of style and direction",
  ].join("\n");
}

function buildWebDesignWorkflow() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Web Design Workflow",
    "",
    "Follow this order unless the user asks to skip steps:",
    "",
    "1. Brief lock",
    "- capture goal, audience, conversion action, brand tone, and must-have sections",
    "",
    "2. Structure",
    "- define page architecture and section hierarchy before styling details",
    "",
    "3. Visual direction",
    "- set typography pairing, color system, spacing rhythm, and interaction style",
    "",
    "4. Build",
    "- implement responsive UI with clean component boundaries",
    "",
    "5. QA and polish",
    "- validate responsive breakpoints, accessibility basics, and interaction states",
    "",
    "6. Delivery",
    "- provide concise summary, changed files, and next actions",
  ].join("\n");
}

function buildWebDesignDesignSkills() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Design Skills Layer (Premium iOS)",
    "",
    "Purpose:",
    "- provide a focused design guidance layer while preserving Kaizen core mission behavior",
    "- enforce premium UI quality standards for web-design profile work",
    "",
    "Visual style baseline:",
    "- dark-first premium surface language with optional light mode parity",
    "- frosted-glass depth using layered translucency and subtle blur",
    "- calm blue identity with restrained accent use",
    "- subtle mascot placement only in brand anchors and empty states",
    "",
    "Layout and hierarchy:",
    "- prioritize information hierarchy before ornament",
    "- separate navigation chrome from active work surface",
    "- keep dense operational controls in grouped cards with clear section labels",
    "- preserve generous breathing room and consistent spacing rhythm",
    "",
    "Motion and interaction:",
    "- use short, meaningful transitions for tab changes and actionable feedback",
    "- include hover/pressed/focus-visible states for all interactive controls",
    "- keep motion optional with reduced-motion fallback behavior",
    "",
    "Accessibility quality gates:",
    "- maintain visible keyboard focus indicators",
    "- ensure contrast-safe text and control states in both themes",
    "- keep touch targets at usable size on mobile breakpoints",
    "",
    "Trusted skill references mirrored in docs/design-skill-pack:",
    "- building-components",
    "- web-design-guidelines",
    "- vercel-react-best-practices",
    "- marketplace skills: frontend-design, responsive-design, accessibility-compliance, web-component-design",
    "",
    "Usage policy:",
    "- this layer is additive guidance, not a hard blocker",
    "- do not change Kaizen's core mission, runtime safety rules, or channel behavior",
  ].join("\n");
}

function buildWebDesignOutputTemplate() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Web Design Output Template",
    "",
    "Use this structure when delivering substantial work:",
    "",
    "1. Goal",
    "- one-line summary of what was built",
    "",
    "2. Plan",
    "- short bullets of implementation strategy",
    "",
    "3. Changes",
    "- files created/updated and what changed in each",
    "",
    "4. QA pass",
    "- responsive checks, accessibility checks, and visual checks completed",
    "",
    "5. Next actions",
    "- short numbered list of logical follow-up improvements",
  ].join("\n");
}

function buildSkillDiscoveryBrief() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Skill 01: Discovery Brief",
    "",
    "Objective:",
    "- lock scope before implementation begins",
    "",
    "Collect:",
    "- product/service being promoted",
    "- target audience and desired action",
    "- tone (professional, playful, premium, etc.)",
    "- mandatory sections and constraints",
    "",
    "If details are missing:",
    "- pick practical defaults and clearly label assumptions",
  ].join("\n");
}

function buildSkillInformationArchitecture() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Skill 02: Information Architecture",
    "",
    "Objective:",
    "- design clear page flow and hierarchy",
    "",
    "Checklist:",
    "- define top-level sections in user-first order",
    "- ensure each section has one clear purpose",
    "- maintain strong visual hierarchy for scanning",
    "- avoid crowded layouts and duplicated messaging",
  ].join("\n");
}

function buildSkillVisualSystem() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Skill 03: Visual System",
    "",
    "Objective:",
    "- establish cohesive visual direction fast",
    "",
    "Checklist:",
    "- set typography pairing for headings/body",
    "- define primary/secondary/accent color tokens",
    "- establish spacing and radius rhythm",
    "- ensure components feel consistent across sections",
  ].join("\n");
}

function buildSkillImplementationStandards() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Skill 04: Implementation Standards",
    "",
    "Objective:",
    "- ship production-ready frontend implementation",
    "",
    "Rules:",
    "- prefer reusable components over duplicated markup",
    "- keep styling tokens centralized when possible",
    "- ensure semantic HTML and predictable class structure",
    "- keep code understandable and easy to extend",
  ].join("\n");
}

function buildSkillResponsiveAccessibility() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Skill 05: Responsive and Accessibility",
    "",
    "Objective:",
    "- ensure quality across screens and accessibility basics",
    "",
    "Checklist:",
    "- test major breakpoints (mobile, tablet, desktop)",
    "- ensure keyboard focus visibility and interaction clarity",
    "- maintain readable contrast and text sizing",
    "- verify touch target size and spacing on mobile",
  ].join("\n");
}

function buildSkillQualityLaunch() {
  return [
    OUTPUT_SIGNATURE,
    "",
    "# Skill 06: Quality and Launch",
    "",
    "Objective:",
    "- finalize with confidence and clear handoff",
    "",
    "Checklist:",
    "- run a fast visual polish pass",
    "- remove placeholder content where possible",
    "- verify no obvious layout shifts or broken states",
    "- summarize what was shipped and recommended next steps",
  ].join("\n");
}

function buildWebDesignProfileFiles(params) {
  return {
    "SYSTEM_PROMPT.md": buildWebDesignSystemPrompt({
      modelProvider: params.modelProvider,
      localRuntime: params.localRuntime,
    }),
    "WALKTHROUGH.md": buildWebDesignWalkthrough(),
    "SKILLS_INDEX.md": buildWebDesignSkillsIndex(),
    "WORKFLOW.md": buildWebDesignWorkflow(),
    "DESIGN_SKILLS.md": buildWebDesignDesignSkills(),
    "OUTPUT_TEMPLATE.md": buildWebDesignOutputTemplate(),
    "MARKETPLACE_SKILLS.md": buildMarketplaceSkillsGuide("web-design", {
      signature: OUTPUT_SIGNATURE,
    }),
    "skills/01_discovery_brief.md": buildSkillDiscoveryBrief(),
    "skills/02_information_architecture.md": buildSkillInformationArchitecture(),
    "skills/03_visual_system.md": buildSkillVisualSystem(),
    "skills/04_implementation_standards.md": buildSkillImplementationStandards(),
    "skills/05_responsive_accessibility.md": buildSkillResponsiveAccessibility(),
    "skills/06_quality_launch.md": buildSkillQualityLaunch(),
  };
}

export function installAbilityProfile(params) {
  const abilityProfile = params.abilityProfile ?? "web-design";
  const installedAt = new Date().toISOString();
  const workspace = path.resolve(params.workspace);
  const modelProvider = params.modelProvider ?? "openai-codex";
  const localRuntime = params.localRuntime ?? "ollama";
  const interactionMode = params.interactionMode ?? "terminal";
  const contextGuardThresholdPct =
    typeof params.contextGuardThresholdPct === "number" ? params.contextGuardThresholdPct : 65;

  if (abilityProfile !== "web-design") {
    throw new Error(`unsupported ability profile: ${abilityProfile}`);
  }

  const kaizenHome = resolveKaizenHome();
  const globalProfileDir = path.join(kaizenHome, "profiles", abilityProfile);
  const workspaceProfileDir = path.join(workspace, ".kaizen", "profiles", abilityProfile);

  ensureDir(globalProfileDir);
  ensureDir(workspaceProfileDir);
  const memoryResult = ensureSessionMemoryFile({
    workspace,
    abilityProfile,
    thresholdPct: contextGuardThresholdPct,
  });
  const profileFiles = buildWebDesignProfileFiles({
    modelProvider,
    localRuntime,
  });
  const workspaceSkillsIndexPath = path.join(workspaceProfileDir, "SKILLS_INDEX.md");
  const workspaceWalkthroughPath = path.join(workspaceProfileDir, "WALKTHROUGH.md");
  const workspaceMarketplaceSkillsPath = path.join(
    workspaceProfileDir,
    "MARKETPLACE_SKILLS.md",
  );

  writeTextFile(
    path.join(globalProfileDir, "README.md"),
    buildWebDesignPackReadme({
      abilityProfile,
      installedAt,
      workspace,
    }),
  );

  writeProfileFiles(globalProfileDir, profileFiles);

  writeTextFile(
    path.join(workspaceProfileDir, "KAIZEN_PROFILE.md"),
    buildWebDesignWorkspaceContext({
      modelProvider,
      interactionMode,
      contextGuardThresholdPct: memoryResult.thresholdPct,
      memoryFilePath: memoryResult.memoryPath,
    }),
  );
  writeProfileFiles(workspaceProfileDir, profileFiles);

  return {
    abilityProfile,
    installedAt,
    globalProfileDir,
    workspaceProfileDir,
    workspaceSkillsIndexPath,
    workspaceWalkthroughPath,
    workspaceMarketplaceSkillsPath,
    memoryFilePath: memoryResult.memoryPath,
    contextGuardThresholdPct: memoryResult.thresholdPct,
  };
}
