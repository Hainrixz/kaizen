import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { GatewayClient, type RpcEvent } from "./gateway-client";
import type {
  AutonomyStatus,
  AuthStatus,
  ChatHistoryPayload,
  ChatMessage,
  QueueTask,
  RuntimeSnapshot,
  ServiceStatus,
  TelegramStatus,
  UiBootstrap,
  UiDensity,
  UiThemeMode,
} from "./state";
import { renderAutonomyTab } from "./views/autonomy-view";
import { renderChatTab } from "./views/chat-view";
import { renderOverviewTab } from "./views/overview-view";
import { renderProfileTab } from "./views/profile-view";
import { renderQueueTab } from "./views/queue-view";
import { renderServiceTab } from "./views/service-view";
import { renderTelegramTab } from "./views/telegram-view";

type TabId = "chat" | "overview" | "service" | "telegram" | "autonomy" | "queue" | "profile";

const LOCAL_THEME_KEY = "kaizen.ui.theme";
const LOCAL_DENSITY_KEY = "kaizen.ui.density";

@customElement("kaizen-app")
export class KaizenApp extends LitElement {
  createRenderRoot() {
    return this;
  }

  @state() private activeTab: TabId = "chat";
  @state() private bootstrap: UiBootstrap | null = null;
  @state() private runtimeSnapshot: RuntimeSnapshot | null = null;
  @state() private authStatus: AuthStatus | null = null;
  @state() private serviceStatus: ServiceStatus | null = null;
  @state() private telegramStatus: TelegramStatus | null = null;
  @state() private autonomyStatus: AutonomyStatus | null = null;
  @state() private queueTasks: QueueTask[] = [];

  @state() private messages: ChatMessage[] = [];
  @state() private composerValue = "";
  @state() private runActive = false;
  @state() private gatewayConnected = false;
  @state() private sessionId = "default";

  @state() private serviceWorking = false;
  @state() private telegramWorking = false;
  @state() private autonomyWorking = false;
  @state() private queueWorking = false;

  @state() private telegramDraftEnabled = false;
  @state() private telegramDraftToken = "";
  @state() private telegramDraftAllowFrom = "";
  @state() private telegramDraftPollIntervalMs = "1500";
  @state() private telegramDraftLongPollTimeoutSec = "25";
  @state() private telegramTestChatId = "";
  @state() private telegramTestMessage = "kaizen test message";
  @state() private autonomyModeDraft: "queued" | "free-run" = "queued";
  @state() private autonomyMaxTurnsDraft = "5";
  @state() private autonomyMaxMinutesDraft = "20";
  @state() private autonomyScopeDraft: "workspace" | "workspace-plus" | "full" = "workspace";
  @state() private autonomyAllowPathsDraft = "";
  @state() private queueTitleDraft = "";
  @state() private queuePromptDraft = "";

  @state() private themeMode: UiThemeMode = "dark";
  @state() private uiDensity: UiDensity = "comfortable";
  @state() private mobileNavOpen = false;
  @state() private toastMessage = "";

