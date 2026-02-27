#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import { Command } from "commander";
import { printStartupBanner } from "./banner.js";
import { authLoginCommand, authStatusCommand } from "./commands/auth.js";
import { chatCommand } from "./commands/chat.js";
import { onboardCommand } from "./commands/onboard.js";
import { setupCommand } from "./commands/setup.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { uiCommand } from "./commands/ui.js";
import { normalizeAuthProvider, normalizeFocus, readConfig } from "./config.js";
import { generateStarterProject } from "./generator.js";
import { verifySignatureIntegrity } from "./signature.js";

function readPackageVersion() {
  try {
    const raw = fs.readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.version === "string" && parsed.version.trim().length > 0) {
      return parsed.version.trim();
    }
    return "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function createProgram() {
  const program = new Command();

  program
    .name("kaizen")
    .description("Focused project-builder agent CLI")
    .version(readPackageVersion())
    .helpOption("-h, --help", "Display help for command");

  program
    .command("setup")
    .description("Initialize Kaizen defaults and install selected ability profile")
    .option("--workspace <dir>", "Workspace directory for generated projects")
    .option(
      "--workspace-location <location>",
      "Workspace location preset: desktop|documents|home|custom",
    )
    .option("--wizard", "Run onboarding wizard", false)
    .option("--non-interactive", "Run onboarding without prompts", false)
    .option("--model <provider>", "Model provider: openai-codex|local")
    .option("--local-runtime <runtime>", "Local runtime: ollama|lmstudio")
    .option("--ability-profile <name>", "Ability profile (v1: web-design)")
    .option("--mission <name>", "Alias for --ability-profile (for compatibility)")
    .option("--interaction <mode>", "Interaction mode: terminal|localhost")
    .option("--context-guard-enabled <value>", "Context guard enabled: true|false")
    .option("--context-guard-threshold-pct <number>", "Context compression threshold percentage")
    .option("--marketplace-skills <value>", "Install marketplace skills: true|false")
    .option("--force-marketplace-skills", "Force reinstall marketplace skills", false)
    .option(
      "--auth-provider <provider>",
      "Auth provider used for OAuth login (currently: openai-codex)",
    )
    .option("--login", "Run OAuth login during setup/onboarding", false)
    .option("--skip-login", "Skip OAuth login during setup/onboarding", false)
    .action(async (opts) => {
      await setupCommand(opts);
    });

  program
    .command("onboard")
    .description("Simple onboarding wizard: model + ability profile + interaction mode")
    .option("--non-interactive", "Run without prompts", false)
    .option("--workspace <dir>", "Workspace directory for generated projects")
    .option(
      "--workspace-location <location>",
      "Workspace location preset: desktop|documents|home|custom",
    )
    .option("--model <provider>", "Model provider: openai-codex|local")
    .option("--local-runtime <runtime>", "Local runtime: ollama|lmstudio")
    .option("--ability-profile <name>", "Ability profile (v1: web-design)")
    .option("--mission <name>", "Alias for --ability-profile (for compatibility)")
    .option("--interaction <mode>", "Interaction mode: terminal|localhost")
    .option("--context-guard-enabled <value>", "Context guard enabled: true|false")
    .option("--context-guard-threshold-pct <number>", "Context compression threshold percentage")
    .option("--marketplace-skills <value>", "Install marketplace skills: true|false")
    .option("--force-marketplace-skills", "Force reinstall marketplace skills", false)
    .option("--auth-provider <provider>", "Auth provider (currently: openai-codex)")
    .option("--login", "Run OAuth login after onboarding", false)
    .option("--skip-login", "Skip OAuth login after onboarding", false)
    .action(async (opts) => {
      await onboardCommand(opts);
    });

  program
    .command("status")
    .description("Show Kaizen config status")
    .action(async () => {
      await statusCommand();
    });

  program
    .command("start")
    .description("Start Kaizen using configured interaction mode (terminal or localhost)")
    .option("--interaction <mode>", "Override interaction mode: terminal|localhost")
    .option("--port <port>", "Port for localhost mode", (value) => Number.parseInt(value, 10))
    .option("--workspace <dir>", "Workspace path for terminal mode")
    .option("--dry-run", "Print what would run without launching", false)
    .action(async (opts) => {
      await startCommand(opts);
    });

  program
    .command("chat")
    .description("Launch terminal chat mode with Codex")
    .option("--workspace <dir>", "Workspace path for terminal mode")
    .option("--dry-run", "Print command without launching", false)
    .action(async (opts) => {
      await chatCommand(opts);
    });

  program
    .command("ui")
    .description("Launch localhost UI mode (v1 control panel)")
    .option("--port <port>", "Port for localhost UI", (value) => Number.parseInt(value, 10))
    .option("--dry-run", "Print startup details without launching", false)
    .action(async (opts) => {
      await uiCommand(opts);
    });

  const auth = program
    .command("auth")
    .description("Manage OAuth authentication providers");

  auth
    .command("login")
    .description("Run provider OAuth login")
    .option("--provider <provider>", "Auth provider (currently: openai-codex)")
    .action(async (opts) => {
      await authLoginCommand({
        provider: normalizeAuthProvider(opts.provider),
      });
    });

  auth
    .command("status")
    .description("Show provider auth status")
    .option("--provider <provider>", "Auth provider (currently: openai-codex)")
    .action(async (opts) => {
      await authStatusCommand({
        provider: normalizeAuthProvider(opts.provider),
      });
    });

  program
    .command("init <projectName>")
    .description("Generate a starter project")
    .option(
      "--focus <mode>",
      "Project focus: landing-page|web-app|mobile-web-app|tool",
    )
    .option("--profile <name>", "Profile id to attach to project metadata")
    .action(async (projectName, opts) => {
      const config = readConfig();
      const focus = normalizeFocus(opts.focus ?? config.defaults.focus);
      const profile =
        typeof opts.profile === "string" && opts.profile.trim().length > 0
          ? opts.profile.trim()
          : config.defaults.profile;

      const targetDir = generateStarterProject(process.cwd(), projectName, {
        focus,
        profile,
      });
      console.log("");
      console.log(`Project created at: ${targetDir}`);
      console.log(`Focus: ${focus}`);
      console.log(`Profile: ${profile}`);
    });

  return program;
}

async function run() {
  printStartupBanner();
  verifySignatureIntegrity();

  const program = createProgram();
  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("");
    console.error(`[kaizen] ${message}`);
    process.exitCode = 1;
  }
}

await run();
