import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleGetPriceHistory(
  env: Env,
  propertyId: string
): Promise<Response> {
  const rows = await env.DB
    .prepare(`
      SELECT id, price, changed_at FROM price_history
      WHERE property_id = ?
      ORDER BY changed_at DESC
      LIMIT 20
    `)
    .bind(propertyId)
    .all();

  // include the current property price as the first entry
  const current = await env.DB
    .prepare(`SELECT rent_amount_ngn FROM properties WHERE id = ?`)
    .bind(propertyId)
    .first<{ rent_amount_ngn: number }>();

  return json({
    currentPrice: current?.rent_amount_ngn ?? 0,
    history: rows.results ?? [],
  });
}
