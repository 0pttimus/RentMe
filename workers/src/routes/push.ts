import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleVapidPublicKey(request: Request, env: Env) {
  const key = env.VAPID_PUBLIC_KEY;
  if (!key) return json({ error: "VAPID not configured" }, 503);
  return json({ publicKey: key });
}

export async function handlePushSubscribe(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  let body: { endpoint?: string; keys?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.endpoint) return json({ error: "Missing endpoint" }, 400);

  const subKey = `push:${user.id}`;
  await env.KV.put(subKey, JSON.stringify(body));
  return json({ ok: true });
}

export async function handlePushUnsubscribe(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const subKey = `push:${user.id}`;
  await env.KV.delete(subKey);
  return json({ ok: true });
}
