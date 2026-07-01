import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function requireAdmin(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;
  if (user.role !== "admin") {
    return json({ error: "Admin only." }, 403);
  }
  return user;
}

export async function handleAdminStats(request: Request, env: Env) {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const [users, properties, reports, reservations] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as c FROM users`).first<{ c: number }>(),
    env.DB.prepare(`SELECT COUNT(*) as c FROM properties`).first<{ c: number }>(),
    env.DB.prepare(`SELECT COUNT(*) as c FROM fraud_reports WHERE status = 'open'`).first<{ c: number }>(),
    env.DB.prepare(`SELECT COUNT(*) as c FROM reservations WHERE status = 'active'`).first<{ c: number }>(),
  ]);

  return json({
    users: users?.c ?? 0,
    properties: properties?.c ?? 0,
    openReports: reports?.c ?? 0,
    activeReservations: reservations?.c ?? 0,
  });
}

export async function handleAdminReports(request: Request, env: Env) {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const rows = await env.DB.prepare(
    `SELECT fr.*, u.full_name as reporter_name FROM fraud_reports fr
     JOIN users u ON u.id = fr.reporter_id ORDER BY fr.created_at DESC LIMIT 50`
  ).all();

  return json({ reports: rows.results ?? [] });
}

export async function handleAdminResolveReport(request: Request, env: Env) {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { reportId?: string; action?: string };
  if (!body.reportId) return json({ error: "reportId required" }, 400);

  await env.DB.prepare(
    `UPDATE fraud_reports SET status = ?, resolved_at = datetime('now') WHERE id = ?`
  ).bind(body.action === "dismiss" ? "dismissed" : "resolved", body.reportId).run();

  return json({ success: true });
}

export async function handleAdminReleaseEscrow(request: Request, env: Env) {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as {
    reservationId?: string;
    action?: "landlord" | "refund";
  };

  if (!body.reservationId || !body.action) {
    return json({ error: "reservationId and action required" }, 400);
  }

  const reservation = await env.DB.prepare(
    `SELECT escrow_contract_address, tenant_id, deposit_amount_ngn, property_id FROM reservations WHERE id = ?`
  ).bind(body.reservationId).first<{ escrow_contract_address: string; tenant_id: string; deposit_amount_ngn: number; property_id: string }>();

  if (!reservation) return json({ error: "Reservation not found" }, 404);

  const ref = `admin-force-${body.action}-${body.reservationId}`;

  if (body.action === "refund") {
    const wallet = await env.DB.prepare(`SELECT id FROM wallets WHERE user_id = ?`).bind(reservation.tenant_id).first<{ id: string }>();
    await env.DB.batch([
      env.DB.prepare(`UPDATE wallets SET balance_ngn = balance_ngn + ? WHERE user_id = ?`).bind(reservation.deposit_amount_ngn, reservation.tenant_id),
      env.DB.prepare(`UPDATE reservations SET status = 'refunded' WHERE id = ?`).bind(body.reservationId),
      env.DB.prepare(`UPDATE properties SET status = 'verified' WHERE id = ?`).bind(reservation.property_id),
    ]);
  } else {
    await env.DB.prepare(`UPDATE reservations SET status = 'accepted' WHERE id = ?`).bind(body.reservationId).run();
  }

  return json({ success: true, tonReleaseRef: ref });
}