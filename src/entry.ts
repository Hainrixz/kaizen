#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { Command } from "commander";
import { printStartupBanner } from "./banner.js";
import { authLoginCommand, authStatusCommand } from "./commands/auth.js";
import {
  telegramDisableCommand,
  telegramSetupCommand,
  telegramStatusCommand,
  telegramTestCommand,
} from "./commands/channels-telegram.js";
import { chatCommand } from "./commands/chat.js";
import { onboardCommand } from "./commands/onboard.js";
import { configurationCommand } from "./commands/configuration.js";
import {
  autonomyConfigureCommand,
  autonomyDisableCommand,
  autonomyEnableCommand,
  autonomyStartCommand,
  autonomyStatusCommand,
  autonomyStopCommand,
} from "./commands/autonomy.js";
import {
  serviceInstallCommand,
  serviceRestartCommand,
  serviceRunCommand,
  serviceStartCommand,
  serviceStatusCommand,
  serviceStopCommand,
  serviceUninstallCommand,
} from "./commands/service.js";
import { setupCommand } from "./commands/setup.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { uiCommand } from "./commands/ui.js";
import { uninstallCommand } from "./commands/uninstall.js";
import {
  queueAddCommand,
  queueClearCommand,
  queueListCommand,
  queueRemoveCommand,
  queueRunNextCommand,
} from "./commands/queue.js";
import { normalizeAuthProvider, normalizeFocus, readConfig } from "./config.js";
import { generateStarterProject } from "./generator.js";
import { verifySignatureIntegrity } from "./signature.js";
import { getKaizenVersion } from "./version.js";

