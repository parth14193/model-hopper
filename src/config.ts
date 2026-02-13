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

    const alertThresholdPercent = normalizePercent(
      fileConfig.alertThresholdPercent ??
        config.get<number>("alertThresholdPercent", 80)
    );

    const quotaRefreshMinutes = normalizePositiveInteger(
      fileConfig.quotaRefreshMinutes ??
        config.get<number>("quotaRefreshMinutes", 60),
      60
    );

    const priorityOrder = normalizePriority(fileConfig.priorityOrder ?? DEFAULT_PRIORITY);

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

function normalizePriority(priority: ProviderId[]): ProviderId[] {
  const unique: ProviderId[] = [];
  for (const id of priority) {
    if (DEFAULT_PRIORITY.includes(id) && !unique.includes(id)) {
      unique.push(id);
    }
  }
  for (const id of DEFAULT_PRIORITY) {
    if (!unique.includes(id)) {
      unique.push(id);
    }
  }
  return unique;
}

function normalizePercent(value: number): number {
  return Math.min(100, Math.max(1, Math.round(value)));
}

function normalizePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.round(value);
}
