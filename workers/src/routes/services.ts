import { requireUser } from "../lib/auth";
import { generateId } from "../lib/session";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleListServices(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT sp.*, u.full_name FROM service_providers sp
     JOIN users u ON u.id = sp.user_id WHERE sp.is_verified = 1`
  ).all();

  const providers = (rows.results ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id,
      name: row.full_name,
      categories: JSON.parse((row.categories as string) || "[]"),
      bio: row.bio,
      rating: row.rating,
      completedJobs: row.completed_jobs,
    };
  });

  return json({ providers });
}

export async function handleBookService(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as {
    providerId?: string;
    category?: string;
    amount?: number;
    scheduledAt?: string;
  };

  if (!body.providerId || !body.category || !body.amount) {
    return json({ error: "providerId, category, and amount required." }, 400);
  }

  const upfront = body.amount * 0.5;
  const wallet = await env.DB.prepare(
    `SELECT id, balance_ngn FROM wallets WHERE user_id = ?`
  ).bind(user.id).first<{ id: string; balance_ngn: number }>();

  if (!wallet || wallet.balance_ngn < upfront) {
    return json({ error: "Insufficient balance for 50% upfront payment." }, 402);
  }

  const bookingId = generateId();
  await env.DB.batch([
    env.DB.prepare(`UPDATE wallets SET balance_ngn = balance_ngn - ? WHERE id = ?`).bind(upfront, wallet.id),
    env.DB.prepare(
      `INSERT INTO service_bookings (id, customer_id, provider_id, category, total_amount_ngn, upfront_amount_ngn, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(bookingId, user.id, body.providerId, body.category, body.amount, upfront, body.scheduledAt ?? new Date().toISOString()),
  ]);

  return json({ success: true, bookingId });
}