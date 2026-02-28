import fs from "node:fs";
import path from "node:path";
import type http from "node:http";
import { buildControlUiBootstrap } from "./bootstrap.js";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(`${JSON.stringify(payload)}\n`);
}

function sendFile(res: http.ServerResponse, filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  res.writeHead(200, {
    "content-type": contentType,
  });
  fs.createReadStream(filePath).pipe(res);
}

function resolveStaticFilePath(staticDir: string, requestPath: string) {
  let normalizedPath = requestPath;
  try {
    normalizedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  normalizedPath = normalizedPath.replace(/\0/g, "");
  const sanitized = normalizedPath.startsWith("/") ? normalizedPath.slice(1) : normalizedPath;
  const candidate = path.resolve(staticDir, sanitized);
  if (!candidate.startsWith(path.resolve(staticDir))) {
    return null;
  }
  return candidate;
}

export function createHttpHandler(params: {
  staticDir: string;
  host: string;
  port: number;
  sessionId: string;
}) {
  const indexPath = path.join(params.staticDir, "index.html");

  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    const method = req.method ?? "GET";
    const requestUrl = new URL(req.url || "/", `http://${params.host}:${params.port}`);

    if (method !== "GET" && method !== "HEAD") {
      sendJson(res, 405, {
        ok: false,
        error: "method_not_allowed",
      });
      return;
    }

    if (requestUrl.pathname === "/health") {
      const bootstrap = buildControlUiBootstrap({ sessionId: params.sessionId });
      sendJson(res, 200, {
        ok: true,
        version: bootstrap.version,
        workspace: bootstrap.workspace,
        abilityProfile: bootstrap.abilityProfile,
        ws: true,
      });
      return;
    }

    if (requestUrl.pathname === "/__kaizen/control-ui-config.json") {
      sendJson(res, 200, buildControlUiBootstrap({ sessionId: params.sessionId }));
      return;
    }

    if (!fs.existsSync(indexPath)) {
      sendJson(res, 500, {
        ok: false,
        error: "missing_ui_assets",
        message: "Control UI assets are missing. Run `pnpm run build` before launching `kaizen ui`.",
      });
      return;
    }

    const resolvedPath = resolveStaticFilePath(params.staticDir, requestUrl.pathname);
    if (resolvedPath && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      sendFile(res, resolvedPath);
      return;
    }

    sendFile(res, indexPath);
  };
}
