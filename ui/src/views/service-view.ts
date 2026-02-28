import { html } from "lit";
import type { ServiceStatus } from "../state";

type ServiceViewParams = {
  serviceStatus: ServiceStatus | null;
  working: boolean;
  onAction: (action: "install" | "start" | "stop" | "restart" | "status" | "uninstall") => void;
};

export function renderServiceTab(params: ServiceViewParams) {
  const status = params.serviceStatus;

  return html`
    <section class="tab-panel service-panel">
      <h2>service runtime</h2>
      <p class="section-intro">manage manual vs always-on process lifecycle.</p>
      <ul class="key-value-list">
        <li><span>installed</span><strong>${status?.installed ? "yes" : "no"}</strong></li>
        <li><span>running</span><strong>${status?.running ? "yes" : "no"}</strong></li>
        <li><span>detail</span><strong>${status?.detail ?? "-"}</strong></li>
      </ul>

      <div class="button-row">
        <button class="button" ?disabled=${params.working} @click=${() => params.onAction("status")}>refresh</button>
        <button class="button" ?disabled=${params.working} @click=${() => params.onAction("install")}>install</button>
        <button class="button primary" ?disabled=${params.working} @click=${() => params.onAction("start")}>start</button>
        <button class="button" ?disabled=${params.working} @click=${() => params.onAction("stop")}>stop</button>
        <button class="button" ?disabled=${params.working} @click=${() => params.onAction("restart")}>restart</button>
        <button class="button danger" ?disabled=${params.working} @click=${() => params.onAction("uninstall")}>uninstall</button>
      </div>
    </section>
  `;
}
