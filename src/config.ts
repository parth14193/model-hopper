import * as vscode from "vscode";
import * as path from "path";
import { ConfigFile, ProviderConfig, ProviderId } from "./types";

export interface ResolvedConfig {
  apiKeys: Record<ProviderId, string | undefined>;
  priorityOrder: ProviderId[];
  alertThresholdPercent: number;
  quotaRefreshMinutes: number;
  providers: Record<ProviderId, ProviderConfig>;
  configPath?: string;
}

const DEFAULT_PRIORITY: ProviderId[] = ["openai", "anthropic", "gemini"];

export class ConfigManager {
  private cached: ResolvedConfig | undefined;

  constructor(private workspaceFolder?: vscode.WorkspaceFolder) {}

  getCached(): ResolvedConfig | undefined {
    return this.cached;
  }

  async load(): Promise<ResolvedConfig> {
    const config = vscode.workspace.getConfiguration("modelHopper");
    const useConfigFile = config.get<boolean>("useConfigFile", true);
    const configPath = config.get<string>("configPath", ".model-hopper.json");
    let fileConfig: ConfigFile = {};

    if (useConfigFile && this.workspaceFolder) {
      const fullPath = path.join(this.workspaceFolder.uri.fsPath, configPath);
      try {
        const data = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
        fileConfig = JSON.parse(data.toString());
      } catch {
        fileConfig = {};
      }
    }

    const alertThresholdPercent =
      fileConfig.alertThresholdPercent ??
      config.get<number>("alertThresholdPercent", 80);

    const quotaRefreshMinutes =
      fileConfig.quotaRefreshMinutes ??
      config.get<number>("quotaRefreshMinutes", 60);

    const priorityOrder = fileConfig.priorityOrder ?? DEFAULT_PRIORITY;

    const providers: Record<ProviderId, ProviderConfig> = {
      openai: fileConfig.providers?.openai ?? {},
      anthropic: fileConfig.providers?.anthropic ?? {},
      gemini: fileConfig.providers?.gemini ?? {}
    };

    const apiKeys: Record<ProviderId, string | undefined> = {
      openai: fileConfig.apiKeys?.openai,
      anthropic: fileConfig.apiKeys?.anthropic,
      gemini: fileConfig.apiKeys?.gemini
    };

    this.cached = {
      apiKeys,
      priorityOrder,
      alertThresholdPercent,
      quotaRefreshMinutes,
      providers,
      configPath: useConfigFile ? configPath : undefined
    };

    return this.cached;
  }
}
