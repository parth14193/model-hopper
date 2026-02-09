import * as vscode from "vscode";
import { ProviderId } from "../types";

export class StatusBar {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.text = "Model Hopper: Idle";
    this.item.show();
  }

  setActiveProvider(provider?: ProviderId, model?: string) {
    if (!provider) {
      this.item.text = "Model Hopper: Idle";
      return;
    }
    const suffix = model ? ` (${model})` : "";
    this.item.text = `Model Hopper: ${provider}${suffix}`;
  }

  dispose() {
    this.item.dispose();
  }
}