function createProgram() {
  const program = new Command();

  program
    .name("kaizen")
    .description("Focused project-builder agent CLI")
    .version(getKaizenVersion())
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
    .option("--run-mode <mode>", "Runtime mode: manual|always-on")
    .option("--enable-telegram <value>", "Enable Telegram channel: true|false")
    .option("--telegram-bot-token <token>", "Telegram bot token")
    .option("--telegram-allow-from <csv>", "Telegram allowlist user IDs (comma-separated)")
    .option("--telegram-poll-interval-ms <number>", "Telegram polling interval in ms")
    .option("--telegram-long-poll-timeout-sec <number>", "Telegram long-poll timeout in seconds")
    .option("--accept-always-on-risk <value>", "Acknowledge always-on risk: true|false")
    .option("--context-guard-enabled <value>", "Context guard enabled: true|false")
    .option("--context-guard-threshold-pct <number>", "Context compression threshold percentage")
    .option("--marketplace-skills <value>", "Install marketplace skills: true|false")
    .option("--force-marketplace-skills", "Force reinstall marketplace skills", false)
    .option("--auto-start <value>", "Auto-start after setup: true|false")
    .option("--no-auto-start", "Disable auto-start after setup")
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
    .description(
      "Simple onboarding wizard: model + ability profile + interaction mode + runtime mode",
    )
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
    .option("--run-mode <mode>", "Runtime mode: manual|always-on")
    .option("--enable-telegram <value>", "Enable Telegram channel: true|false")
    .option("--telegram-bot-token <token>", "Telegram bot token")
    .option("--telegram-allow-from <csv>", "Telegram allowlist user IDs (comma-separated)")
    .option("--telegram-poll-interval-ms <number>", "Telegram polling interval in ms")
    .option("--telegram-long-poll-timeout-sec <number>", "Telegram long-poll timeout in seconds")
    .option("--accept-always-on-risk <value>", "Acknowledge always-on risk: true|false")
    .option("--context-guard-enabled <value>", "Context guard enabled: true|false")
    .option("--context-guard-threshold-pct <number>", "Context compression threshold percentage")
    .option("--marketplace-skills <value>", "Install marketplace skills: true|false")
    .option("--force-marketplace-skills", "Force reinstall marketplace skills", false)
    .option("--auto-start <value>", "Auto-start after onboarding: true|false")
    .option("--no-auto-start", "Disable auto-start after onboarding")
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
    .command("config")
    .alias("settings")
    .description("Update Kaizen defaults (like interaction mode)")
    .option("--interaction <mode>", "Set default interaction: terminal|localhost")
    .option("--autonomy <state>", "Set autonomy default: on|off")
    .option("--access <scope>", "Set access scope: workspace|workspace-plus|full")
    .option(
      "--allow-path <path>",
      "Allow extra path (repeatable) when scope is workspace-plus",
      (value, previous: string[]) => [...(Array.isArray(previous) ? previous : []), value],
      [],
    )
    .option(
      "--accept-full-access-risk <value>",
      "Acknowledge full-access risk in non-interactive updates: true|false",
    )
    .option("--yes", "Skip interactive confirmation prompts where supported", false)
    .option("--show", "Show saved config defaults", false)
    .option("--launch", "Launch Kaizen after saving", false)
    .action(async (opts) => {
      await configurationCommand({
        interaction: opts.interaction,
        autonomy: opts.autonomy,
        access: opts.access,
        allowPath: opts.allowPath,
        acceptFullAccessRisk: opts.acceptFullAccessRisk,
        yes: Boolean(opts.yes),
        show: Boolean(opts.show),
        launch: Boolean(opts.launch),
      });
    });

  program
    .command("start")
    .description("Start Kaizen interactive mode (terminal or localhost)")
    .option("--interaction <mode>", "Override interaction mode: terminal|localhost")
    .option("--host <host>", "Host for localhost mode")
    .option("--port <port>", "Port for localhost mode", (value) => Number.parseInt(value, 10))
    .option("--no-open", "Disable browser auto-open for localhost mode")
    .option("--session <id>", "Session id override for localhost UI history")
    .option("--workspace <dir>", "Workspace path for terminal mode")
    .option("--dry-run", "Print what would run without launching", false)
    .action(async (opts) => {
      await startCommand({
        ...opts,
        noOpen: opts.open === false,
      });
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
    .description("Launch localhost UI mode")
    .option("--host <host>", "Host for localhost UI")
    .option("--port <port>", "Port for localhost UI", (value) => Number.parseInt(value, 10))
    .option("--no-open", "Disable browser auto-open")
    .option("--session <id>", "Session id override for UI chat history")
    .option("--dry-run", "Print startup details without launching", false)
    .action(async (opts) => {
      await uiCommand({
        ...opts,
        noOpen: opts.open === false,
      });
    });

  const auth = program.command("auth").description("Manage OAuth authentication providers");

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

  const service = program.command("service").description("Manage Kaizen always-on service mode");

  service
    .command("run")
    .description("Run Kaizen worker in foreground")
    .option("--daemon", "Run under service manager context", false)
    .option("--quiet", "Reduce worker logs", false)
    .action(async (opts) => {
      await serviceRunCommand(opts);
    });

  service
    .command("install")
    .description("Install Kaizen service")
    .action(async () => {
      await serviceInstallCommand();
    });

  service
    .command("start")
    .description("Start Kaizen service")
    .action(async () => {
      await serviceStartCommand();
    });

  service
    .command("stop")
    .description("Stop Kaizen service")
    .action(async () => {
      await serviceStopCommand();
    });

  service
    .command("restart")
    .description("Restart Kaizen service")
    .action(async () => {
      await serviceRestartCommand();
    });

  service
    .command("status")
    .description("Show Kaizen service status")
    .action(async () => {
      await serviceStatusCommand();
    });

  service
    .command("uninstall")
    .description("Uninstall Kaizen service")
    .action(async () => {
      await serviceUninstallCommand();
    });

  program
    .command("uninstall")
    .description("Uninstall Kaizen runtime artifacts")
    .option("--mode <mode>", "Uninstall mode: minimal|standard|deep", "standard")
    .option("--yes", "Skip typed confirmation prompt", false)
    .option("--no-path-cleanup", "Skip automatic shell/profile PATH cleanup")
    .action(async (opts) => {
      await uninstallCommand({
        mode: opts.mode,
        yes: Boolean(opts.yes),
        pathCleanup: opts.pathCleanup !== false,
      });
    });

  const channels = program.command("channels").description("Manage Kaizen channels");
  const telegram = channels.command("telegram").description("Manage Telegram channel");

  telegram
    .command("setup")
    .description("Configure Telegram channel and allowlist")
    .option("--token <token>", "Telegram bot token")
    .option("--allow-from <csv>", "Comma separated numeric Telegram user IDs")
    .option("--poll-interval-ms <number>", "Polling interval in ms")
    .option("--long-poll-timeout-sec <number>", "Long-poll timeout in seconds")
    .option("--non-interactive", "Run without prompts", false)
    .action(async (opts) => {
      await telegramSetupCommand({
        token: opts.token,
        allowFrom: opts.allowFrom,
        pollIntervalMs: opts.pollIntervalMs,
        longPollTimeoutSec: opts.longPollTimeoutSec,
        nonInteractive: Boolean(opts.nonInteractive),
      });
    });

  telegram
    .command("status")
    .description("Show Telegram channel configuration and bot check")
    .action(async () => {
      await telegramStatusCommand();
    });

  telegram
    .command("disable")
    .description("Disable Telegram channel")
    .action(async () => {
      await telegramDisableCommand();
    });

  telegram
    .command("test")
    .description("Send a Telegram test message")
    .requiredOption("--to <chatId>", "Telegram chat id")
    .requiredOption("--message <text>", "Message text")
    .action(async (opts) => {
      await telegramTestCommand({
        to: opts.to,
        message: opts.message,
      });
    });

  const autonomy = program.command("autonomy").description("Manage Kaizen autonomy runtime");

  autonomy
    .command("status")
    .description("Show autonomy status, mode, and queue summary")
    .action(async () => {
      await autonomyStatusCommand();
    });

  autonomy
    .command("configure")
    .description("Interactive autonomy + access configuration")
    .action(async () => {
      await autonomyConfigureCommand();
    });

  autonomy
    .command("enable")
    .description("Enable autonomy in config")
    .option("--non-interactive", "Run without interactive prompts", false)
    .option("--accept-full-access-risk <value>", "Acknowledge full-access risk: true|false")
    .option("--yes", "Skip interactive confirmations where supported", false)
    .action(async (opts) => {
      await autonomyEnableCommand({
        nonInteractive: Boolean(opts.nonInteractive),
        acceptFullAccessRisk: opts.acceptFullAccessRisk,
        yes: Boolean(opts.yes),
      });
    });

  autonomy
    .command("disable")
    .description("Disable autonomy in config")
    .action(async () => {
      await autonomyDisableCommand();
    });

  autonomy
    .command("start")
    .description("Start autonomy runtime loop")
    .option("--mode <mode>", "Mode: queued|free-run")
    .option("--max-turns <n>", "Max turns budget", (value) => Number.parseInt(value, 10))
    .option("--max-minutes <n>", "Max minutes budget", (value) => Number.parseInt(value, 10))
    .option("--workspace <dir>", "Workspace path override")
    .action(async (opts) => {
      await autonomyStartCommand({
        mode: opts.mode,
        maxTurns: opts.maxTurns,
        maxMinutes: opts.maxMinutes,
        workspace: opts.workspace,
      });
    });

  autonomy
    .command("stop")
    .description("Stop active autonomy runtime loop")
    .action(async () => {
      await autonomyStopCommand();
    });

  const queue = program.command("queue").description("Manage Kaizen queued tasks");

  queue
    .command("add")
    .description("Add task to workspace queue")
    .requiredOption("--title <text>", "Task title")
    .requiredOption("--prompt <text>", "Task prompt")
    .option("--workspace <dir>", "Workspace path override")
    .action(async (opts) => {
      await queueAddCommand({
        title: opts.title,
        prompt: opts.prompt,
        workspace: opts.workspace,
      });
    });

  queue
    .command("list")
    .description("List queued tasks for workspace")
    .option("--workspace <dir>", "Workspace path override")
    .action(async (opts) => {
      await queueListCommand({
        workspace: opts.workspace,
      });
    });

  queue
    .command("remove")
    .description("Remove task from queue")
    .requiredOption("--id <id>", "Queue task id")
    .option("--workspace <dir>", "Workspace path override")
    .action(async (opts) => {
      await queueRemoveCommand({
        id: opts.id,
        workspace: opts.workspace,
      });
    });

  queue
    .command("clear")
    .description("Clear queue for workspace")
    .option("--workspace <dir>", "Workspace path override")
    .action(async (opts) => {
      await queueClearCommand({
        workspace: opts.workspace,
      });
    });

  queue
    .command("run-next")
    .description("Run one queued task turn")
    .option("--workspace <dir>", "Workspace path override")
    .action(async (opts) => {
      await queueRunNextCommand({
        workspace: opts.workspace,
      });
    });

  program
    .command("init <projectName>")
    .description("Generate a starter project")
    .option("--focus <mode>", "Project focus: landing-page|web-app|mobile-web-app|tool")
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
  try {
    if (process.argv.length <= 2) {
      await startCommand();
      return;
    }

    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("");
    console.error(`[kaizen] ${message}`);
    process.exitCode = 1;
  }
}

await run();
