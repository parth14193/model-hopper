import * as vscode from "vscode";
import { ProviderId } from "./types";

const SECRET_PREFIX = "modelHopper.apiKey.";

export class SecretManager {
  constructor(private context: vscode.ExtensionContext) {}

  async getApiKey(provider: ProviderId): Promise<string | undefined> {
    return this.context.secrets.get(`${SECRET_PREFIX}${provider}`);
  }

  async setApiKey(provider: ProviderId, value: string): Promise<void> {
    await this.context.secrets.store(`${SECRET_PREFIX}${provider}`, value);
  }
}
