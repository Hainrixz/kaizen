import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHttpHandler } from "./http.js";
import { attachWsServer } from "./ws.js";

export type StartControlUiServerOptions = {
  host: string;
  port: number;
  sessionId: string;
  staticDir: string;
};

export function resolveControlUiStaticDir() {
  const runtimeFile = fileURLToPath(import.meta.url);
  const runtimeDir = path.dirname(runtimeFile);
  return path.resolve(runtimeDir, "../../dist/control-ui");
}

export function ensureControlUiAssets(staticDir: string) {
  const indexPath = path.join(staticDir, "index.html");
  return fs.existsSync(indexPath);
}

export async function startControlUiServer(options: StartControlUiServerOptions) {
  const requestHandler = createHttpHandler({
    staticDir: options.staticDir,
    host: options.host,
    port: options.port,
    sessionId: options.sessionId,
  });

  const server = http.createServer(requestHandler);
  const wsHandle = attachWsServer({
    server,
    defaultSessionId: options.sessionId,
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => resolve());
  });

  const url = `http://${options.host}:${options.port}`;
  return {
    url,
    close: async () => {
      await wsHandle.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
