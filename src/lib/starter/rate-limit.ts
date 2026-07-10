import "server-only";

// In-memory sliding-window limiter for the anonymous starter endpoint. Resets on
// server restart and doesn't coordinate across instances — acceptable for this
// pass; a Redis-backed limiter is on the roadmap once traffic justifies it.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - timestamps[0]) };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}
