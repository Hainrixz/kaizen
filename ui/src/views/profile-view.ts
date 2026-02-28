import { html } from "lit";
import type { RuntimeSnapshot } from "../state";

type ProfileViewParams = {
  snapshot: RuntimeSnapshot | null;
  onCopy: (value: string) => void;
};

function pathRow(label: string, value: string | null | undefined, onCopy: (value: string) => void) {
  if (!value) {
    return html``;
  }

  return html`
    <li>
      <span>${label}</span>
      <code>${value}</code>
      <button class="button tiny" @click=${() => onCopy(value)}>copy</button>
    </li>
  `;
}

export function renderProfileTab(params: ProfileViewParams) {
  const profile = params.snapshot?.profile;

  return html`
    <section class="tab-panel profile-panel">
      <h2>profile files</h2>
      <p class="section-intro">paths currently active for this workspace profile.</p>
      <ul class="path-list">
        ${pathRow("config", params.snapshot?.configPath, params.onCopy)}
        ${pathRow("workspace", params.snapshot?.workspace, params.onCopy)}
        ${pathRow("memory", profile?.memoryFile, params.onCopy)}
        ${pathRow("walkthrough", profile?.walkthroughFile, params.onCopy)}
        ${pathRow("skills index", profile?.skillsIndexFile, params.onCopy)}
        ${pathRow("marketplace skills", profile?.marketplaceSkillsFile, params.onCopy)}
      </ul>
    </section>
  `;
}
