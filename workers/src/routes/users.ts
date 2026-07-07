import type { Env } from "../lib/env";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleGetUser(_request: Request, env: Env, userId: string) {
  const user = await env.DB.prepare(
    `SELECT id, full_name, avatar_url, kyc_status, trust_score, trust_level, created_at
     FROM users WHERE id = ?`
  ).bind(userId).first<{ id: string; full_name: string; avatar_url: string | null; kyc_status: string; trust_score: number; trust_level: string; created_at: string }>();

  if (!user) return json({ error: "User not found." }, 404);

  const rentalHistory = await env.DB.prepare(
    `SELECT r.id, r.status, r.created_at, r.updated_at,
            p.id AS property_id, p.title, p.photos, p.rent_amount_ngn, p.rent_period, p.city, p.state
     FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.tenant_id = ?
     ORDER BY r.created_at DESC
     LIMIT 20`
  ).bind(userId).all<{ id: string; status: string; created_at: string; updated_at: string; property_id: string; title: string; photos: string; rent_amount_ngn: number; rent_period: string; city: string; state: string }>();

  return json({
    user: {
      id: user.id,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      kycStatus: user.kyc_status,
      trustScore: user.trust_score,
      trustLevel: user.trust_level,
      memberSince: user.created_at,
    },
    rentalHistory: (rentalHistory.results ?? []).map(r => ({
      id: r.id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      propertyId: r.property_id,
      title: r.title,
      photos: r.photos,
      rentAmountNgn: r.rent_amount_ngn,
      rentPeriod: r.rent_period,
      city: r.city,
      state: r.state,
    })),
  });
}
