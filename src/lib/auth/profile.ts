import type { AuthUser } from "@/lib/api/client";

export function isProfileComplete(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.profileComplete;
}