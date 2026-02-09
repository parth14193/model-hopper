import Anthropic from "@anthropic-ai/sdk";
import { BaseProvider } from "./base";
import { AIRequest, AIResponse, ProviderConfig, ProviderId, QuotaState } from "../types";
import { QuotaTracker } from "../quota";

export class AnthropicProvider extends BaseProvider {
  id: ProviderId = "anthropic";
  displayName = "Claude";

  private client?: Anthropic;
  private apiKey?: string;
  private config: ProviderConfig;

  constructor(apiKey: string | undefined, config: ProviderConfig, refreshMinutes: number) {
    super(refreshMinutes);
    this.apiKey = apiKey;
    this.config = config;

    if (apiKey) {
      this.client = new Anthropic({
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
      throw new Error("Anthropic API key not configured.");
    }

    const model = req.model ?? this.config.model ?? "claude-3-5-sonnet-latest";
    let message: any;
    let headers: Headers | undefined;

    const clientAny = this.client as any;
    if (clientAny.messages?.withResponse?.create) {
      const result = await clientAny.messages.withResponse.create({
        model,
        max_tokens: 1024,
        temperature: req.temperature,
        messages: [
          {
            role: "user",
            content: req.prompt
          }
        ]
      });
      message = result.data;
      headers = result.response?.headers;
    } else {
      message = await this.client.messages.create({
        model,
        max_tokens: 1024,
        temperature: req.temperature,
        messages: [
          {
            role: "user",
            content: req.prompt
          }
        ]
      });
    }

    if (headers) {
      const next = updateQuotaFromHeaders(headers);
      if (next) {
        this.setQuotaState(next);
      }
    }

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    return {
      text,
      provider: this.id,
      model
    };
  }
}

function updateQuotaFromHeaders(headers: Headers): QuotaState | undefined {
  const remaining = headers.get("anthropic-ratelimit-requests-remaining");
  const limit = headers.get("anthropic-ratelimit-requests-limit");
  if (!remaining || !limit) {
    return undefined;
  }
  const remainingNum = Number(remaining);
  const limitNum = Number(limit);
  if (!Number.isFinite(remainingNum) || !Number.isFinite(limitNum) || limitNum <= 0) {
    return undefined;
  }
  const usedPercent = Math.round(((limitNum - remainingNum) / limitNum) * 100);
  const reset = headers.get("anthropic-ratelimit-requests-reset");
  const resetAt = reset ? Date.parse(reset) : undefined;
  return QuotaTracker.fromUsage(usedPercent, Number.isFinite(resetAt) ? resetAt : undefined);
}