  private gateway: GatewayClient | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.restoreLocalUiPreferences();
    this.applyLocalUiPreferences();
    void this.initialize();
  }

  disconnectedCallback(): void {
    this.gateway?.close();
    super.disconnectedCallback();
  }

  private restoreLocalUiPreferences() {
    try {
      const storedTheme = localStorage.getItem(LOCAL_THEME_KEY);
      if (storedTheme === "dark" || storedTheme === "light") {
        this.themeMode = storedTheme;
      }

      const storedDensity = localStorage.getItem(LOCAL_DENSITY_KEY);
      if (storedDensity === "comfortable" || storedDensity === "compact") {
        this.uiDensity = storedDensity;
      }
    } catch {
      // ignore localStorage access issues in restricted environments
    }
  }

  private applyLocalUiPreferences() {
    document.documentElement.setAttribute("data-theme", this.themeMode);
    document.documentElement.setAttribute("data-ui-density", this.uiDensity);
  }

  private persistLocalUiPreferences() {
    try {
      localStorage.setItem(LOCAL_THEME_KEY, this.themeMode);
      localStorage.setItem(LOCAL_DENSITY_KEY, this.uiDensity);
    } catch {
      // ignore localStorage write issues
    }
  }

  private setThemeMode(nextTheme: UiThemeMode) {
    if (this.themeMode === nextTheme) {
      return;
    }
    this.themeMode = nextTheme;
    this.persistLocalUiPreferences();
    this.applyLocalUiPreferences();
  }

  private setUiDensity(nextDensity: UiDensity) {
    if (this.uiDensity === nextDensity) {
      return;
    }
    this.uiDensity = nextDensity;
    this.persistLocalUiPreferences();
    this.applyLocalUiPreferences();
  }

  private async initialize() {
    try {
      const bootstrapResponse = await fetch("/__kaizen/control-ui-config.json", {
        cache: "no-store",
      });
      this.bootstrap = (await bootstrapResponse.json()) as UiBootstrap;
      this.sessionId = this.bootstrap.sessionId;

      this.gateway = await GatewayClient.connect(this.sessionId);
      this.gatewayConnected = this.gateway.isConnected();
      this.gateway.addEventListener("rpc-event", (event: Event) => {
        const customEvent = event as CustomEvent<RpcEvent>;
        void this.onRpcEvent(customEvent.detail);
      });
      this.gateway.addEventListener("disconnected", () => {
        this.gatewayConnected = false;
        this.runActive = false;
        this.showToast("Connection lost. Refresh the page or relaunch kaizen ui.");
      });

      const connectPayload = (await this.gateway.request("connect")) as UiBootstrap & {
        history: ChatHistoryPayload;
      };
      this.bootstrap = {
        ...this.bootstrap,
        ...connectPayload,
      };
      this.applyHistory(connectPayload.history);

      await Promise.all([
        this.refreshRuntimeSnapshot(),
        this.refreshServiceStatus(),
        this.refreshTelegramStatus(),
        this.refreshAuthStatus(),
        this.refreshAutonomyStatus(),
        this.refreshQueueTasks(),
      ]);
    } catch (error) {
      this.gatewayConnected = false;
      this.runActive = false;
      this.showToast(error instanceof Error ? error.message : String(error));
    }
  }

  private async onRpcEvent(detail: RpcEvent) {
    if (detail.event === "chat.run.started") {
      this.runActive = true;
      return;
    }

    if (
      detail.event === "chat.run.completed" ||
      detail.event === "chat.run.cancelled" ||
      detail.event === "chat.run.failed"
    ) {
      this.runActive = false;
      await this.refreshHistory();
    }
  }

  private showToast(message: string) {
    this.toastMessage = message;
    window.setTimeout(() => {
      if (this.toastMessage === message) {
        this.toastMessage = "";
      }
    }, 2800);
  }

  private async refreshHistory() {
    if (!this.gateway) {
      return;
    }
    const history = (await this.gateway.request("chat.history")) as ChatHistoryPayload;
    this.applyHistory(history);
  }

  private applyHistory(history: ChatHistoryPayload) {
    this.sessionId = history.sessionId;
    this.messages = [...history.messages];
  }

  private async refreshRuntimeSnapshot() {
    if (!this.gateway) {
      return;
    }
    this.runtimeSnapshot = (await this.gateway.request("status.snapshot")) as RuntimeSnapshot;
  }

  private async refreshServiceStatus() {
    if (!this.gateway) {
      return;
    }
    this.serviceStatus = (await this.gateway.request("service.status")) as ServiceStatus;
  }

  private async refreshTelegramStatus() {
    if (!this.gateway) {
      return;
    }
    this.telegramStatus = (await this.gateway.request("telegram.status")) as TelegramStatus;
    this.telegramDraftEnabled = this.telegramStatus.enabled;
    this.telegramDraftAllowFrom = this.telegramStatus.allowFrom.join(",");
    this.telegramDraftPollIntervalMs = String(this.telegramStatus.pollIntervalMs);
    this.telegramDraftLongPollTimeoutSec = String(this.telegramStatus.longPollTimeoutSec);
  }

  private async refreshAuthStatus() {
    if (!this.gateway) {
      return;
    }
    this.authStatus = (await this.gateway.request("auth.status")) as AuthStatus;
  }

  private async refreshAutonomyStatus() {
    if (!this.gateway) {
      return;
    }
    this.autonomyStatus = (await this.gateway.request("autonomy.status")) as AutonomyStatus;
    if (this.autonomyStatus) {
      this.autonomyModeDraft = this.autonomyStatus.config.mode;
      this.autonomyMaxTurnsDraft = String(this.autonomyStatus.config.freeRun.maxTurns);
      this.autonomyMaxMinutesDraft = String(this.autonomyStatus.config.freeRun.maxMinutes);
      this.autonomyScopeDraft = this.autonomyStatus.access.scope;
      this.autonomyAllowPathsDraft = this.autonomyStatus.access.allowPaths.join(",");
    }
  }

  private async refreshQueueTasks() {
    if (!this.gateway) {
      return;
    }
    const payload = (await this.gateway.request("queue.list")) as {
      workspace: string;
      tasks: QueueTask[];
    };
    this.queueTasks = [...payload.tasks];
  }

  private async sendMessage() {
    if (!this.gateway || !this.gatewayConnected) {
      this.showToast("Kaizen UI is not connected yet.");
      return;
    }
    if (this.runActive) {
      return;
    }

    const message = this.composerValue.trim();
    if (!message) {
      return;
    }

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      text: message,
      createdAt: new Date().toISOString(),
    };

    this.messages = [...this.messages, optimistic];
    this.composerValue = "";
    this.runActive = true;

    try {
      await this.gateway.request("chat.send", {
        message,
      });
      await this.refreshHistory();
    } catch (error) {
      this.runActive = false;
      this.showToast(error instanceof Error ? error.message : String(error));
      await this.refreshHistory();
    }
  }

  private async cancelMessageRun() {
    if (!this.gateway || !this.runActive) {
      return;
    }

    try {
      await this.gateway.request("chat.cancel");
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    }
  }

  private async runServiceAction(action: "install" | "start" | "stop" | "restart" | "status" | "uninstall") {
    if (!this.gateway) {
      return;
    }

    this.serviceWorking = true;
    try {
      this.serviceStatus = (await this.gateway.request("service.run", {
        action,
      })) as ServiceStatus;
      await this.refreshRuntimeSnapshot();
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.serviceWorking = false;
    }
  }

  private updateTelegramField(field: string, value: string | boolean) {
    if (field === "enabled") {
      this.telegramDraftEnabled = Boolean(value);
      return;
    }
    if (field === "token") {
      this.telegramDraftToken = String(value);
      return;
    }
    if (field === "allowFrom") {
      this.telegramDraftAllowFrom = String(value);
      return;
    }
    if (field === "pollIntervalMs") {
      this.telegramDraftPollIntervalMs = String(value);
      return;
    }
    if (field === "longPollTimeoutSec") {
      this.telegramDraftLongPollTimeoutSec = String(value);
      return;
    }
    if (field === "testChatId") {
      this.telegramTestChatId = String(value);
      return;
    }
    if (field === "testMessage") {
      this.telegramTestMessage = String(value);
    }
  }

  private async saveTelegramConfig() {
    if (!this.gateway) {
      return;
    }

    this.telegramWorking = true;
    try {
      this.telegramStatus = (await this.gateway.request("telegram.update", {
        action: "save",
        enabled: this.telegramDraftEnabled,
        botToken: this.telegramDraftToken,
        allowFrom: this.telegramDraftAllowFrom,
        pollIntervalMs: this.telegramDraftPollIntervalMs,
        longPollTimeoutSec: this.telegramDraftLongPollTimeoutSec,
      })) as TelegramStatus;
      this.showToast("telegram settings saved");
      await this.refreshRuntimeSnapshot();
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.telegramWorking = false;
    }
  }

  private async disableTelegram() {
    if (!this.gateway) {
      return;
    }

    this.telegramWorking = true;
    try {
      this.telegramStatus = (await this.gateway.request("telegram.update", {
        action: "disable",
      })) as TelegramStatus;
      this.telegramDraftEnabled = false;
      this.showToast("telegram disabled");
      await this.refreshRuntimeSnapshot();
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.telegramWorking = false;
    }
  }

  private async testTelegram() {
    if (!this.gateway) {
      return;
    }

    this.telegramWorking = true;
    try {
      const result = (await this.gateway.request("telegram.update", {
        action: "test",
        chatId: this.telegramTestChatId,
        message: this.telegramTestMessage,
      })) as TelegramStatus;
      this.telegramStatus = result;
      this.showToast(result.testSent ? "test message sent" : "test message failed");
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.telegramWorking = false;
    }
  }

  private updateAutonomyField(field: string, value: string) {
    if (field === "mode" && (value === "queued" || value === "free-run")) {
      this.autonomyModeDraft = value;
      return;
    }
    if (field === "maxTurns") {
      this.autonomyMaxTurnsDraft = value;
      return;
    }
    if (field === "maxMinutes") {
      this.autonomyMaxMinutesDraft = value;
      return;
    }
    if (field === "scope" && (value === "workspace" || value === "workspace-plus" || value === "full")) {
      this.autonomyScopeDraft = value;
      return;
    }
    if (field === "allowPaths") {
      this.autonomyAllowPathsDraft = value;
    }
  }

  private async runAutonomyAction(action: "enable" | "disable" | "start" | "stop" | "save") {
    if (!this.gateway) {
      return;
    }

    this.autonomyWorking = true;
    try {
      if (action === "save") {
        this.autonomyStatus = (await this.gateway.request("autonomy.update", {
          action: "configure",
          enabled: this.autonomyStatus?.config.enabled ?? false,
          mode: this.autonomyModeDraft,
          maxTurns: this.autonomyMaxTurnsDraft,
          maxMinutes: this.autonomyMaxMinutesDraft,
          scope: this.autonomyScopeDraft,
          allowPaths: this.autonomyAllowPathsDraft,
        })) as AutonomyStatus;
      } else if (action === "start") {
        this.autonomyStatus = (await this.gateway.request("autonomy.update", {
          action: "start",
          mode: this.autonomyModeDraft,
          maxTurns: this.autonomyMaxTurnsDraft,
          maxMinutes: this.autonomyMaxMinutesDraft,
        })) as AutonomyStatus;
      } else {
        this.autonomyStatus = (await this.gateway.request("autonomy.update", {
          action,
        })) as AutonomyStatus;
      }
      await this.refreshRuntimeSnapshot();
      await this.refreshQueueTasks();
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.autonomyWorking = false;
    }
  }

  private updateQueueField(field: string, value: string) {
    if (field === "title") {
      this.queueTitleDraft = value;
      return;
    }
    if (field === "prompt") {
      this.queuePromptDraft = value;
    }
  }

  private async addQueueTask() {
    if (!this.gateway) {
      return;
    }
    const title = this.queueTitleDraft.trim();
    const prompt = this.queuePromptDraft.trim();
    if (!title || !prompt) {
      this.showToast("queue task needs title and prompt");
      return;
    }
    this.queueWorking = true;
    try {
      await this.gateway.request("queue.add", {
        title,
        prompt,
      });
      this.queueTitleDraft = "";
      this.queuePromptDraft = "";
      await this.refreshQueueTasks();
      await this.refreshAutonomyStatus();
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.queueWorking = false;
    }
  }

  private async runNextQueueTask() {
    if (!this.gateway) {
      return;
    }
    this.queueWorking = true;
    try {
      await this.gateway.request("queue.runNext");
      await Promise.all([this.refreshQueueTasks(), this.refreshAutonomyStatus(), this.refreshRuntimeSnapshot()]);
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.queueWorking = false;
    }
  }

  private async clearQueueTasks() {
    if (!this.gateway) {
      return;
    }
    this.queueWorking = true;
    try {
      await this.gateway.request("queue.clear");
      await Promise.all([this.refreshQueueTasks(), this.refreshAutonomyStatus()]);
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.queueWorking = false;
    }
  }

  private async removeQueueTask(id: string) {
    if (!this.gateway) {
      return;
    }
    this.queueWorking = true;
    try {
      await this.gateway.request("queue.remove", { id });
      await this.refreshQueueTasks();
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : String(error));
    } finally {
      this.queueWorking = false;
    }
  }

  private async copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.showToast("copied to clipboard");
    } catch {
      this.showToast("clipboard copy failed");
    }
  }

  private renderActiveTab() {
    if (this.activeTab === "overview") {
      return renderOverviewTab({
        bootstrap: this.bootstrap,
        snapshot: this.runtimeSnapshot,
        auth: this.authStatus,
      });
    }

    if (this.activeTab === "service") {
      return renderServiceTab({
        serviceStatus: this.serviceStatus,
        working: this.serviceWorking,
        onAction: (action) => {
          void this.runServiceAction(action);
        },
      });
    }

    if (this.activeTab === "telegram") {
      return renderTelegramTab({
        status: this.telegramStatus,
        draftEnabled: this.telegramDraftEnabled,
        draftToken: this.telegramDraftToken,
        draftAllowFrom: this.telegramDraftAllowFrom,
        draftPollIntervalMs: this.telegramDraftPollIntervalMs,
        draftLongPollTimeoutSec: this.telegramDraftLongPollTimeoutSec,
        testChatId: this.telegramTestChatId,
        testMessage: this.telegramTestMessage,
        working: this.telegramWorking,
        onField: (field, value) => this.updateTelegramField(field, value),
        onSave: () => {
          void this.saveTelegramConfig();
        },
        onDisable: () => {
          void this.disableTelegram();
        },
        onTest: () => {
          void this.testTelegram();
        },
      });
    }

    if (this.activeTab === "autonomy") {
      return renderAutonomyTab({
        status: this.autonomyStatus,
        working: this.autonomyWorking,
        modeDraft: this.autonomyModeDraft,
        maxTurnsDraft: this.autonomyMaxTurnsDraft,
        maxMinutesDraft: this.autonomyMaxMinutesDraft,
        scopeDraft: this.autonomyScopeDraft,
        allowPathsDraft: this.autonomyAllowPathsDraft,
        onField: (field, value) => {
          this.updateAutonomyField(field, value);
        },
        onAction: (action) => {
          void this.runAutonomyAction(action);
        },
      });
    }

    if (this.activeTab === "queue") {
      return renderQueueTab({
        tasks: this.queueTasks,
        working: this.queueWorking,
        titleDraft: this.queueTitleDraft,
        promptDraft: this.queuePromptDraft,
        onField: (field, value) => {
          this.updateQueueField(field, value);
        },
        onAdd: () => {
          void this.addQueueTask();
        },
        onRunNext: () => {
          void this.runNextQueueTask();
        },
        onClear: () => {
          void this.clearQueueTasks();
        },
        onRemove: (id) => {
          void this.removeQueueTask(id);
        },
      });
    }

    if (this.activeTab === "profile") {
      return renderProfileTab({
        snapshot: this.runtimeSnapshot,
        onCopy: (value) => {
          void this.copyText(value);
        },
      });
    }

    return renderChatTab({
      messages: this.messages,
      runActive: this.runActive,
      gatewayConnected: this.gatewayConnected,
      composerValue: this.composerValue,
      onComposerInput: (value) => {
        this.composerValue = value;
      },
      onSend: () => {
        void this.sendMessage();
      },
      onCancel: () => {
        void this.cancelMessageRun();
      },
    });
  }

  render() {
    const tabs: Array<{ id: TabId; label: string }> = [
      { id: "chat", label: "chat" },
      { id: "overview", label: "overview" },
      { id: "service", label: "service" },
      { id: "telegram", label: "telegram" },
      { id: "autonomy", label: "autonomy" },
      { id: "queue", label: "queue" },
      { id: "profile", label: "profile" },
    ];

    const statusText = this.serviceStatus?.running ? "service running" : "foreground runtime";

    return html`
      <main class="app-shell">
        <header class="header">
          <div class="brand">
            <img src="/kaizen-mascot.png" alt="Kaizen mascot" />
            <div>
              <h1>kaizen control ui</h1>
              <p>premium local workspace for focused shipping</p>
            </div>
          </div>

          <div class="header-right">
            <div class="segmented" role="group" aria-label="Theme mode">
              <button
                class="segmented-button ${this.themeMode === "dark" ? "active" : ""}"
                @click=${() => this.setThemeMode("dark")}
              >
                dark
              </button>
              <button
                class="segmented-button ${this.themeMode === "light" ? "active" : ""}"
                @click=${() => this.setThemeMode("light")}
              >
                light
              </button>
            </div>

            <div class="segmented" role="group" aria-label="Interface density">
              <button
                class="segmented-button ${this.uiDensity === "comfortable" ? "active" : ""}"
                @click=${() => this.setUiDensity("comfortable")}
              >
                comfy
              </button>
              <button
                class="segmented-button ${this.uiDensity === "compact" ? "active" : ""}"
                @click=${() => this.setUiDensity("compact")}
              >
                compact
              </button>
            </div>

            <div class="status-pill">
              ${this.runtimeSnapshot?.runMode ?? this.bootstrap?.runMode ?? "manual"} · ${statusText}
            </div>

            <button
              class="mobile-nav-toggle"
              @click=${() => {
                this.mobileNavOpen = !this.mobileNavOpen;
              }}
            >
              tabs
            </button>
          </div>
        </header>

        <section class="content-layout ${this.mobileNavOpen ? "mobile-nav-open" : ""}">
          <nav class="sidebar" aria-label="Kaizen tabs">
            ${tabs.map(
              (tab) => html`
                <button
                  class="tab-button ${this.activeTab === tab.id ? "active" : ""}"
                  @click=${() => {
                    this.activeTab = tab.id;
                    this.mobileNavOpen = false;
                  }}
                >
                  ${tab.label}
                </button>
              `,
            )}
          </nav>

          <section class="panel-wrap">${this.renderActiveTab()}</section>
        </section>
      </main>

      ${this.toastMessage ? html`<aside class="toast">${this.toastMessage}</aside>` : null}
    `;
  }
}
