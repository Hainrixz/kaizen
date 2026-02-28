import { readConfig } from "../config.js";

export type UiServerOptions = {
  host: string;
  port: number;
  noOpen: boolean;
  sessionId: string;
};

export type UiSessionContext = {
  sessionId: string;
  workspace: string;
  abilityProfile: string;
};

export type UiEventSink = {
  sendEvent: (event: string, payload?: unknown) => void;
};

export function resolveSessionContext(sessionId: string): UiSessionContext {
  const config = readConfig();
  return {
    sessionId,
    workspace: config.defaults.workspace,
    abilityProfile: config.defaults.abilityProfile,
  };
}
