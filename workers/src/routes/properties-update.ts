import { requireUser } from "../lib/auth";
import { generateId } from "../lib/session";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleUpdateProperty(
  request: Request,
  env: Env,
  propertyId: string
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  // check ownership
  const existing = await env.DB
    .prepare(`SELECT landlord_id, rent_amount_ngn FROM properties WHERE id = ?`)
    .bind(propertyId)
    .first<{ landlord_id: string; rent_amount_ngn: number }>();

  if (!existing) return json({ error: "Property not found" }, 404);
  if (existing.landlord_id !== user.id) return json({ error: "Unauthorized" }, 403);

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    bedrooms?: number;
    bathrooms?: number;
    rentAmountNgn?: number;
    rentPeriod?: string;
    rentDuration?: number;
    photos?: string[];
  };

  const oldPrice = existing.rent_amount_ngn;

  await env.DB
    .prepare(`
      UPDATE properties SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        bedrooms = COALESCE(?, bedrooms),
        bathrooms = COALESCE(?, bathrooms),
        rent_amount_ngn = COALESCE(?, rent_amount_ngn),
        rent_period = COALESCE(?, rent_period),
        rent_duration = COALESCE(?, rent_duration),
        photos = COALESCE(?, photos)
      WHERE id = ?
    `)
    .bind(
      body.title ?? null,
      body.description ?? null,
      body.bedrooms ?? null,
      body.bathrooms ?? null,
      body.rentAmountNgn ?? null,
      body.rentPeriod ?? null,
      body.rentDuration ?? null,
      body.photos ? JSON.stringify(body.photos) : null,
      propertyId,
    )
    .run();

  // log price change
  if (body.rentAmountNgn && body.rentAmountNgn !== oldPrice) {
    const historyId = generateId();
    await env.DB
      .prepare(`INSERT INTO price_history (id, property_id, price) VALUES (?, ?, ?)`)
      .bind(historyId, propertyId, body.rentAmountNgn)
      .run();
  }

  return json({ success: true });
}

export async function handleDeleteProperty(
  request: Request,
  env: Env,
  propertyId: string
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const existing = await env.DB
    .prepare(`SELECT landlord_id, status FROM properties WHERE id = ?`)
    .bind(propertyId)
    .first<{ landlord_id: string; status: string }>();

  if (!existing) return json({ error: "Property not found" }, 404);
  if (existing.landlord_id !== user.id) return json({ error: "Unauthorized" }, 403);

  await env.DB.prepare(`DELETE FROM properties WHERE id = ?`).bind(propertyId).run();

  return json({ success: true });
}
