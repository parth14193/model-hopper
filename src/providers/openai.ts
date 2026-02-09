import OpenAI from "openai";
import { BaseProvider } from "./base";
import { AIRequest, AIResponse, ProviderConfig, ProviderId, QuotaState } from "../types";
import { QuotaTracker } from "../quota";

export class OpenAIProvider extends BaseProvider {
  id: ProviderId = "openai";
  displayName = "OpenAI";

  private client?: OpenAI;
  private apiKey?: string;
  private config: ProviderConfig;

  constructor(apiKey: string | undefined, config: ProviderConfig, refreshMinutes: number) {
    super(refreshMinutes);
    this.apiKey = apiKey;
    this.config = config;

    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: config.baseUrl
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async checkQuota(): Promise<QuotaState> {
    const existing = this.getQuotaState();
    if (existing) {
      return existing;
    }
    const state = QuotaTracker.fromUsage(0);
    this.setQuotaState(state);
    return state;
  }

  async sendRequest(req: AIRequest): Promise<AIResponse> {
    if (!this.client) {
      throw new Error("OpenAI API key not configured.");
    }

    const model = req.model ?? this.config.model ?? "gpt-4.1-mini";
    let data: any;
    let headers: Headers | undefined;

    const clientAny = this.client as any;
    if (clientAny.responses?.withResponse?.create) {
      const result = await clientAny.responses.withResponse.create({
        model,
        input: req.prompt,
        temperature: req.temperature
      });
      data = result.data;
      headers = result.response?.headers;
    } else {
      data = await this.client.responses.create({
        model,
        input: req.prompt,
        temperature: req.temperature
      });
    }

    if (headers) {
      const next = updateQuotaFromHeaders(headers);
      if (next) {
        this.setQuotaState(next);
      }
    }

    const text = (data.output_text ?? "").trim();
    return {
      text,
      provider: this.id,
      model
    };
  }
}

function updateQuotaFromHeaders(headers: Headers): QuotaState | undefined {
  const remaining = headers.get("x-ratelimit-remaining-requests");
  const limit = headers.get("x-ratelimit-limit-requests");
  if (!remaining || !limit) {
    return undefined;
  }
  const remainingNum = Number(remaining);
  const limitNum = Number(limit);
  if (!Number.isFinite(remainingNum) || !Number.isFinite(limitNum) || limitNum <= 0) {
    return undefined;
  }
  const usedPercent = Math.round(((limitNum - remainingNum) / limitNum) * 100);
  const reset = headers.get("x-ratelimit-reset-requests");
  const resetAt = reset ? Date.now() + parseResetSeconds(reset) * 1000 : undefined;
  return QuotaTracker.fromUsage(usedPercent, resetAt);
}

function parseResetSeconds(value: string): number {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return 0;
}
