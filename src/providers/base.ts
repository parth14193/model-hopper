import { ProviderClient, ProviderId, QuotaState } from "../types";
import { QuotaTracker } from "../quota";

export abstract class BaseProvider implements ProviderClient {
  abstract id: ProviderId;
  abstract displayName: string;

  protected quota: QuotaTracker;

  constructor(refreshMinutes: number) {
    this.quota = new QuotaTracker(refreshMinutes);
  }

  getQuotaState(): QuotaState | undefined {
    this.quota.refreshIfNeeded();
    return this.quota.getState();
  }

  setQuotaState(state: QuotaState): void {
    this.quota.setState(state);
  }

  abstract isConfigured(): boolean;
  abstract checkQuota(): Promise<QuotaState>;
  abstract sendRequest(req: { prompt: string; model?: string; temperature?: number }): Promise<{
    text: string;
    provider: ProviderId;
    model?: string;
  }>;
}
