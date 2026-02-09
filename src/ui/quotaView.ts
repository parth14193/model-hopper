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
      items.push(new QuotaItem(provider.displayName, provider.getQuotaState()));
    }
    return Promise.resolve(items);
  }
}

class QuotaItem extends vscode.TreeItem {
  constructor(label: string, state?: QuotaState) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = state
      ? `${state.usedPercent}% used`
      : "Unknown";
    this.tooltip = state?.lastError
      ? `Last error: ${state.lastError}`
      : state?.resetAt
      ? `Resets at ${new Date(state.resetAt).toLocaleTimeString()}`
      : undefined;
    this.contextValue = "quotaItem";
  }
}
