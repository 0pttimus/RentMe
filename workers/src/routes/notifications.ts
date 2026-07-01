import { requireUser } from "../lib/auth";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleListNotifications(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const rows = await env.DB.prepare(
    `SELECT id, title, body, type, read, created_at FROM notifications
     WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(user.id).all();

  return json({ notifications: rows.results ?? [] });
}