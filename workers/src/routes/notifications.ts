import { requireUser } from "../lib/auth";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const FREELANCE_TYPES = [
  "payment_received", "new_order", "order_cancelled",
  "hire_request", "hire_accepted", "hire_declined",
  "job_completed", "review_received",
];

export async function handleListNotifications(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");

  let sql = `SELECT id, title, body, type, read, created_at FROM notifications WHERE user_id = ?`;
  const params: unknown[] = [user.id];

  if (scope === "freelance") {
    sql += ` AND type IN (${FREELANCE_TYPES.map(() => "?").join(",")})`;
    params.push(...FREELANCE_TYPES);
  } else {
    sql += ` AND type NOT IN (${FREELANCE_TYPES.map(() => "?").join(",")})`;
    params.push(...FREELANCE_TYPES);
  }

  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const rows = await env.DB.prepare(sql).bind(...params).all();

  return json({ notifications: rows.results ?? [] });
}

export async function handleMarkNotificationRead(request: Request, env: Env, id: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  await env.DB.prepare(
    `UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`
  ).bind(id, user.id).run();

  return json({ success: true });
}

export async function handleUnreadCount(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0`
  ).bind(user.id).first<{ count: number }>();

  return json({ count: row?.count ?? 0 });
}