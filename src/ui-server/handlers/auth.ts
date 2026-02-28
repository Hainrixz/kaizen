import { runAuthStatus } from "../../auth-provider.js";
import { readConfig } from "../../config.js";

export async function authStatus() {
  const config = readConfig();
  const provider = config.defaults.authProvider;
  const result = await runAuthStatus(provider, {
    stdio: "pipe",
  });

  return {
    provider,
    ok: result.ok,
    lastLoginAt: config.auth?.lastLoginAt ?? null,
    errorMessage: result.errorMessage,
  };
}
