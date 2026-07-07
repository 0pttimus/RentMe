interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_RPM = {
  default: 60,
  auth: 10,
  wallet: 20,
  escrow: 30,
};

function routeGroup(path: string): keyof typeof MAX_RPM {
  if (path.startsWith("/auth/")) return "auth";
  if (path.startsWith("/wallet/")) return "wallet";
  if (path.startsWith("/escrow/")) return "escrow";
  return "default";
}

export function checkRateLimit(request: Request): Response | null {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const path = new URL(request.url).pathname;
  const group = routeGroup(path);
  const limit = MAX_RPM[group];
  const key = `${ip}:${group}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count++;
  if (bucket.count > limit) {
    return new Response(JSON.stringify({ error: "Too many requests. Try again later." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)) },
    });
  }

  return null;
}

// Evict stale entries every 5 minutes
const EVICT_INTERVAL = 300_000;
let lastEvict = 0;
function evictStale() {
  const now = Date.now();
  if (now - lastEvict < EVICT_INTERVAL) return;
  lastEvict = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function cleanupRateLimitBuckets() {
  evictStale();
}

export function getRateLimitStatus(request: Request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const path = new URL(request.url).pathname;
  const group = routeGroup(path);
  const key = `${ip}:${group}`;
  const bucket = buckets.get(key);
  if (!bucket) return { remaining: MAX_RPM[group], resetIn: 0 };
  const remaining = Math.max(0, MAX_RPM[group] - bucket.count);
  return { remaining, resetIn: Math.max(0, bucket.resetAt - Date.now()) };
}
