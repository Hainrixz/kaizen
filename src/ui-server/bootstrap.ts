import { readConfig } from "../config.js";
import { getKaizenVersion } from "../version.js";

export function buildControlUiBootstrap(params: { sessionId: string }) {
  const config = readConfig();

  return {
    version: getKaizenVersion(),
    sessionId: params.sessionId,
    workspace: config.defaults.workspace,
    abilityProfile: config.defaults.abilityProfile,
    modelProvider: config.defaults.modelProvider,
    localRuntime: config.defaults.modelProvider === "local" ? config.defaults.localRuntime : "n/a",
    interactionMode: config.defaults.interactionMode,
    runMode: config.defaults.runMode,
    theme: {
      name: "kaizen-blue",
      mode: "dark",
      primary: "#3b82f6",
      accent: "#60a5fa",
    },
  };
}
