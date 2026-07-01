import { requireUser } from "../lib/auth";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleGetRewards(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const balance = await env.DB.prepare(
    `SELECT total_points FROM reward_balances WHERE user_id = ?`
  ).bind(user.id).first<{ total_points: number }>();

  const txs = await env.DB.prepare(
    `SELECT points, reason, created_at FROM reward_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
  ).bind(user.id).all();

  return json({
    totalPoints: balance?.total_points ?? 0,
    transactions: txs.results ?? [],
  });
}