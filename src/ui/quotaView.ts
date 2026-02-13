import * as vscode from "vscode";
import { ProviderClient, ProviderId, QuotaState } from "../types";

export class QuotaViewProvider implements vscode.TreeDataProvider<QuotaItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<QuotaItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private providers: Map<ProviderId, ProviderClient>) {}

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: QuotaItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<QuotaItem[]> {
    const items: QuotaItem[] = [];
    for (const provider of this.providers.values()) {
      items.push(
        new QuotaItem(provider.displayName, provider.getQuotaState(), provider.isConfigured())
      );
    }
    return Promise.resolve(items);
  }
}

class QuotaItem extends vscode.TreeItem {
  constructor(label: string, state?: QuotaState, isConfigured = true) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "quotaItem";
    if (!isConfigured) {
      this.description = "Not configured";
      this.tooltip = "API key is not configured.";
      return;
    }

    this.description = state ? `${state.usedPercent}% used` : "Unknown";
    this.tooltip = state?.lastError
      ? `Last error: ${state.lastError}`
      : state?.resetAt
        ? `Resets at ${new Date(state.resetAt).toLocaleTimeString()}`
        : "No recent requests.";

    if (state?.authFailed) {
      this.description = `${this.description} | Auth failed`;
    }
  }
}
