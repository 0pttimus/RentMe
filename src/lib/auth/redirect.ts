import type { AuthUser } from "@/lib/api/client";
import { isProfileComplete } from "./profile";

const APP_HOME_PATH = "/markets";
const PROFILE_SETUP_PATH = "/profile/setup";

function isSafeAppRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth");
}

export function getPostAuthPath(user: AuthUser, redirect: string | null): string {
  if (!isProfileComplete(user)) {
    return PROFILE_SETUP_PATH;
  }

  if (redirect && isSafeAppRedirect(redirect) && redirect !== PROFILE_SETUP_PATH) {
    return redirect;
  }

  return APP_HOME_PATH;
}
