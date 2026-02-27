/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import http from "node:http";
import { readConfig } from "../config.js";

function renderUiHtml(config: any, port: number) {
  const abilityProfile = config.defaults.abilityProfile ?? "web-design";
  const modelProvider = config.defaults.modelProvider;
  const localRuntime =
    modelProvider === "local" ? config.defaults.localRuntime ?? "ollama" : "n/a";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kaizen UI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 32px; background: #0f172a; color: #e2e8f0; }
    .card { max-width: 760px; margin: 0 auto; padding: 24px; border: 1px solid #334155; border-radius: 16px; background: #111827; }
    h1 { margin-top: 0; }
    .muted { color: #94a3b8; }
    code { background: #1e293b; padding: 2px 6px; border-radius: 6px; }
    ul { line-height: 1.8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Kaizen Local UI</h1>
    <p class="muted">Focused profile is active and ready.</p>
    <ul>
      <li>Ability profile: <strong>${abilityProfile}</strong></li>
      <li>Model provider: <strong>${modelProvider}</strong></li>
      <li>Local runtime: <strong>${localRuntime}</strong></li>
      <li>Configured interaction mode: <strong>${config.defaults.interactionMode}</strong></li>
    </ul>
    <p>To start terminal chat now, run:</p>
    <p><code>corepack pnpm start chat</code></p>
    <p class="muted">UI chat panel comes in a later update. This v1 page confirms onboarding state and launch commands.</p>
    <p class="muted">Listening on <code>http://localhost:${port}</code></p>
  </div>
</body>
</html>`;
}

export async function uiCommand(options: any = {}) {
  const config = readConfig();
  const port = Number.isInteger(options.port) ? options.port : 3000;

  if (options.dryRun) {
    console.log("");
    console.log(`UI dry run: would start Kaizen UI at http://localhost:${port}`);
    return true;
  }

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, profile: config.defaults.abilityProfile }));
      return;
    }

    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderUiHtml(config, port));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  console.log("");
  console.log(`Kaizen UI running at http://localhost:${port}`);
  console.log("Press Ctrl+C to stop.");
  return true;
}
