export interface DbProperty {
  id: string;
  property_passport_id: string;
  landlord_id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  amenities: string;
  rent_amount_ngn: number;
  status: string;
  is_verified: number;
  trust_score: number;
  health_score: number;
  photos: string;
}

export function serializeProperty(row: DbProperty) {
  return {
    id: row.id,
    propertyPassportId: row.property_passport_id,
    landlordId: row.landlord_id,
    title: row.title,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    propertyType: row.property_type,
    amenities: JSON.parse(row.amenities || "[]") as string[],
    rentAmountNgn: row.rent_amount_ngn,
    status: row.status,
    isVerified: row.is_verified === 1,
    trustScore: row.trust_score,
    healthScore: row.health_score,
    photos: JSON.parse(row.photos || "[]") as string[],
  };
}

export async function listProperties(
  db: D1Database,
  city?: string
): Promise<ReturnType<typeof serializeProperty>[]> {
  let query = `SELECT * FROM properties WHERE is_verified = 1 AND status = 'verified'`;
  const bindings: string[] = [];

  if (city) {
    query += ` AND city = ?`;
    bindings.push(city);
  }

  query += ` ORDER BY trust_score DESC`;

  const stmt = db.prepare(query);
  const result = bindings.length
    ? await stmt.bind(...bindings).all<DbProperty>()
    : await stmt.all<DbProperty>();

  return (result.results ?? []).map(serializeProperty);
}

export async function getProperty(
  db: D1Database,
  id: string
): Promise<ReturnType<typeof serializeProperty> | null> {
  const row = await db
    .prepare(`SELECT * FROM properties WHERE id = ?`)
    .bind(id)
    .first<DbProperty>();

  return row ? serializeProperty(row) : null;
}