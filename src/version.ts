import fs from "node:fs";

let cachedVersion: string | null = null;

export function getKaizenVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const raw = fs.readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.version === "string" && parsed.version.trim().length > 0) {
      cachedVersion = parsed.version.trim();
      return cachedVersion;
    }
  } catch {
    // fall through to default
  }

  cachedVersion = "0.1.0";
  return cachedVersion;
}
