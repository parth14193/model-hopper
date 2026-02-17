import * as vscode from "vscode";
import { ProviderId } from "../types";

export class StatusBar {
  private item: vscode.StatusBarItem;
  private activeProvider?: ProviderId;
  private activeModel?: string;
  private manualOverride?: ProviderId;
  private busy = false;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "modelHopper.manualOverride";
    this.item.tooltip = "Model Hopper: click to set manual provider override";
    this.render();
    this.item.show();
  }

  setActiveProvider(provider?: ProviderId, model?: string) {
    this.activeProvider = provider;
    this.activeModel = model;
    this.render();
  }

  setManualOverride(provider?: ProviderId) {
    this.manualOverride = provider;
    this.render();
  }

  setBusy(busy: boolean) {
    this.busy = busy;
    this.render();
  }

  snapshot() {
    return {
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      manualOverride: this.manualOverride,
      busy: this.busy
    };
  }

  private render() {
    const busyPrefix = this.busy ? "$(sync~spin) " : "";
    if (!this.activeProvider) {
      const overrideLabel = this.manualOverride ? ` | override: ${this.manualOverride}` : "";
      this.item.text = `${busyPrefix}Model Hopper: Idle${overrideLabel}`;
      return;
    }
    const modelSuffix = this.activeModel ? ` (${this.activeModel})` : "";
    const overrideSuffix = this.manualOverride ? ` | override: ${this.manualOverride}` : "";
    this.item.text = `${busyPrefix}Model Hopper: ${this.activeProvider}${modelSuffix}${overrideSuffix}`;
  }

  dispose() {
    this.item.dispose();
  }
}
