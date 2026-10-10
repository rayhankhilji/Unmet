import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Fixed-window limits keyed by hashed IP (G-SEC-06). `memory` locally and in tests,
// `upstash` in production where functions don't share memory.

export type LimitResult = { success: boolean; retryAfterSeconds: number };
export interface Limiter {
  limit(key: string): Promise<LimitResult>;
}

export type LimitRule = { name: string; max: number; windowSeconds: number };

export const LIMITS = {
  adminSession: { name: "admin-session", max: 5, windowSeconds: 15 * 60 },
  liveRunsPerDay: { name: "live-runs", max: 3, windowSeconds: 24 * 60 * 60 },
  global: { name: "global", max: 120, windowSeconds: 60 },
} as const satisfies Record<string, LimitRule>;

export class MemoryLimiter implements Limiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly rule: LimitRule,
    private readonly now: () => number = Date.now,
  ) {}

  async limit(key: string): Promise<LimitResult> {
    const now = this.now();
    const windowMs = this.rule.windowSeconds * 1000;
    const start = Math.floor(now / windowMs) * windowMs;
    const current = this.windows.get(key);
    const window = current && current.start === start ? current : { start, count: 0 };
    window.count += 1;
    this.windows.set(key, window);
    const success = window.count <= this.rule.max;
    return { success, retryAfterSeconds: success ? 0 : Math.ceil((start + windowMs - now) / 1000) };
  }
}

export class UpstashLimiter implements Limiter {
  private readonly ratelimit: Ratelimit;

  constructor(rule: LimitRule, url: string, token: string) {
    this.ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.fixedWindow(rule.max, `${rule.windowSeconds} s`),
      prefix: `unmet:${rule.name}`,
    });
  }

  async limit(key: string): Promise<LimitResult> {
    const res = await this.ratelimit.limit(key);
    return {
      success: res.success,
      retryAfterSeconds: res.success ? 0 : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
    };
  }
}

export type LimiterConfig = {
  RATE_LIMIT_DRIVER: "memory" | "upstash";
  UPSTASH_REDIS_REST_URL?: string | undefined;
  UPSTASH_REDIS_REST_TOKEN?: string | undefined;
};

const limiters = new Map<string, Limiter>();

export function limiterFor(rule: LimitRule, config: LimiterConfig): Limiter {
  const existing = limiters.get(rule.name);
  if (existing) return existing;
  const created =
    config.RATE_LIMIT_DRIVER === "upstash" &&
    config.UPSTASH_REDIS_REST_URL &&
    config.UPSTASH_REDIS_REST_TOKEN
      ? new UpstashLimiter(rule, config.UPSTASH_REDIS_REST_URL, config.UPSTASH_REDIS_REST_TOKEN)
      : new MemoryLimiter(rule);
  limiters.set(rule.name, created);
  return created;
}

/** Test hook: forget limiter state between tests. */
export function resetLimiters(): void {
  limiters.clear();
}
