import * as vscode from "vscode";
import { ConfigManager } from "./config";
import { Logger } from "./logging";
import { ProviderRouter } from "./router";
import { SecretManager } from "./secret";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";
import { QuotaViewProvider } from "./ui/quotaView";
import { StatusBar } from "./ui/statusBar";
import { AIRequest, ProviderClient, ProviderId } from "./types";

const OVERRIDE_KEY = "modelHopper.manualOverride";

export async function activate(context: vscode.ExtensionContext) {
  const logger = new Logger();
  const statusBar = new StatusBar();
  const secretManager = new SecretManager(context);
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const configManager = new ConfigManager(workspaceFolder);

  const providers = new Map<ProviderId, ProviderClient>();
  let router = new ProviderRouter(providers, logger);
  const quotaView = new QuotaViewProvider(providers);
  vscode.window.registerTreeDataProvider("modelHopper.quotaView", quotaView);

  const loadProviders = async () => {
    const config = await configManager.load();

    const apiKeys = { ...config.apiKeys };
    for (const id of Object.keys(apiKeys) as ProviderId[]) {
      if (apiKeys[id]) {
        await secretManager.setApiKey(id, apiKeys[id] as string);
      } else {
        apiKeys[id] = await secretManager.getApiKey(id);
      }
    }

    providers.clear();
    providers.set(
      "openai",
      new OpenAIProvider(apiKeys.openai, config.providers.openai, config.quotaRefreshMinutes)
    );
    providers.set(
      "anthropic",
      new AnthropicProvider(apiKeys.anthropic, config.providers.anthropic, config.quotaRefreshMinutes)
    );
    providers.set(
      "gemini",
      new GeminiProvider(apiKeys.gemini, config.providers.gemini, config.quotaRefreshMinutes)
    );

    router = new ProviderRouter(providers, logger);
    quotaView.refresh();
  };

  await loadProviders();

  const manualOverride = () => context.globalState.get<ProviderId | undefined>(OVERRIDE_KEY);

  const onAutoSwitch = (from: ProviderId, to: ProviderId) => {
    logger.warn(`Auto-switched from ${from} to ${to}.`);
    vscode.window.showInformationMessage(`Model Hopper auto-switched from ${from} to ${to}.`);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("modelHopper.manualOverride", async () => {
      const items = [
        { label: "Clear override", id: undefined },
        { label: "OpenAI", id: "openai" },
        { label: "Claude", id: "anthropic" },
        { label: "Gemini", id: "gemini" }
      ];

      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a provider override"
      });
      if (!pick) {
        return;
      }
      await context.globalState.update(OVERRIDE_KEY, pick.id);
      if (pick.id) {
        logger.info(`Manual override set to ${pick.id}.`);
      } else {
        logger.info("Manual override cleared.");
      }
      quotaView.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("modelHopper.testRequest", async () => {
      const input = await vscode.window.showInputBox({
        prompt: "Enter a prompt to test provider switching",
        placeHolder: "Summarize the diff in my last commit."
      });
      if (!input) {
        return;
      }

      const config = configManager.getCached() ?? (await configManager.load());
      const request: AIRequest = { prompt: input };

      try {
        const response = await router.routeRequest(request, {
          priorityOrder: config.priorityOrder,
          alertThresholdPercent: config.alertThresholdPercent,
          manualOverride: manualOverride(),
          onAutoSwitch
        });

        statusBar.setActiveProvider(response.provider, response.model);
        quotaView.refresh();
        logger.info(`Request handled by ${response.provider}.`);
        vscode.window.showInformationMessage(`Response from ${response.provider}: ${response.text}`);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error(`Request failed: ${error}`);
        vscode.window.showErrorMessage(`Model Hopper failed: ${error}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("modelHopper.openConfig", async () => {
      const config = configManager.getCached() ?? (await configManager.load());
      if (!workspaceFolder || !config.configPath) {
        vscode.window.showWarningMessage("No workspace or config path set.");
        return;
      }
      const configUri = vscode.Uri.joinPath(workspaceFolder.uri, config.configPath);
      try {
        await vscode.workspace.fs.stat(configUri);
      } catch {
        const sample = getSampleConfig();
        await vscode.workspace.fs.writeFile(configUri, Buffer.from(sample, "utf8"));
      }
      const doc = await vscode.workspace.openTextDocument(configUri);
      await vscode.window.showTextDocument(doc);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("modelHopper")) {
        await loadProviders();
      }
    })
  );

  context.subscriptions.push(statusBar);
  logger.info("Model Hopper activated.");
}

export function deactivate() {}

function getSampleConfig(): string {
  return JSON.stringify(
    {
      apiKeys: {
        openai: "sk-...",
        anthropic: "sk-ant-...",
        gemini: "AIza..."
      },
      priorityOrder: ["openai", "anthropic", "gemini"],
      quotaRefreshMinutes: 60,
      alertThresholdPercent: 80,
      providers: {
        openai: {
          model: "gpt-4.1-mini"
        },
        anthropic: {
          model: "claude-3-5-sonnet-latest"
        },
        gemini: {
          model: "gemini-1.5-pro"
        }
      }
    },
    null,
    2
  );
}
