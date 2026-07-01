const PUBLIC_PATHS = new Set(["/", "/auth", "/auth/email", "/auth/verify"]);

const PUBLIC_PREFIXES = ["/auth/"];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function requiresAuth(pathname: string): boolean {
  return !isPublicPath(pathname);
}

export function isSetupPath(pathname: string): boolean {
  return pathname === "/profile/setup";
}