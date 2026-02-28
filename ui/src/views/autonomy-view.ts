import { html } from "lit";
import type { AutonomyStatus } from "../state";

type AutonomyViewParams = {
  status: AutonomyStatus | null;
  working: boolean;
  modeDraft: "queued" | "free-run";
  maxTurnsDraft: string;
  maxMinutesDraft: string;
  scopeDraft: "workspace" | "workspace-plus" | "full";
  allowPathsDraft: string;
  onField: (field: string, value: string) => void;
  onAction: (action: "enable" | "disable" | "start" | "stop" | "save") => void;
};

export function renderAutonomyTab(params: AutonomyViewParams) {
  const status = params.status;

  return html`
    <section class="tab-panel autonomy-panel">
      <h2>autonomy runtime</h2>
      <p class="section-intro">control queued mode, optional free-run mode, and access boundaries.</p>

      <ul class="key-value-list">
        <li><span>enabled</span><strong>${status?.config.enabled ? "yes" : "no"}</strong></li>
        <li><span>mode</span><strong>${status?.config.mode ?? "-"}</strong></li>
        <li><span>runtime active</span><strong>${status?.runtime.running ? "yes" : "no"}</strong></li>
        <li><span>access scope</span><strong>${status?.access.scope ?? "-"}</strong></li>
        <li><span>queue pending</span><strong>${status?.queueSummary.pending ?? 0}</strong></li>
      </ul>

      <div class="form-grid">
        <label>
          <span>mode</span>
          <select
            .value=${params.modeDraft}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              params.onField("mode", target.value);
            }}
          >
            <option value="queued">queued</option>
            <option value="free-run">free-run</option>
          </select>
        </label>

        <label>
          <span>max turns</span>
          <input
            type="number"
            min="1"
            .value=${params.maxTurnsDraft}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("maxTurns", target.value);
            }}
          />
        </label>

        <label>
          <span>max minutes</span>
          <input
            type="number"
            min="1"
            .value=${params.maxMinutesDraft}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("maxMinutes", target.value);
            }}
          />
        </label>

        <label>
          <span>access scope</span>
          <select
            .value=${params.scopeDraft}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              params.onField("scope", target.value);
            }}
          >
            <option value="workspace">workspace</option>
            <option value="workspace-plus">workspace-plus</option>
            <option value="full">full</option>
          </select>
        </label>

        <label>
          <span>allow paths (csv)</span>
          <input
            type="text"
            .value=${params.allowPathsDraft}
            placeholder="/Users/you/Documents,/Users/you/Desktop"
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("allowPaths", target.value);
            }}
          />
        </label>
      </div>

      <div class="button-row">
        <button class="button" ?disabled=${params.working} @click=${() => params.onAction("save")}>save config</button>
        <button class="button primary" ?disabled=${params.working} @click=${() => params.onAction("enable")}>enable</button>
        <button class="button" ?disabled=${params.working} @click=${() => params.onAction("disable")}>disable</button>
      </div>

      <div class="button-row">
        <button class="button primary" ?disabled=${params.working} @click=${() => params.onAction("start")}>start</button>
        <button class="button danger" ?disabled=${params.working} @click=${() => params.onAction("stop")}>stop</button>
      </div>
    </section>
  `;
}

