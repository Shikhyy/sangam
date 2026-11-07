/**
 * A small in-memory limit on how often one caller can hit a route, so a stray loop or a stranger cannot
 * use up speech credits. It counts per server process, which is enough as a safety net, not as billing.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return function allow(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);

    // Forget callers that have gone quiet so the map cannot grow without bound.
    if (hits.size > 1000) {
      for (const [other, times] of hits) {
        if (times.every((time) => now - time >= windowMs)) hits.delete(other);
      }
    }
    return true;
  };
}

/** Who is calling: the first address in x-forwarded-for, or a shared bucket when there is none. */
export function callerOf(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}
