/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type MarketplaceSkill = {
  source: string;
  skill: string;
  category: string;
  why: string;
  url: string;
};

type InstallRunResult = {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
  errorMessage: string | null;
};

type SkillInstallResult = {
  id: string;
  source: string;
  skill: string;
  category: string;
  ok: boolean;
  errorMessage: string | null;
};

const WEB_DESIGN_MARKETPLACE_SKILLS: MarketplaceSkill[] = [
  {
    source: "vercel-labs/agent-skills",
    skill: "web-design-guidelines",
    category: "web-design",
    why: "UI/UX guideline checks and visual audits.",
    url: "https://skills.sh/vercel-labs/agent-skills/web-design-guidelines",
  },
  {
    source: "vercel-labs/agent-skills",
    skill: "vercel-react-best-practices",
    category: "frontend-performance",
    why: "React and Next.js quality/performance patterns.",
    url: "https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices",
  },
  {
    source: "anthropics/skills",
    skill: "frontend-design",
    category: "frontend-design",
    why: "High-quality frontend design and implementation patterns.",
    url: "https://skills.sh/anthropics/skills/frontend-design",
  },
  {
    source: "wshobson/agents",
    skill: "responsive-design",
    category: "frontend-responsive",
    why: "Responsive systems for mobile/tablet/desktop behavior.",
    url: "https://skills.sh/wshobson/agents/responsive-design",
  },
  {
    source: "wshobson/agents",
    skill: "accessibility-compliance",
    category: "frontend-accessibility",
    why: "Accessibility and compliance checks for production-ready UI.",
    url: "https://skills.sh/wshobson/agents/accessibility-compliance",
  },
  {
    source: "wshobson/agents",
    skill: "web-component-design",
    category: "frontend-components",
    why: "Reusable component architecture and design-system patterns.",
    url: "https://skills.sh/wshobson/agents/web-component-design",
  },
  {
    source: "wshobson/agents",
    skill: "nodejs-backend-patterns",
    category: "backend-patterns",
    why: "Optional backend patterns when web projects add APIs later.",
    url: "https://skills.sh/wshobson/agents/nodejs-backend-patterns",
  },
];

function normalizeAbilityProfile(rawAbilityProfile: unknown) {
  if (typeof rawAbilityProfile !== "string") {
    return "web-design";
  }
  const normalized = rawAbilityProfile.trim().toLowerCase();
  if (!normalized) {
    return "web-design";
  }
  return normalized;
}

function getSkillId(skill: MarketplaceSkill) {
  return `${skill.source}@${skill.skill}`;
}

function getSkillSetVersion(skills: MarketplaceSkill[]) {
  return skills
    .map((skill) => getSkillId(skill))
    .sort()
    .join("|");
}

function getMarketplaceStatePath(workspace: string, abilityProfile: string) {
  return path.join(
    path.resolve(workspace),
    ".kaizen",
    "profiles",
    abilityProfile,
    "MARKETPLACE_SKILLS_STATE.json",
  );
}

