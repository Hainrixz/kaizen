import { html } from "lit";
import type { AuthStatus, RuntimeSnapshot, UiBootstrap } from "../state";

type OverviewParams = {
  bootstrap: UiBootstrap | null;
  snapshot: RuntimeSnapshot | null;
  auth: AuthStatus | null;
};

function item(label: string, value: string | number | null | undefined) {
  return html`<li><span>${label}</span><strong>${value ?? "-"}</strong></li>`;
}

export function renderOverviewTab(params: OverviewParams) {
  const bootstrap = params.bootstrap;
  const snapshot = params.snapshot;

  return html`
    <section class="tab-panel overview-panel">
      <h2>overview</h2>
      <p class="section-intro">runtime profile, model context, and auth snapshot.</p>
      <ul class="key-value-list">
        ${item("version", bootstrap?.version)}
        ${item("workspace", snapshot?.workspace ?? bootstrap?.workspace)}
        ${item("engine runner", snapshot?.engineRunner)}
        ${item("ability", snapshot?.abilityProfile ?? bootstrap?.abilityProfile)}
        ${item("model", snapshot?.modelProvider ?? bootstrap?.modelProvider)}
        ${item("local runtime", snapshot?.localRuntime ?? bootstrap?.localRuntime)}
        ${item("run mode", snapshot?.runMode ?? bootstrap?.runMode)}
        ${item(
          "autonomy",
          snapshot?.autonomy
            ? `${snapshot.autonomy.enabled ? "on" : "off"} (${snapshot.autonomy.mode})`
            : "-",
        )}
        ${item("access scope", snapshot?.access?.scope)}
        ${item("interaction", snapshot?.interactionMode ?? bootstrap?.interactionMode)}
        ${item(
          "context guard",
          snapshot
            ? snapshot.contextGuardEnabled
              ? `enabled (${snapshot.contextGuardThresholdPct}%)`
              : "disabled"
            : "-",
        )}
        ${item("auth provider", snapshot?.authProvider ?? params.auth?.provider)}
        ${item("oauth status", params.auth ? (params.auth.ok ? "connected" : "not connected") : "-")}
      </ul>
    </section>
  `;
}
