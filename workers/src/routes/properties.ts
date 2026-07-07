import { getProperty, listProperties, listMyProperties } from "../lib/properties";
import { requireUser } from "../lib/auth";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleListMyProperties(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const properties = await listMyProperties(env.DB, user.id);
  return json({ properties });
}

export async function handleListProperties(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const city = url.searchParams.get("city") ?? undefined;
  const propertyTypes = url.searchParams.get("propertyTypes");
  const types = propertyTypes ? propertyTypes.split(",") : undefined;
  const properties = await listProperties(env.DB, city, types);
  return json({ properties });
}

export async function handleGetProperty(
  env: Env,
  id: string
): Promise<Response> {
  const property = await getProperty(env.DB, id);
  if (!property) {
    return json({ error: "Property not found" }, 404);
  }
  return json({ property });
}