function readMarketplaceState(statePath: string) {
  if (!fs.existsSync(statePath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeMarketplaceState(statePath: string, state: unknown) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function runCommand(command: string, args: string[], cwd: string): Promise<InstallRunResult> {
  return new Promise<InstallRunResult>((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        code: 1,
        stdout,
        stderr,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });

    child.on("close", (code, signal) => {
      if (signal) {
        resolve({
          ok: false,
          code: 1,
          stdout,
          stderr,
          errorMessage: `process terminated by signal: ${signal}`,
        });
        return;
      }
      resolve({
        ok: code === 0,
        code: code ?? 1,
        stdout,
        stderr,
        errorMessage: null,
      });
    });
  });
}

export function getMarketplaceSkillsForAbility(rawAbilityProfile: unknown) {
  const abilityProfile = normalizeAbilityProfile(rawAbilityProfile);
  if (abilityProfile === "web-design") {
    return WEB_DESIGN_MARKETPLACE_SKILLS.map((skill) => ({ ...skill }));
  }
  return [];
}

export function buildMarketplaceSkillsGuide(
  rawAbilityProfile: unknown,
  options: {
    signature?: string;
  } = {},
) {
  const abilityProfile = normalizeAbilityProfile(rawAbilityProfile);
  const skills = getMarketplaceSkillsForAbility(abilityProfile);
  const signature = options.signature ?? "";

  const lines: string[] = [];
  if (signature) {
    lines.push(signature, "");
  }
  lines.push("# Marketplace Skills");
  lines.push("");
  lines.push(`Ability profile: ${abilityProfile}`);
  lines.push("");
  lines.push("These skills come from https://skills.sh and are auto-synced by Kaizen onboarding.");
  lines.push("");
  lines.push("Install source command pattern:");
  lines.push("`npx -y skills add <owner/repo> --skill <skill-name> --agent codex -y`");
  lines.push("");
  if (skills.length === 0) {
    lines.push("No marketplace skills are currently mapped for this ability.");
    return lines.join("\n");
  }

  lines.push("Curated set:");
  for (const skill of skills) {
    lines.push(`- \`${getSkillId(skill)}\` (${skill.category})`);
    lines.push(`  - why: ${skill.why}`);
    lines.push(`  - ${skill.url}`);
  }
  lines.push("");
  lines.push("You can browse and swap skills anytime at https://skills.sh/.");
  return lines.join("\n");
}

export async function installMarketplaceSkillsForAbility(params: {
  workspace: string;
  abilityProfile: string;
  agent?: string;
  force?: boolean;
  log?: (line: string) => void;
}) {
  const workspace = path.resolve(params.workspace);
  const abilityProfile = normalizeAbilityProfile(params.abilityProfile);
  const agent = params.agent ?? "codex";
  const force = Boolean(params.force);
  const skills = getMarketplaceSkillsForAbility(abilityProfile);
  const statePath = getMarketplaceStatePath(workspace, abilityProfile);
  const version = getSkillSetVersion(skills);
  const previousState = readMarketplaceState(statePath);

  if (
    !force &&
    previousState &&
    previousState.version === version &&
    previousState.failedCount === 0 &&
    previousState.installedCount === skills.length
  ) {
    return {
      abilityProfile,
      agent,
      version,
      statePath,
      cached: true,
      installedCount: skills.length,
      failedCount: 0,
      skillCount: skills.length,
      completedAt: previousState.completedAt ?? new Date().toISOString(),
      results: Array.isArray(previousState.results) ? previousState.results : [],
    };
  }

  fs.mkdirSync(workspace, { recursive: true });
  const npxCheck = await runCommand("npx", ["-y", "skills", "--version"], workspace);
  if (!npxCheck.ok) {
    const errorMessage =
      npxCheck.errorMessage ??
      (npxCheck.stderr.trim() || "npx skills CLI is unavailable in this environment.");
    const completedAt = new Date().toISOString();
    const failedResults: SkillInstallResult[] = skills.map((skill) => ({
      id: getSkillId(skill),
      source: skill.source,
      skill: skill.skill,
      category: skill.category,
      ok: false,
      errorMessage,
    }));
    writeMarketplaceState(statePath, {
      abilityProfile,
      agent,
      version,
      completedAt,
      installedCount: 0,
      failedCount: failedResults.length,
      results: failedResults,
    });
    return {
      abilityProfile,
      agent,
      version,
      statePath,
      cached: false,
      installedCount: 0,
      failedCount: failedResults.length,
      skillCount: skills.length,
      completedAt,
      results: failedResults,
    };
  }

  const results: SkillInstallResult[] = [];
  let installedCount = 0;
  let failedCount = 0;

  for (const skill of skills) {
    const skillId = getSkillId(skill);
    params.log?.(`- syncing ${skillId}`);
    const runResult = await runCommand(
      "npx",
      [
        "-y",
        "skills",
        "add",
        skill.source,
        "--skill",
        skill.skill,
        "--agent",
        agent,
        "-y",
      ],
      workspace,
    );

    if (runResult.ok) {
      installedCount += 1;
      results.push({
        id: skillId,
        source: skill.source,
        skill: skill.skill,
        category: skill.category,
        ok: true,
        errorMessage: null,
      });
      continue;
    }

    failedCount += 1;
    results.push({
      id: skillId,
      source: skill.source,
      skill: skill.skill,
      category: skill.category,
      ok: false,
      errorMessage:
        runResult.errorMessage ||
        runResult.stderr.trim() ||
        `command failed with exit code ${runResult.code}`,
    });
  }

  const completedAt = new Date().toISOString();
  writeMarketplaceState(statePath, {
    abilityProfile,
    agent,
    version,
    completedAt,
    installedCount,
    failedCount,
    results,
  });

  return {
    abilityProfile,
    agent,
    version,
    statePath,
    cached: false,
    installedCount,
    failedCount,
    skillCount: skills.length,
    completedAt,
    results,
  };
}
