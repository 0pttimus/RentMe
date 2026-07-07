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
  rent_period: string;
  rent_duration: number | null;
  status: string;
  is_verified: number;
  trust_score: number;
  health_score: number;
  photos: string;
}

export function serializeProperty(row: DbProperty & { verification_count?: number }) {
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
    rentPeriod: row.rent_period,
    rentDuration: row.rent_duration,
    status: row.status,
    isVerified: row.is_verified === 1,
    trustScore: row.trust_score,
    healthScore: row.health_score,
    photos: JSON.parse(row.photos || "[]") as string[],
    verificationCount: row.verification_count ?? 0,
  };
}

export async function listProperties(
  db: D1Database,
  city?: string,
  propertyTypes?: string[]
): Promise<(ReturnType<typeof serializeProperty> & { landlordName: string; landlordInitials: string })[]> {
  let query = `
    SELECT p.*, u.full_name AS landlord_name, u.avatar_url AS landlord_avatar, pp.area,
      (SELECT COUNT(*) FROM verification_submissions WHERE property_id = p.id AND status = 'approved') AS verification_count
    FROM properties p
    JOIN users u ON u.id = p.landlord_id
    LEFT JOIN property_passports pp ON pp.id = p.property_passport_id
    WHERE p.status IN ('available', 'pending_verification', 'verified')`;
  const bindings: string[] = [];

  if (propertyTypes && propertyTypes.length > 0) {
    const placeholders = propertyTypes.map(() => "?").join(",");
    query += ` AND p.property_type IN (${placeholders})`;
    bindings.push(...propertyTypes);
  }

  if (city) {
    query += ` AND p.city = ?`;
    bindings.push(city);
  }

  query += ` ORDER BY p.trust_score DESC`;

  const stmt = db.prepare(query);
  const result = bindings.length
    ? await stmt.bind(...bindings).all<DbProperty & { landlord_name: string }>()
    : await stmt.all<DbProperty & { landlord_name: string; landlord_avatar: string | null }>();

  return (result.results ?? []).map((row) => ({
    ...serializeProperty(row),
    landlordName: row.landlord_name ?? "",
    landlordInitials: (row.landlord_name ?? "").split(" ").map((n: string) => n[0]).join("").toUpperCase(),
    landlordAvatar: row.landlord_avatar ?? null,
    area: row.area ?? null,
  }));
}

export async function listMyProperties(
  db: D1Database,
  landlordId: string
): Promise<(ReturnType<typeof serializeProperty> & { area: string | null })[]> {
  const rows = await db
    .prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM verification_submissions WHERE property_id = p.id AND status = 'approved') AS verification_count,
        pp.area
      FROM properties p
      LEFT JOIN property_passports pp ON pp.id = p.property_passport_id
      WHERE p.landlord_id = ?
      ORDER BY p.created_at DESC
    `)
    .bind(landlordId)
    .all<DbProperty & { area: string | null }>();

  return (rows.results ?? []).map((row) => ({
    ...serializeProperty(row),
    area: row.area ?? null,
  }));
}

export async function getProperty(
  db: D1Database,
  id: string
): Promise<(ReturnType<typeof serializeProperty> & {
  landlordName: string;
  landlordPhone: string | null;
  landlordInitials: string;
  passportNumber: string | null;
  passportVerificationStatus: string;
  passportPriorTenancies: number;
  passportLastInspection: string | null;
}) | null> {
  const row = await db
    .prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM verification_submissions WHERE property_id = p.id AND status = 'approved') AS verification_count,
        u.full_name AS landlord_name, u.phone AS landlord_phone, u.avatar_url AS landlord_avatar,
             pp.passport_number, pp.verification_status AS passport_verification_status,
             pp.rental_history_count AS passport_prior_tenancies,
             pp.updated_at AS passport_updated_at
      FROM properties p
      JOIN users u ON u.id = p.landlord_id
      LEFT JOIN property_passports pp ON pp.id = p.property_passport_id
      WHERE p.id = ?
    `)
    .bind(id)
    .first<DbProperty & {
      landlord_name: string;
      landlord_phone: string | null;
      landlord_avatar: string | null;
      passport_number: string | null;
      passport_verification_status: string;
      passport_prior_tenancies: number;
      passport_updated_at: string | null;
    }>();

  if (!row) return null;

  const base = serializeProperty(row);
  return {
    ...base,
    landlordName: row.landlord_name ?? "",
    landlordPhone: row.landlord_phone ?? null,
    landlordAvatar: row.landlord_avatar ?? null,
    landlordInitials: (row.landlord_name ?? "").split(" ").map((n: string) => n[0]).join("").toUpperCase(),
    passportNumber: row.passport_number ?? null,
    passportVerificationStatus: row.passport_verification_status ?? "pending",
    passportPriorTenancies: row.passport_prior_tenancies ?? 0,
    passportLastInspection: row.passport_updated_at ?? null,
    photos: JSON.parse(row.photos || "[]") as string[],
  };
}