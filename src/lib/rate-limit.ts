interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Periodic memory cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  // Optional Upstash Redis Integration for Serverless/Distributed Deployment
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const redisKey = `nox_rl:${key}:${Math.floor(now / windowSeconds)}`;
      const res = await fetch(`${upstashUrl}/incr/${redisKey}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const currentCount = data.result;
        if (currentCount === 1) {
          // Set expiry on first increment
          await fetch(`${upstashUrl}/expire/${redisKey}/${windowSeconds}`, {
            headers: { Authorization: `Bearer ${upstashToken}` },
          });
        }
        const remaining = Math.max(0, limit - currentCount);
        return {
          success: currentCount <= limit,
          remaining,
          reset: now + windowSeconds,
        };
      }
    } catch (error) {
      console.warn("[RateLimit] Upstash Redis check failed, falling back to in-memory store:", error);
    }
  }

  // Robust In-Memory Sliding Window
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: limit - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  return {
    success: entry.count <= limit,
    remaining,
    reset: Math.ceil(entry.resetAt / 1000),
  };
}