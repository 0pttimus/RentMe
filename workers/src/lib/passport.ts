import { getStateCode } from "./state-codes";

export interface PassportAddress {
  country: string;
  state: string;
  city: string;
  area?: string;
  street: string;
  houseNumber: string;
  buildingName?: string;
}

export async function generatePassportNumber(
  db: D1Database,
  state: string
): Promise<string> {
  const code = getStateCode(state);
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM property_passports WHERE state_code = ?`
    )
    .bind(code)
    .first<{ cnt: number }>();
  const serial = (row?.cnt ?? 0) + 1;
  return `RM-${code}-${String(serial).padStart(6, "0")}`;
}

export async function findMatchingPassports(
  db: D1Database,
  addr: Partial<PassportAddress>
): Promise<{ id: string; passport_number: string; building_name: string | null; street: string; house_number: string; total_units: number }[]> {
  const parts: string[] = [];
  const bindings: (string | number)[] = [];

  if (addr.street) {
    parts.push(`LOWER(street) = LOWER(?)`);
    bindings.push(addr.street);
  }
  if (addr.houseNumber) {
    parts.push(`LOWER(house_number) = LOWER(?)`);
    bindings.push(addr.houseNumber);
  }
  if (addr.city) {
    parts.push(`LOWER(city) = LOWER(?)`);
    bindings.push(addr.city);
  }
  if (addr.state) {
    const sc = getStateCode(addr.state);
    parts.push(`(LOWER(state_code) = LOWER(?) OR LOWER(state_code) = LOWER(?))`);
    bindings.push(sc, sc);
  }

  if (parts.length === 0) return [];

  const where = parts.join(" AND ");
  const rows = await db
    .prepare(
      `SELECT id, passport_number, building_name, street, house_number, total_units FROM property_passports WHERE ${where} LIMIT 10`
    )
    .bind(...bindings)
    .all<{ id: string; passport_number: string | null; building_name: string | null; street: string | null; house_number: string | null; total_units: number }>();

  return (rows.results ?? [])
    .filter(r => r.passport_number)
    .map(r => ({
      id: r.id,
      passport_number: r.passport_number!,
      building_name: r.building_name,
      street: r.street ?? "",
      house_number: r.house_number ?? "",
      total_units: r.total_units,
    }));
}

export async function getUnitsForPassport(
  db: D1Database,
  passportId: string
): Promise<{ id: string; unit_identifier: string; unit_type: string }[]> {
  const rows = await db
    .prepare(`SELECT id, unit_identifier, unit_type FROM property_units WHERE property_passport_id = ?`)
    .bind(passportId)
    .all<{ id: string; unit_identifier: string; unit_type: string }>();
  return rows.results ?? [];
}

export async function createUnit(
  db: D1Database,
  passportId: string,
  unitIdentifier: string,
  unitType: string
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO property_units (id, property_passport_id, unit_identifier, unit_type) VALUES (?, ?, ?, ?)`
    )
    .bind(id, passportId, unitIdentifier, unitType)
    .run();
  return id;
}
