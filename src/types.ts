export type ProviderId = "openai" | "anthropic" | "gemini";

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
}

export interface AIResponse {
  text: string;
  provider: ProviderId;
  model?: string;
}

export interface QuotaState {
  lastUpdated: number;
  usedPercent: number;
  remainingPercent: number;
  resetAt?: number;
  authFailed?: boolean;
  lastError?: string;
}

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface ConfigFile {
  apiKeys?: Record<ProviderId, string>;
  priorityOrder?: ProviderId[];
  quotaRefreshMinutes?: number;
  alertThresholdPercent?: number;
  providers?: Record<ProviderId, ProviderConfig>;
}

export interface ProviderClient {
  id: ProviderId;
  displayName: string;
  isConfigured(): boolean;
  getQuotaState(): QuotaState | undefined;
  setQuotaState(state: QuotaState): void;
  checkQuota(): Promise<QuotaState>;
  sendRequest(req: AIRequest): Promise<AIResponse>;
}
