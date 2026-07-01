import { requireUser } from "../lib/auth";
import { findMatchingPassports, getUnitsForPassport, createUnit } from "../lib/passport";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleSearchPassports(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const street = url.searchParams.get("street") ?? undefined;
  const houseNumber = url.searchParams.get("houseNumber") ?? undefined;
  const city = url.searchParams.get("city") ?? undefined;
  const state = url.searchParams.get("state") ?? undefined;

  if (!street && !houseNumber && !city) {
    return json({ passports: [] });
  }

  const matches = await findMatchingPassports(env.DB, { street, houseNumber, city, state, country: "Nigeria" });
  return json({ passports: matches });
}

export async function handleGetPassport(
  env: Env,
  id: string
): Promise<Response> {
  const passport = await env.DB
    .prepare(`SELECT * FROM property_passports WHERE id = ?`)
    .bind(id)
    .first();
  if (!passport) return json({ error: "Passport not found" }, 404);
  return json({ passport });
}

export async function handleGetPassportUnits(
  env: Env,
  passportId: string
): Promise<Response> {
  const units = await getUnitsForPassport(env.DB, passportId);
  return json({ units });
}

export async function handleCreateUnit(
  request: Request,
  env: Env,
  passportId: string
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { unitIdentifier?: string; unitType?: string };
  if (!body.unitIdentifier) {
    return json({ error: "unitIdentifier required" }, 400);
  }

  const unitId = await createUnit(env.DB, passportId, body.unitIdentifier, body.unitType ?? "self_contain");
  return json({ success: true, unitId });
}
