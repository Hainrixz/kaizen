import { html } from "lit";
import type { QueueTask } from "../state";

type QueueViewParams = {
  tasks: QueueTask[];
  working: boolean;
  titleDraft: string;
  promptDraft: string;
  onField: (field: string, value: string) => void;
  onAdd: () => void;
  onRunNext: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
};

export function renderQueueTab(params: QueueViewParams) {
  return html`
    <section class="tab-panel queue-panel">
      <h2>task queue</h2>
      <p class="section-intro">add explicit tasks for autonomy queued mode, then run one or let heartbeat process them.</p>

      <div class="form-grid">
        <label>
          <span>task title</span>
          <input
            type="text"
            .value=${params.titleDraft}
            placeholder="Refine hero section"
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("title", target.value);
            }}
          />
        </label>

        <label>
          <span>task prompt</span>
          <textarea
            .value=${params.promptDraft}
            placeholder="Implement the next feature and keep styling consistent."
            @input=${(event: Event) => {
              const target = event.target as HTMLTextAreaElement;
              params.onField("prompt", target.value);
            }}
          ></textarea>
        </label>
      </div>

      <div class="button-row">
        <button class="button primary" ?disabled=${params.working} @click=${params.onAdd}>add task</button>
        <button class="button" ?disabled=${params.working} @click=${params.onRunNext}>run next</button>
        <button class="button danger" ?disabled=${params.working} @click=${params.onClear}>clear</button>
      </div>

      <ul class="path-list">
        ${params.tasks.length === 0
          ? html`<li><span>queue</span><strong>no tasks yet</strong></li>`
          : params.tasks.map(
              (task) => html`
                <li>
                  <span>${task.status}</span>
                  <code>${task.title} (${task.id})</code>
                  <button class="button danger" ?disabled=${params.working} @click=${() => params.onRemove(task.id)}>
                    remove
                  </button>
                </li>
              `,
            )}
      </ul>
    </section>
  `;
}

