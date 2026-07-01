import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";
import { createKycSession } from "../lib/kyc";
import { generateId } from "../lib/session";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function handleStartKyc(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const session = await createKycSession(
    env.KYC_API_KEY ?? "mock",
    env.KYC_PARTNER_ID ?? "",
    user.id,
    user.fullName
  );

  if (session.error) return json({ error: session.error }, 500);

  const id = generateId();
  await env.DB.prepare(
    `INSERT INTO kyc_sessions (id, user_id, session_id, status) VALUES (?, ?, ?, 'pending')`
  ).bind(id, user.id, session.sessionId ?? id).run();

  await env.DB.prepare(`UPDATE users SET kyc_status = 'in_review' WHERE id = ?`).bind(user.id).run();

  return json({ sessionUrl: session.sessionUrl, sessionId: session.sessionId });
}

export async function handleKycWebhook(request: Request, env: Env) {
  const body = (await request.json()) as {
    userId?: string;
    status?: string;
    event?: string;
  };

  const userId = body.userId;
  const approved = body.status === "verified" || body.event === "verification.approved";

  if (!userId) return json({ error: "userId required" }, 400);

  if (approved) {
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET kyc_status = 'verified', trust_score = MIN(trust_score + 50, 1000) WHERE id = ?`).bind(userId),
      env.DB.prepare(`UPDATE kyc_sessions SET status = 'verified', completed_at = datetime('now') WHERE user_id = ?`).bind(userId),
    ]);
  } else {
    await env.DB.prepare(`UPDATE users SET kyc_status = 'rejected' WHERE id = ?`).bind(userId).run();
  }

  return json({ success: true });
}

export async function handleMockKycComplete(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  if (env.ENVIRONMENT === "production") {
    return json({ error: "Not available in production." }, 403);
  }

  await env.DB.prepare(
    `UPDATE users SET kyc_status = 'verified', phone_verified = 1, trust_score = MIN(trust_score + 50, 1000) WHERE id = ?`
  ).bind(user.id).run();

  return json({ success: true, kycStatus: "verified" });
}