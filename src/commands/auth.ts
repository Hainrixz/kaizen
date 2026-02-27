/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

import { runAuthLogin, runAuthStatus } from "../auth-provider.js";
import { normalizeAuthProvider, readConfig, writeConfig } from "../config.js";

function resolveProvider(rawProvider?: string) {
  const config = readConfig();
  return normalizeAuthProvider(rawProvider ?? config.defaults.authProvider);
}

export async function authLoginCommand(options: { provider?: string } = {}) {
  const provider = resolveProvider(options.provider);

  console.log("");
  console.log(`Starting OAuth login for provider: ${provider}`);
  const result = await runAuthLogin(provider);

  if (!result.ok) {
    console.log("");
    console.log("OAuth login did not complete.");
    if (result.errorMessage) {
      console.log(`Reason: ${result.errorMessage}`);
    }
    return false;
  }

  const config = readConfig();
  const nextConfig = {
    ...config,
    defaults: {
      ...config.defaults,
      authProvider: provider,
    },
    auth: {
      ...config.auth,
      provider,
      lastLoginAt: new Date().toISOString(),
    },
  };
  writeConfig(nextConfig);

  console.log("");
  console.log("OAuth login complete.");
  return true;
}

export async function authStatusCommand(options: { provider?: string } = {}) {
  const provider = resolveProvider(options.provider);
  const result = await runAuthStatus(provider);

  if (!result.ok && result.errorMessage) {
    console.log("");
    console.log(`Auth status check failed: ${result.errorMessage}`);
  }

  return result.ok;
}
