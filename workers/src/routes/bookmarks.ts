import { requireUser } from "../lib/auth";
import { generateId } from "../lib/session";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleListBookmarks(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const rows = await env.DB
    .prepare(`
      SELECT b.id AS bookmark_id, b.property_id, b.created_at,
             p.title, p.property_type, p.city, p.state, p.rent_amount_ngn, p.photos, p.status, p.is_verified
      FROM bookmarks b
      JOIN properties p ON p.id = b.property_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `)
    .bind(user.id)
    .all();

  return json({ bookmarks: rows.results ?? [] });
}

export async function handleAddBookmark(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { propertyId: string };
  if (!body.propertyId) return json({ error: "propertyId required" }, 400);

  const existing = await env.DB
    .prepare(`SELECT id FROM bookmarks WHERE user_id = ? AND property_id = ?`)
    .bind(user.id, body.propertyId)
    .first();

  if (existing) return json({ success: true });

  const id = generateId();
  await env.DB
    .prepare(`INSERT INTO bookmarks (id, user_id, property_id) VALUES (?, ?, ?)`)
    .bind(id, user.id, body.propertyId)
    .run();

  return json({ success: true, bookmarkId: id });
}

export async function handleRemoveBookmark(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (!propertyId) return json({ error: "propertyId required" }, 400);

  await env.DB
    .prepare(`DELETE FROM bookmarks WHERE user_id = ? AND property_id = ?`)
    .bind(user.id, propertyId)
    .run();

  return json({ success: true });
}

export async function handleGetBookmarkStatus(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (!propertyId) return json({ error: "propertyId required" }, 400);

  const row = await env.DB
    .prepare(`SELECT id FROM bookmarks WHERE user_id = ? AND property_id = ?`)
    .bind(user.id, propertyId)
    .first();

  return json({ bookmarked: !!row });
}
