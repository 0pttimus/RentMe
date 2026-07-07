import { requireUser } from "../lib/auth";
import { generateId } from "../lib/session";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const VERIFICATION_FEE = 2000;
const MAX_DAILY = 10;
const MAX_WALK_METERS = 2500;

export async function handleApplyVerifier(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as {
    idUrl?: string;
    phonePhotoUrl?: string;
    agreedTerms?: boolean;
  };
  if (!body.idUrl || !body.phonePhotoUrl || !body.agreedTerms) {
    return json({ error: "idUrl, phonePhotoUrl, and agreedTerms required." }, 400);
  }

  const existing = await env.DB.prepare(`SELECT id FROM verifiers WHERE user_id = ?`).bind(user.id).first();
  if (existing) return json({ error: "Already applied." }, 409);

  await env.DB.prepare(
    `INSERT INTO verifiers (id, user_id, id_url, phone_photo_url, agreed_terms, status) VALUES (?, ?, ?, ?, 1, 'pending')`
  ).bind(generateId(), user.id, body.idUrl, body.phonePhotoUrl).run();

  return json({ success: true });
}

export async function handleVerifierStatus(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const row = await env.DB.prepare(
    `SELECT id, status, daily_count, last_verified_date, total_earned_ngn FROM verifiers WHERE user_id = ?`
  ).bind(user.id).first<{ id: string; status: string; daily_count: number; last_verified_date: string | null; total_earned_ngn: number }>();

  return json({ verifier: row ?? null });
}

export async function handleNearbyProperties(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const verifier = await env.DB.prepare(`SELECT id, status FROM verifiers WHERE user_id = ?`).bind(user.id).first<{ id: string; status: string }>();
  if (!verifier || verifier.status !== "accepted") return json({ error: "Not an accepted verifier." }, 403);

  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  if (!lat || !lng) return json({ error: "lat and lng required." }, 400);

  // reset daily count if new day
  const today = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(
    `UPDATE verifiers SET daily_count = 0, last_verified_date = ? WHERE user_id = ? AND last_verified_date IS NOT NULL AND last_verified_date < ?`
  ).bind(today, user.id, today).run();

  const props = await env.DB.prepare(
    `SELECT p.id, p.title, p.address, p.city, p.state, p.photos, p.latitude, p.longitude,
            (SELECT COUNT(*) FROM verification_submissions WHERE property_id = p.id AND status = 'approved') AS verified_count
     FROM properties p
     WHERE p.status IN ('available', 'pending_verification', 'verified')`
  ).all<{ id: string; title: string; address: string; city: string; state: string; photos: string; latitude: number; longitude: number; verified_count: number }>();

  const nearby = (props.results ?? []).filter((p) => {
    const d = haversine(lat, lng, p.latitude, p.longitude);
    return d <= MAX_WALK_METERS;
  }).map((p) => ({
    ...p,
    photos: JSON.parse(p.photos || "[]"),
    distance: Math.round(haversine(lat, lng, p.latitude, p.longitude)),
  })).sort((a, b) => a.distance - b.distance);

  return json({ properties: nearby });
}

export async function handleSubmitVerification(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const verifier = await env.DB.prepare(`SELECT id, status, daily_count, last_verified_date FROM verifiers WHERE user_id = ?`).bind(user.id).first<{ id: string; status: string; daily_count: number; last_verified_date: string | null }>();
  if (!verifier || verifier.status !== "accepted") return json({ error: "Not an accepted verifier." }, 403);

  const today = new Date().toISOString().slice(0, 10);
  if (verifier.last_verified_date !== today && verifier.daily_count >= MAX_DAILY) {
    return json({ error: "Daily verification limit reached (10)." }, 429);
  }
  if (verifier.last_verified_date === today && verifier.daily_count >= MAX_DAILY) {
    return json({ error: "Daily verification limit reached (10)." }, 429);
  }

  const body = (await request.json()) as {
    propertyId?: string;
    videoUrl?: string;
    locationLat?: number;
    locationLng?: number;
    locationAccuracy?: number;
    notes?: string;
  };
  if (!body.propertyId || !body.videoUrl || !body.locationLat || !body.locationLng) {
    return json({ error: "propertyId, videoUrl, locationLat, locationLng required." }, 400);
  }

  const property = await env.DB.prepare(`SELECT id, title FROM properties WHERE id = ?`).bind(body.propertyId).first();
  if (!property) return json({ error: "Property not found." }, 404);

  const newCount = verifier.last_verified_date === today ? verifier.daily_count + 1 : 1;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO verification_submissions (id, verifier_id, property_id, video_url, location_lat, location_lng, location_accuracy, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(generateId(), verifier.id, body.propertyId, body.videoUrl, body.locationLat, body.locationLng, body.locationAccuracy ?? null, body.notes ?? null),
    env.DB.prepare(
      `UPDATE verifiers SET daily_count = ?, last_verified_date = ? WHERE id = ?`
    ).bind(newCount, today, verifier.id),
  ]);

  return json({ success: true });
}

