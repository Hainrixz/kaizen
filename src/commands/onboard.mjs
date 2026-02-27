/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import process from "node:process";
import {
  isUnsafeWorkspaceInput,
  normalizeAbilityProfile,
  normalizeAuthProvider,
  normalizeInteractionMode,
  normalizeLocalRuntime,
  normalizeModelProvider,
  readConfig,
  resolveConfigPath,
  resolveWorkspacePath,
  writeConfig,
} from "../config.mjs";
import { authLoginCommand } from "./auth.mjs";
import { installAbilityProfile } from "../mission-pack.mjs";

const MODEL_CHOICE_OPENAI = "openai-codex";
const MODEL_CHOICE_LOCAL_OLLAMA = "local-ollama";
const MODEL_CHOICE_LOCAL_LMSTUDIO = "local-lmstudio";

const MODEL_CHOICES = [
  { value: MODEL_CHOICE_OPENAI, label: "OpenAI Codex (OAuth)" },
  { value: MODEL_CHOICE_LOCAL_OLLAMA, label: "Local AI (Ollama)" },
  { value: MODEL_CHOICE_LOCAL_LMSTUDIO, label: "Local AI (LM Studio)" },
];

const ABILITY_CHOICES = [
  { value: "web-design", label: "Web design (landing pages + frontend UI)" },
];

const INTERACTION_CHOICES = [
  { value: "terminal", label: "Terminal chat" },
  { value: "localhost", label: "Localhost UI (port 3000)" },
];

function formatHomePath(targetPath) {
  const home = os.homedir();
  if (targetPath === home) {
    return "~";
  }
  if (targetPath.startsWith(`${home}${path.sep}`)) {
    return `~${targetPath.slice(home.length)}`;
  }
  return targetPath;
}

async function askWithDefault(rl, label, fallback) {
  const value = await rl.question(`${label} (default: ${fallback}): `);
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }
  return normalized;
}

async function askYesNo(rl, label, defaultValue = false) {
  const hint = defaultValue ? "Y/n" : "y/N";
  const value = (await rl.question(`${label} (${hint}): `)).trim().toLowerCase();
  if (!value) {
    return defaultValue;
  }
  return value === "y" || value === "yes";
}

function findDefaultChoiceIndex(choices, defaultValue) {
  const index = choices.findIndex((choice) => choice.value === defaultValue);
  return index >= 0 ? index : 0;
}

async function askChoice(rl, label, choices, defaultValue) {
  const defaultIndex = findDefaultChoiceIndex(choices, defaultValue);
  const defaultChoice = choices[defaultIndex];

  console.log(label);
  for (let i = 0; i < choices.length; i += 1) {
    const choice = choices[i];
    const marker = i === defaultIndex ? " (default)" : "";
    console.log(`  ${i + 1}. ${choice.label}${marker}`);
  }

  const raw = (await rl.question(`Select [1-${choices.length}] (default: ${defaultIndex + 1}): `)).trim();
  if (!raw) {
    return defaultChoice.value;
  }

  const numeric = Number.parseInt(raw, 10);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= choices.length) {
    return choices[numeric - 1].value;
  }

  const normalized = raw.toLowerCase();
  const byValue = choices.find((choice) => choice.value === normalized);
  if (byValue) {
    return byValue.value;
  }

  return defaultChoice.value;
}

function resolveModelChoiceDefault(modelProvider, localRuntime) {
  if (modelProvider !== "local") {
    return MODEL_CHOICE_OPENAI;
  }
  return localRuntime === "lmstudio" ? MODEL_CHOICE_LOCAL_LMSTUDIO : MODEL_CHOICE_LOCAL_OLLAMA;
}

