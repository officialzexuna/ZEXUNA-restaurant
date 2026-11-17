import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  timestamps: number[];
}

export class SlidingWindowLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  check(key: string, nowMs: number = Date.now()): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    const cutoff = nowMs - this.windowMs;
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

    if (bucket.timestamps.length >= this.maxRequests) {
      const oldest = bucket.timestamps[0] ?? nowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - nowMs) / 1000));
      this.buckets.set(key, bucket);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    bucket.timestamps.push(nowMs);
    this.buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - bucket.timestamps.length),
      retryAfterSeconds: 0,
    };
  }
}

export function createRateLimitMiddleware(maxRequests: number, windowMs: number) {
  const limiter = new SlidingWindowLimiter(maxRequests, windowMs);
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const result = limiter.check(ip);
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }
    next();
  };
}
