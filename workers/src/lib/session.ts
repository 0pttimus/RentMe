const SESSION_TTL_DAYS = 7;

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  kycStatus: string;
  trustScore: number;
  trustLevel: string;
  profileComplete: boolean;
  avatarUrl: string | null;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function sessionExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_TTL_DAYS);
  return date.toISOString();
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...rest] = c.trim().split("=");
      return [key, rest.join("=")];
    })
  );
}

export function buildSessionCookie(
  sessionId: string,
  isProduction: boolean
): string {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  const sameSite = isProduction ? "SameSite=None; Secure" : "SameSite=Lax";
  return `rentme_session=${sessionId}; Path=/; HttpOnly; ${sameSite}; Max-Age=${maxAge}`;
}

export function buildClearSessionCookie(isProduction: boolean): string {
  const sameSite = isProduction ? "SameSite=None; Secure" : "SameSite=Lax";
  return `rentme_session=; Path=/; HttpOnly; ${sameSite}; Max-Age=0`;
}
