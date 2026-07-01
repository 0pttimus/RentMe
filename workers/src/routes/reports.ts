import { requireUser } from "../lib/auth";
import { generateId } from "../lib/session";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleCreateReport(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as {
    targetType?: string;
    targetId?: string;
    reason?: string;
  };

  if (!body.targetType || !body.targetId || !body.reason) {
    return json({ error: "targetType, targetId, and reason required." }, 400);
  }

  const id = generateId();
  await env.DB.prepare(
    `INSERT INTO fraud_reports (id, reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, user.id, body.targetType, body.targetId, body.reason).run();

  // Reward points for reporting
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO reward_transactions (id, user_id, points, reason) VALUES (?, ?, 50, 'Fraud report submitted')`
    ).bind(generateId(), user.id),
    env.DB.prepare(
      `INSERT INTO reward_balances (user_id, total_points) VALUES (?, 50)
       ON CONFLICT(user_id) DO UPDATE SET total_points = total_points + 50`
    ).bind(user.id),
  ]);

  return json({ success: true, reportId: id });
}