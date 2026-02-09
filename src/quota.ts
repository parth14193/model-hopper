import { QuotaState } from "./types";

export class QuotaTracker {
  private state: QuotaState | undefined;
  private refreshMs: number;

  constructor(refreshMinutes: number) {
    this.refreshMs = Math.max(1, refreshMinutes) * 60 * 1000;
  }

  getState(): QuotaState | undefined {
    return this.state;
  }

  setState(state: QuotaState) {
    this.state = state;
  }

  refreshIfNeeded() {
    if (!this.state) {
      return;
    }
    const now = Date.now();
    if (now - this.state.lastUpdated >= this.refreshMs) {
      this.state = {
        lastUpdated: now,
        usedPercent: 0,
        remainingPercent: 100
      };
    }
  }

  static fromUsage(usedPercent: number, resetAt?: number, lastError?: string): QuotaState {
    const safeUsed = Math.min(100, Math.max(0, usedPercent));
    return {
      lastUpdated: Date.now(),
      usedPercent: safeUsed,
      remainingPercent: Math.max(0, 100 - safeUsed),
      resetAt,
      lastError
    };
  }
}