export async function onboardCommand(options = {}) {
  const current = readConfig();
  const configPath = resolveConfigPath();
  const nonInteractive = Boolean(options.nonInteractive);
  const hasWorkspaceOverride =
    typeof options.workspace === "string" && options.workspace.trim().length > 0;

  if (hasWorkspaceOverride && isUnsafeWorkspaceInput(options.workspace)) {
    throw new Error(
      "Invalid workspace path. Pass a filesystem path (example: ~/kaizen-workspace), not a shell command.",
    );
  }

  let workspace =
    hasWorkspaceOverride
      ? resolveWorkspacePath(options.workspace, current.defaults.workspace)
      : current.defaults.workspace;
  let modelProvider = normalizeModelProvider(
    options.model ?? options.modelProvider ?? current.defaults.modelProvider,
  );
  let localRuntime = normalizeLocalRuntime(options.localRuntime ?? current.defaults.localRuntime);
  let abilityProfile = normalizeAbilityProfile(
    options.abilityProfile ?? options.mission ?? current.defaults.abilityProfile,
  );
  let interactionMode = normalizeInteractionMode(
    options.interaction ?? current.defaults.interactionMode,
  );
  let authProvider = normalizeAuthProvider(options.authProvider ?? current.defaults.authProvider);
  const hasExplicitLoginChoice = Boolean(options.login) || Boolean(options.skipLogin);
  let runLogin = Boolean(options.login);

  if (modelProvider === "local") {
    runLogin = false;
  }

  if (!nonInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("");
      console.log("Kaizen onboarding wizard");
      console.log("");

      const modelChoice = await askChoice(
        rl,
        "1) Choose model provider",
        MODEL_CHOICES,
        resolveModelChoiceDefault(modelProvider, localRuntime),
      );
      if (modelChoice === MODEL_CHOICE_OPENAI) {
        modelProvider = "openai-codex";
        localRuntime = "ollama";
      } else if (modelChoice === MODEL_CHOICE_LOCAL_LMSTUDIO) {
        modelProvider = "local";
        localRuntime = "lmstudio";
      } else {
        modelProvider = "local";
        localRuntime = "ollama";
      }

      abilityProfile = normalizeAbilityProfile(
        await askChoice(
          rl,
          "2) Choose ability profile (v1)",
          ABILITY_CHOICES,
          abilityProfile,
        ),
      );

      interactionMode = normalizeInteractionMode(
        await askChoice(
          rl,
          "3) Choose interaction mode",
          INTERACTION_CHOICES,
          interactionMode,
        ),
      );

      while (true) {
        const workspaceInput = await askWithDefault(
          rl,
          "4) Workspace path",
          formatHomePath(workspace),
        );
        if (isUnsafeWorkspaceInput(workspaceInput)) {
          console.log(
            "That looked like a command. Enter a folder path only (example: ~/kaizen-workspace).",
          );
          continue;
        }
        workspace = resolveWorkspacePath(workspaceInput, workspace);
        break;
      }

      if (modelProvider === "openai-codex") {
        authProvider = "openai-codex";
        if (!hasExplicitLoginChoice) {
          runLogin = await askYesNo(rl, "5) Connect OpenAI Codex OAuth now?", true);
        }
      } else {
        runLogin = false;
      }

      console.log("");
      console.log("Review setup:");
      console.log(`- model provider: ${modelProvider}`);
      if (modelProvider === "local") {
        console.log(`- local runtime: ${localRuntime}`);
      }
      console.log(`- ability profile: ${abilityProfile}`);
      console.log(`- interaction mode: ${interactionMode}`);
      console.log(`- workspace: ${workspace}`);
      console.log(`- run OAuth login now: ${runLogin ? "yes" : "no"}`);

      const approved = await askYesNo(rl, "Apply this configuration?", true);
      if (!approved) {
        console.log("");
        console.log("Onboarding cancelled. No changes were written.");
        return current;
      }
    } finally {
      rl.close();
    }
  }

  if (modelProvider === "openai-codex") {
    authProvider = "openai-codex";
  }

  const installResult = installAbilityProfile({
    abilityProfile,
    workspace,
    modelProvider,
    localRuntime,
    interactionMode,
  });

  const nextConfig = {
    version: 2,
    defaults: {
      workspace,
      focus: "web-app",
      mission: abilityProfile,
      abilityProfile,
      modelProvider,
      localRuntime,
      interactionMode,
      authProvider,
    },
    auth: {
      provider: authProvider,
      lastLoginAt: current.auth?.lastLoginAt ?? null,
    },
    missions: {
      ...(current.missions ?? {}),
      [abilityProfile]: {
        installedAt: installResult.installedAt,
        globalProfileDir: installResult.globalProfileDir,
        workspaceProfileDir: installResult.workspaceProfileDir,
      },
    },
  };

  writeConfig(nextConfig);

  if (runLogin && modelProvider === "openai-codex") {
    await authLoginCommand({ provider: authProvider });
  }

  console.log("");
  console.log("Onboarding complete.");
  console.log(`Config: ${configPath}`);
  console.log(`Workspace: ${nextConfig.defaults.workspace}`);
  console.log(`Model provider: ${nextConfig.defaults.modelProvider}`);
  if (nextConfig.defaults.modelProvider === "local") {
    console.log(`Local runtime: ${nextConfig.defaults.localRuntime}`);
  }
  console.log(`Ability profile: ${nextConfig.defaults.abilityProfile}`);
  console.log(`Interaction mode: ${nextConfig.defaults.interactionMode}`);
  console.log(`Global profile files: ${installResult.globalProfileDir}`);
  console.log(`Workspace profile files: ${installResult.workspaceProfileDir}`);

  return nextConfig;
}
