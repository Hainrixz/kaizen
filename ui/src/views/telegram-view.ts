import { html } from "lit";
import type { TelegramStatus } from "../state";

type TelegramViewParams = {
  status: TelegramStatus | null;
  draftEnabled: boolean;
  draftToken: string;
  draftAllowFrom: string;
  draftPollIntervalMs: string;
  draftLongPollTimeoutSec: string;
  testChatId: string;
  testMessage: string;
  working: boolean;
  onField: (field: string, value: string | boolean) => void;
  onSave: () => void;
  onDisable: () => void;
  onTest: () => void;
};

export function renderTelegramTab(params: TelegramViewParams) {
  const status = params.status;

  return html`
    <section class="tab-panel telegram-panel">
      <h2>telegram channel</h2>
      <p class="section-intro">configure bot credentials, allowlist, and test delivery.</p>

      <ul class="key-value-list">
        <li><span>enabled</span><strong>${status?.enabled ? "yes" : "no"}</strong></li>
        <li><span>token</span><strong>${status?.botTokenConfigured ? "configured" : "not set"}</strong></li>
        <li><span>bot</span><strong>${status?.botUsername ? `@${status.botUsername}` : "-"}</strong></li>
        <li><span>allowlist</span><strong>${status?.allowFrom.join(", ") || "(empty)"}</strong></li>
      </ul>

      <div class="form-grid">
        <label>
          <span>enabled</span>
          <input
            type="checkbox"
            .checked=${params.draftEnabled}
            @change=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("enabled", target.checked);
            }}
          />
        </label>

        <label>
          <span>bot token</span>
          <input
            type="password"
            .value=${params.draftToken}
            placeholder="123456:ABCDEF..."
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("token", target.value);
            }}
          />
        </label>

        <label>
          <span>allow from (csv ids)</span>
          <input
            type="text"
            .value=${params.draftAllowFrom}
            placeholder="12345,67890"
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("allowFrom", target.value);
            }}
          />
        </label>

        <label>
          <span>poll interval (ms)</span>
          <input
            type="number"
            .value=${params.draftPollIntervalMs}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("pollIntervalMs", target.value);
            }}
          />
        </label>

        <label>
          <span>long poll timeout (sec)</span>
          <input
            type="number"
            .value=${params.draftLongPollTimeoutSec}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("longPollTimeoutSec", target.value);
            }}
          />
        </label>
      </div>

      <div class="button-row">
        <button class="button primary" ?disabled=${params.working} @click=${params.onSave}>save</button>
        <button class="button danger" ?disabled=${params.working} @click=${params.onDisable}>disable</button>
      </div>

      <div class="form-grid inline">
        <label>
          <span>test chat id</span>
          <input
            type="text"
            .value=${params.testChatId}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("testChatId", target.value);
            }}
          />
        </label>
        <label>
          <span>test message</span>
          <input
            type="text"
            .value=${params.testMessage}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              params.onField("testMessage", target.value);
            }}
          />
        </label>
      </div>
      <div class="button-row">
        <button class="button" ?disabled=${params.working} @click=${params.onTest}>send test</button>
      </div>
    </section>
  `;
}
