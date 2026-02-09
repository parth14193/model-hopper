import * as vscode from "vscode";

export class Logger {
  private channel: vscode.OutputChannel;

  constructor() {
    this.channel = vscode.window.createOutputChannel("Model Hopper");
  }

  info(message: string) {
    this.channel.appendLine(`[INFO] ${message}`);
  }

  warn(message: string) {
    this.channel.appendLine(`[WARN] ${message}`);
  }

  error(message: string) {
    this.channel.appendLine(`[ERROR] ${message}`);
  }

  show() {
    this.channel.show();
  }
}
