import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseProvider } from "./base";
import { AIRequest, AIResponse, ProviderConfig, ProviderId, QuotaState } from "../types";
import { QuotaTracker } from "../quota";

export class GeminiProvider extends BaseProvider {
  id: ProviderId = "gemini";
  displayName = "Gemini";

  private client?: GoogleGenerativeAI;
  private apiKey?: string;
  private config: ProviderConfig;

  constructor(apiKey: string | undefined, config: ProviderConfig, refreshMinutes: number) {
    super(refreshMinutes);
    this.apiKey = apiKey;
    this.config = config;

    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
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
      throw new Error("Gemini API key not configured.");
    }

    const model = req.model ?? this.config.model ?? "gemini-1.5-pro";
    const generativeModel = this.client.getGenerativeModel({ model });
    const result = await generativeModel.generateContent(req.prompt);
    const response = await result.response;
    const text = response.text().trim();

    return {
      text,
      provider: this.id,
      model
    };
  }
}
