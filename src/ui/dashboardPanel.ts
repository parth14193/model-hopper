import * as vscode from "vscode";
import { ProviderClient, ProviderId, QuotaState } from "../types";

type ProviderSnapshot = {
  id: ProviderId;
  name: string;
  configured: boolean;
  quota?: QuotaState;
};

type DashboardState = {
  activeProvider?: ProviderId;
  activeModel?: string;
  manualOverride?: ProviderId;
  busy: boolean;
  providers: ProviderSnapshot[];
  generatedAt: number;
};

export class DashboardPanel {
  private static currentPanel: DashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private interval: NodeJS.Timeout;

  static revealOrCreate(
    providers: Map<ProviderId, ProviderClient>,
    getState: () => {
      activeProvider?: ProviderId;
      activeModel?: string;
      manualOverride?: ProviderId;
      busy: boolean;
    }
  ) {
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      DashboardPanel.currentPanel.pushUpdate();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "modelHopper.dashboard",
      "Model Hopper Dashboard",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    DashboardPanel.currentPanel = new DashboardPanel(panel, providers, getState);
  }

  static refreshIfOpen() {
    DashboardPanel.currentPanel?.pushUpdate();
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private providers: Map<ProviderId, ProviderClient>,
    private getState: () => {
      activeProvider?: ProviderId;
      activeModel?: string;
      manualOverride?: ProviderId;
      busy: boolean;
    }
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getHtml(this.panel.webview);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      async (message: { type?: string }) => {
        if (message.type === "manualOverride") {
          await vscode.commands.executeCommand("modelHopper.manualOverride");
        } else if (message.type === "refreshProviders") {
          await vscode.commands.executeCommand("modelHopper.refreshProviders");
        }
      },
      null,
      this.disposables
    );

    this.interval = setInterval(() => this.pushUpdate(), 4000);
    this.pushUpdate();
  }

  dispose() {
    DashboardPanel.currentPanel = undefined;
    clearInterval(this.interval);
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  private collectState(): DashboardState {
    const status = this.getState();
    const providers = Array.from(this.providers.values()).map((provider) => ({
      id: provider.id,
      name: provider.displayName,
      configured: provider.isConfigured(),
      quota: provider.getQuotaState()
    }));
    return {
      ...status,
      providers,
      generatedAt: Date.now()
    };
  }

  private pushUpdate() {
    if (!this.panel.visible) {
      return;
    }
    const state = this.collectState();
    this.panel.webview.postMessage({ type: "update", payload: state });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = String(Date.now());
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Model Hopper Dashboard</title>
  <style>
    :root {
      --accent: #0089d6;
      --accent-soft: #8fd3ff;
      --warn: #d97706;
      --danger: #b42318;
      --surface: color-mix(in srgb, var(--vscode-editor-background) 92%, #0c2230 8%);
      --surface-2: color-mix(in srgb, var(--vscode-editor-background) 84%, #12374d 16%);
      --text: var(--vscode-editor-foreground);
      --text-muted: color-mix(in srgb, var(--vscode-editor-foreground) 62%, transparent);
      --border: color-mix(in srgb, var(--vscode-editor-foreground) 20%, transparent);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      background:
        radial-gradient(circle at 20% -10%, rgba(0, 137, 214, 0.22), transparent 40%),
        radial-gradient(circle at 95% 10%, rgba(217, 119, 6, 0.14), transparent 38%),
        var(--vscode-editor-background);
      font-family: "Segoe UI Variable Display", "Bahnschrift", "Trebuchet MS", sans-serif;
    }
    .layout {
      padding: 16px;
      display: grid;
      gap: 14px;
    }
    .hero {
      background: linear-gradient(120deg, var(--surface), var(--surface-2));
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 16px;
      display: grid;
      gap: 8px;
    }
    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .title {
      margin: 0;
      font-size: 18px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .badge {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      color: var(--text-muted);
      background: color-mix(in srgb, var(--surface) 70%, transparent);
    }
    .controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    button {
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--surface) 90%, #1a4f6e 10%);
      color: var(--text);
      border-radius: 10px;
      padding: 6px 10px;
      font: inherit;
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease;
    }
    button:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px;
      background: color-mix(in srgb, var(--surface) 92%, transparent);
      animation: rise 200ms ease;
    }
    .card h3 {
      margin: 0 0 6px;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .meta {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .progress {
      height: 8px;
      border-radius: 99px;
      background: color-mix(in srgb, var(--surface-2) 70%, transparent);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      width: 0;
      border-radius: inherit;
      transition: width 280ms ease;
      background: linear-gradient(90deg, var(--accent), var(--accent-soft));
    }
    .fill.warn {
      background: linear-gradient(90deg, #e7a634, #f6d08a);
    }
    .fill.danger {
      background: linear-gradient(90deg, #d55144, #e9a49d);
    }
    .err {
      margin-top: 8px;
      font-size: 12px;
      color: color-mix(in srgb, var(--danger) 90%, var(--text) 10%);
      word-break: break-word;
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="layout">
    <section class="hero">
      <div class="hero-top">
        <h1 class="title">Model Hopper</h1>
        <span id="updated" class="badge">Waiting for data</span>
      </div>
      <div id="summary" class="meta">No active request yet.</div>
      <div class="controls">
        <button id="overrideBtn" type="button">Manual Override</button>
        <button id="refreshBtn" type="button">Reload Providers</button>
      </div>
    </section>
    <section id="providers" class="stats"></section>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function quotaMeta(provider) {
      if (!provider.configured) return "Not configured";
      if (!provider.quota) return "No quota sample yet";
      const q = provider.quota;
      const reset = q.resetAt ? new Date(q.resetAt).toLocaleTimeString() : "Unknown reset";
      return q.authFailed ? "Auth failed" : "Resets " + reset;
    }

    function fillClass(percent) {
      if (percent >= 90) return "fill danger";
      if (percent >= 75) return "fill warn";
      return "fill";
    }

    function summaryText(state) {
      const active = state.activeProvider ? state.activeProvider : "idle";
      const model = state.activeModel ? " (" + state.activeModel + ")" : "";
      const override = state.manualOverride ? " | override: " + state.manualOverride : "";
      const busy = state.busy ? " | handling request" : "";
      return "Active: " + active + model + override + busy;
    }

    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg || msg.type !== "update") return;
      const state = msg.payload;

      document.getElementById("updated").textContent =
        "Updated " + new Date(state.generatedAt).toLocaleTimeString();
      document.getElementById("summary").textContent = summaryText(state);

      const container = document.getElementById("providers");
      container.innerHTML = "";
      state.providers.forEach((provider) => {
        const used = provider.quota ? provider.quota.usedPercent : 0;
        const remaining = provider.quota ? provider.quota.remainingPercent : 0;
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML =
          "<h3><span>" + provider.name + "</span><span>" + used + "%</span></h3>" +
          "<div class='meta'>" + quotaMeta(provider) + "</div>" +
          "<div class='progress'><div class='" + fillClass(used) + "' style='width: " + used + "%'></div></div>" +
          "<div class='meta'>Remaining: " + remaining + "%</div>";

        if (provider.quota && provider.quota.lastError) {
          const err = document.createElement("div");
          err.className = "err";
          err.textContent = provider.quota.lastError;
          card.appendChild(err);
        }
        container.appendChild(card);
      });
    });

    document.getElementById("overrideBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "manualOverride" });
    });
    document.getElementById("refreshBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "refreshProviders" });
    });
  </script>
</body>
</html>`;
  }
}