export async function handleVerifierHistory(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const verifier = await env.DB.prepare(`SELECT id FROM verifiers WHERE user_id = ?`).bind(user.id).first<{ id: string }>();
  if (!verifier) return json({ error: "Not a verifier." }, 403);

  const rows = await env.DB.prepare(
    `SELECT vs.*, p.title AS property_title, p.city, p.state
     FROM verification_submissions vs
     JOIN properties p ON p.id = vs.property_id
     WHERE vs.verifier_id = ?
     ORDER BY vs.created_at DESC LIMIT 50`
  ).bind(verifier.id).all();

  return json({ submissions: rows.results ?? [] });
}

export async function handleReviewVerification(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { submissionId?: string; action?: "approve" | "reject" };
  if (!body.submissionId || !body.action) return json({ error: "submissionId and action required." }, 400);

  const sub = await env.DB.prepare(
    `SELECT vs.*, v.user_id AS verifier_user_id FROM verification_submissions vs
     JOIN verifiers v ON v.id = vs.verifier_id WHERE vs.id = ?`
  ).bind(body.submissionId).first<{ id: string; status: string; property_id: string; verifier_user_id: string }>();

  if (!sub) return json({ error: "Submission not found." }, 404);
  if (sub.status !== "pending") return json({ error: "Already reviewed." }, 409);

  if (body.action === "approve") {
    // promote property to verified once 5 approvals are reached
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM verification_submissions WHERE property_id = ? AND status = 'approved'`
    ).bind(sub.property_id).first<{ cnt: number }>();
    const total = (countRow?.cnt ?? 0) + 1;

    const ops = [
      env.DB.prepare(`UPDATE verification_submissions SET status = 'approved' WHERE id = ?`).bind(body.submissionId),
      env.DB.prepare(`UPDATE wallets SET balance_ngn = balance_ngn + ? WHERE user_id = ?`).bind(VERIFICATION_FEE, sub.verifier_user_id),
      env.DB.prepare(`INSERT INTO wallet_transactions (id, wallet_id, type, amount_ngn, reference) VALUES (?, (SELECT id FROM wallets WHERE user_id = ?), 'verification_payment', ?, ?)`).bind(generateId(), sub.verifier_user_id, VERIFICATION_FEE, `verify-${body.submissionId}`),
      env.DB.prepare(`UPDATE verifiers SET total_earned_ngn = total_earned_ngn + ? WHERE user_id = ?`).bind(VERIFICATION_FEE, sub.verifier_user_id),
    ];
    if (total >= 5) {
      ops.push(env.DB.prepare(`UPDATE properties SET status = 'verified' WHERE id = ?`).bind(sub.property_id));
    }
    await env.DB.batch(ops);
  } else {
    await env.DB.prepare(`UPDATE verification_submissions SET status = 'rejected' WHERE id = ?`).bind(body.submissionId).run();
  }

  return json({ success: true });
}

export async function handleGetVerificationCount(request: Request, env: Env, propertyId: string) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM verification_submissions WHERE property_id = ? AND status = 'approved'`
  ).bind(propertyId).first<{ count: number }>();

  return json({ count: row?.count ?? 0 });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
