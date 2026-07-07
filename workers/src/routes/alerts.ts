import { requireUser } from "../lib/auth";
import { generateId } from "../lib/session";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleSubscribeAlert(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { propertyId?: string };
  if (!body.propertyId) return json({ error: "propertyId required." }, 400);

  const property = await env.DB.prepare(`SELECT id FROM properties WHERE id = ?`).bind(body.propertyId).first();
  if (!property) return json({ error: "Property not found." }, 404);

  const existing = await env.DB.prepare(
    `SELECT id FROM property_alerts WHERE user_id = ? AND property_id = ?`
  ).bind(user.id, body.propertyId).first();
  if (existing) return json({ success: true });

  await env.DB.prepare(
    `INSERT INTO property_alerts (id, user_id, property_id) VALUES (?, ?, ?)`
  ).bind(generateId(), user.id, body.propertyId).run();

  return json({ success: true });
}

export async function handleUnsubscribeAlert(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (!propertyId) return json({ error: "propertyId required." }, 400);

  await env.DB.prepare(
    `DELETE FROM property_alerts WHERE user_id = ? AND property_id = ?`
  ).bind(user.id, propertyId).run();

  return json({ success: true });
}

export async function handleGetAlertStatus(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (!propertyId) return json({ error: "propertyId required." }, 400);

  const existing = await env.DB.prepare(
    `SELECT id FROM property_alerts WHERE user_id = ? AND property_id = ?`
  ).bind(user.id, propertyId).first();

  return json({ subscribed: !!existing });
}
