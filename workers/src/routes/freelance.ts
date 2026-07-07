import { requireUser } from "../lib/auth";
import { generateId } from "../lib/session";
import type { Env } from "../lib/env";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleFreelanceProfileStatus(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const row = await env.DB
    .prepare(`SELECT id FROM service_providers WHERE user_id = ?`)
    .bind(user.id)
    .first<{ id: string }>();

  return json({ hasProfile: !!row });
}

export async function handleFreelanceProfileGet(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const row = await env.DB
    .prepare(`
      SELECT sp.*, u.full_name, u.kyc_status, u.avatar_url AS user_avatar
      FROM service_providers sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.user_id = ?
    `)
    .bind(user.id)
    .first<Record<string, unknown>>();

  if (!row) return json({ profile: null });

  const r = row as Record<string, unknown>;
  const spAvatarUrl = r.avatar_url as string | null;
  const userAvatarUrl = r.user_avatar as string | null;

  return json({
      profile: {
        id: row.id,
        displayName: row.display_name,
        realName: row.full_name,
        avatarUrl: spAvatarUrl || userAvatarUrl,
        kycStatus: row.kyc_status,
        categories: JSON.parse((row.categories as string) || "[]"),
        bio: row.bio,
        rating: row.rating,
        completedJobs: row.completed_jobs,
        isVerified: row.is_verified,
        pricingType: row.pricing_type ?? "fixed",
        fixedPrice: row.fixed_price,
        minPrice: row.min_price,
        maxPrice: row.max_price,
        portfolio: JSON.parse((row.portfolio as string) || "[]"),
        isAvailable: !!row.is_available,
        gender: row.gender,
        locationState: row.location_state,
        locationArea: row.location_area,
        locationLat: row.location_lat,
        locationLng: row.location_lng,
        bannerUrl: row.banner_url,
        createdAt: row.created_at,
      },
  });
}

export async function handleFreelanceProfileUpsert(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as {
    displayName?: string;
    categories?: string[];
    bio?: string;
    pricingType?: string;
    fixedPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    portfolio?: { type: string; src: string }[];
    isAvailable?: boolean;
    gender?: string;
    locationState?: string;
    locationArea?: string;
    locationLat?: number;
    locationLng?: number;
    bannerUrl?: string;
    avatarUrl?: string;
  };

  if (!body.displayName?.trim()) {
    return json({ error: "Display name is required." }, 400);
  }

  const existing = await env.DB
    .prepare(`SELECT id FROM service_providers WHERE user_id = ?`)
    .bind(user.id)
    .first<{ id: string }>();

  const categories = JSON.stringify(body.categories ?? []);
  const portfolio = JSON.stringify(body.portfolio ?? []);

  if (existing) {
    await env.DB
      .prepare(`
        UPDATE service_providers SET
          display_name = ?, categories = ?, bio = ?,
          pricing_type = ?, fixed_price = ?, min_price = ?, max_price = ?,
          portfolio = ?, is_available = ?,
          gender = ?, location_state = ?, location_area = ?, location_lat = ?, location_lng = ?,
          banner_url = ?,
          avatar_url = ?
        WHERE user_id = ?
      `)
      .bind(
        body.displayName.trim(),
        categories,
        body.bio ?? null,
        body.pricingType ?? "fixed",
        body.fixedPrice ?? null,
        body.minPrice ?? null,
        body.maxPrice ?? null,
        portfolio,
        body.isAvailable ? 1 : 0,
        body.gender ?? null,
        body.locationState ?? null,
        body.locationArea ?? null,
        body.locationLat ?? null,
        body.locationLng ?? null,
        body.bannerUrl ?? null,
        body.avatarUrl ?? null,
        user.id,
      )
      .run();
    return json({ success: true });
  }

  const id = generateId();
  await env.DB
    .prepare(`
      INSERT INTO service_providers
        (id, user_id, display_name, categories, bio, pricing_type, fixed_price, min_price, max_price, portfolio, is_available, gender, location_state, location_area, location_lat, location_lng, banner_url, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      user.id,
      body.displayName.trim(),
      categories,
      body.bio ?? null,
      body.pricingType ?? "fixed",
      body.fixedPrice ?? null,
      body.minPrice ?? null,
      body.maxPrice ?? null,
      portfolio,
      body.isAvailable ? 1 : 0,
      body.gender ?? null,
      body.locationState ?? null,
      body.locationArea ?? null,
      body.locationLat ?? null,
      body.locationLng ?? null,
      body.bannerUrl ?? null,
      body.avatarUrl ?? null,
      new Date().toISOString(),
    )
    .run();

  return json({ success: true, profileId: id });
}
