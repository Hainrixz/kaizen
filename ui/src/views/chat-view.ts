import { html } from "lit";
import type { ChatMessage } from "../state";

type ChatViewParams = {
  messages: ChatMessage[];
  runActive: boolean;
  composerValue: string;
  onComposerInput: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
};

function formatTime(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleTimeString();
}

export function renderChatTab(params: ChatViewParams) {
  return html`
    <section class="tab-panel chat-panel">
      <div class="messages" id="messages-list">
        ${params.messages.length === 0
          ? html`
              <div class="empty-state">
                <img src="/kaizen-mascot.png" alt="Kaizen mascot" />
                <span>start the conversation and kaizen will reply here.</span>
              </div>
            `
          : params.messages.map(
              (message) => html`
                <article class="message message-${message.role}">
                  <header>
                    <span class="role">${message.role === "user" ? "you" : "kaizen"}</span>
                    <span class="timestamp">${formatTime(message.createdAt)}</span>
                  </header>
                  <pre>${message.text}</pre>
                </article>
              `,
            )}
      </div>

      <div class="composer">
        <textarea
          .value=${params.composerValue}
          placeholder="ask kaizen to build or improve something..."
          ?disabled=${params.runActive}
          @input=${(event: Event) => {
            const target = event.target as HTMLTextAreaElement;
            params.onComposerInput(target.value);
          }}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              params.onSend();
            }
          }}
        ></textarea>
        <div class="composer-actions">
          <button class="button primary" @click=${params.onSend} ?disabled=${params.runActive}>
            send
          </button>
          <button class="button" @click=${params.onCancel} ?disabled=${!params.runActive}>
            cancel
          </button>
        </div>
      </div>
    </section>
  `;
}
