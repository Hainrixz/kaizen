/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { spawn } from "node:child_process";
import {
  ensureControlUiAssets,
  resolveControlUiStaticDir,
  startControlUiServer,
} from "../ui-server/server.js";
import { sanitizeSessionId } from "../ui-server/session-store.js";
import { startHeartbeat } from "../runtime/heartbeat.js";

type UiCommandOptions = {
  host?: string;
  port?: number;
  noOpen?: boolean;
  session?: string;
  dryRun?: boolean;
};

function normalizeHost(rawHost: unknown) {
  if (typeof rawHost !== "string" || rawHost.trim().length === 0) {
    return "127.0.0.1";
  }
  return rawHost.trim();
}

function normalizePort(rawPort: unknown) {
  if (typeof rawPort === "number" && Number.isInteger(rawPort) && rawPort > 0 && rawPort <= 65535) {
    return rawPort;
  }
  if (typeof rawPort === "string" && rawPort.trim().length > 0) {
    const parsed = Number.parseInt(rawPort.trim(), 10);
    if (!Number.isNaN(parsed)) {
      return normalizePort(parsed);
    }
  }
  return 3000;
}

function toDisplayUrl(host: string, port: number) {
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${displayHost}:${port}`;
}

function tryOpenBrowser(url: string) {
  let command = "";
  let args: string[] = [];

  if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
  } catch {
    // no-op if browser open fails
  }
}

export async function uiCommand(options: UiCommandOptions = {}) {
  const host = normalizeHost(options.host);
  const port = normalizePort(options.port);
  const sessionId = sanitizeSessionId(options.session);
  const noOpen = Boolean(options.noOpen);
  const staticDir = resolveControlUiStaticDir();

  if (options.dryRun) {
    console.log("");
    console.log(`UI dry run: would start Kaizen UI at ${toDisplayUrl(host, port)}`);
    console.log(`Session: ${sessionId}`);
    console.log(`Static assets: ${staticDir}`);
    return true;
  }

  if (!ensureControlUiAssets(staticDir)) {
    throw new Error(
      "Control UI assets are missing. Run `pnpm run build` (or `pnpm run ui:build`) before `kaizen ui`.",
    );
  }

  const server = await startControlUiServer({
    host,
    port,
    sessionId,
    staticDir,
  });
  const heartbeat = startHeartbeat({
    runtime: "manual",
  });

  const displayUrl = toDisplayUrl(host, port);

  if (!noOpen) {
    tryOpenBrowser(displayUrl);
  }

  console.log("");
  console.log(`Kaizen UI running at ${displayUrl}`);
  console.log(`WebSocket endpoint: ws://${host}:${port}/ws`);
  console.log(`Session: ${sessionId}`);
  console.log("Press Ctrl+C to stop.");

  const stop = async () => {
    heartbeat.stop();
    await heartbeat.wait();
    await server.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void stop();
  });
  process.once("SIGTERM", () => {
    void stop();
  });

  return true;
}
