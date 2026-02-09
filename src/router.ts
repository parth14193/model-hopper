import { Logger } from "./logging";
import { AIRequest, AIResponse, ProviderClient, ProviderId, QuotaState } from "./types";

export interface RoutingOptions {
  priorityOrder: ProviderId[];
  alertThresholdPercent: number;
  manualOverride?: ProviderId;
  onAutoSwitch?: (from: ProviderId, to: ProviderId) => void;
}

export class ProviderRouter {
  constructor(
    private providers: Map<ProviderId, ProviderClient>,
    private logger: Logger
  ) {}

  getProvider(id: ProviderId): ProviderClient | undefined {
    return this.providers.get(id);
  }

  async routeRequest(req: AIRequest, options: RoutingOptions): Promise<AIResponse> {
    const ordered = this.buildPriorityList(options.priorityOrder, options.manualOverride);
    let lastError: Error | undefined;

    for (const id of ordered) {
      const provider = this.providers.get(id);
      if (!provider) {
        continue;
      }

      if (!provider.isConfigured()) {
        this.logger.warn(`${provider.displayName} not configured. Skipping.`);
        continue;
      }

      const quota = await provider.checkQuota();
      if (this.isQuotaExceeded(quota, options.alertThresholdPercent)) {
        this.logger.warn(`${provider.displayName} quota exceeded. Skipping.`);
        const next = this.nextProvider(ordered, id);
        if (next && options.onAutoSwitch) {
          options.onAutoSwitch(id, next);
        }
        continue;
      }

      try {
        const response = await provider.sendRequest(req);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error;
        const authFailed = this.isAuthError(error);
        provider.setQuotaState({
          lastUpdated: Date.now(),
          usedPercent: quota.usedPercent,
          remainingPercent: quota.remainingPercent,
          resetAt: quota.resetAt,
          authFailed,
          lastError: error.message
        });

        if (authFailed) {
          this.logger.warn(`${provider.displayName} auth failure. Trying next provider.`);
        } else {
          this.logger.warn(`${provider.displayName} failed: ${error.message}`);
        }

        const next = this.nextProvider(ordered, id);
        if (next && options.onAutoSwitch) {
          options.onAutoSwitch(id, next);
        }
      }
    }

    throw lastError ?? new Error("No providers available.");
  }

  private buildPriorityList(priority: ProviderId[], override?: ProviderId): ProviderId[] {
    if (!override) {
      return priority;
    }
    const remaining = priority.filter((id) => id !== override);
    return [override, ...remaining];
  }

  private isQuotaExceeded(state: QuotaState, threshold: number): boolean {
    return state.usedPercent >= threshold || state.remainingPercent <= 100 - threshold;
  }

  private isAuthError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("unauthorized") ||
      message.includes("invalid api key") ||
      message.includes("authentication") ||
      message.includes("401")
    );
  }

  private nextProvider(order: ProviderId[], current: ProviderId): ProviderId | undefined {
    const index = order.indexOf(current);
    if (index === -1 || index + 1 >= order.length) {
      return undefined;
    }
    return order[index + 1];
  }
}
