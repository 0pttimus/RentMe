import { requireUser } from "../lib/auth";
import { generatePassportNumber, createUnit } from "../lib/passport";
import { getStateCode } from "../lib/state-codes";
import type { Env } from "./auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleCreateProperty(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    area?: string;
    street: string;
    houseNumber: string;
    buildingName?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    rentAmountNgn?: number;
    amenities?: string[];
    totalUnits?: number;
    unitIdentifier?: string;
    unitType?: string;
    existingPassportId?: string;
  };

  if (!body.title || !body.street || !body.city || !body.rentAmountNgn) {
    return json({ error: "title, street, city, and rentAmountNgn required." }, 400);
  }

  const state = body.state ?? "Lagos";
  const country = body.country ?? "Nigeria";

  let passportId = body.existingPassportId;

  if (!passportId) {
    const passportNumber = await generatePassportNumber(env.DB, state);
    passportId = crypto.randomUUID();

    const stateCode = getStateCode(state);
    const address = `${body.houseNumber ? body.houseNumber + ", " : ""}${body.street}, ${body.area ? body.area + ", " : ""}${body.city}, ${state}`;

    await env.DB.prepare(
      `INSERT INTO property_passports (
        id, passport_number, country, state, state_code, city, area, street, house_number,
        building_name, latitude, longitude, property_type, total_units, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(
      passportId,
      passportNumber,
      country,
      state,
      stateCode,
      body.city,
      body.area ?? null,
      body.street,
      body.houseNumber ?? null,
      body.buildingName ?? null,
      body.latitude ?? 0,
      body.longitude ?? 0,
      body.propertyType ?? "apartment",
      body.totalUnits ?? 1
    ).run();
  } else {
    const exists = await env.DB
      .prepare(`SELECT id FROM property_passports WHERE id = ?`)
      .bind(passportId)
      .first();
    if (!exists) {
      return json({ error: "Passport not found" }, 400);
    }
  }

  const unitId = await createUnit(
    env.DB,
    passportId,
    body.unitIdentifier ?? "Main Unit",
    body.unitType ?? body.propertyType ?? "self_contain"
  );

  const propertyId = crypto.randomUUID();
  const address = `${body.houseNumber ? body.houseNumber + ", " : ""}${body.street}, ${body.area ? body.area + ", " : ""}${body.city}, ${state}`;

  await env.DB.prepare(
    `INSERT INTO properties (
      id, property_passport_id, property_unit_id, landlord_id, title, description,
      address, city, state, latitude, longitude, bedrooms, bathrooms, property_type,
      amenities, rent_amount_ngn, status, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', 0)`
  ).bind(
    propertyId,
    passportId,
    unitId,
    user.id,
    body.title,
    body.description ?? "",
    address,
    body.city,
    state,
    body.latitude ?? 0,
    body.longitude ?? 0,
    body.bedrooms ?? 1,
    body.bathrooms ?? 1,
    body.propertyType ?? "apartment",
    JSON.stringify(body.amenities ?? []),
    body.rentAmountNgn
  ).run();

  return json({ success: true, propertyId, passportId });
}