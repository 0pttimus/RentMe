import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isProfileComplete } from "@/lib/auth/profile";
import { isSetupPath, requiresAuth } from "@/lib/auth/guard";
import { hasClientSession } from "@/lib/auth/session";
import { useAppSelector } from "@/store/hooks";

export function ProtectedRoute() {
  const { pathname } = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const loaded = useAppSelector((s) => s.auth.loaded);

  if (requiresAuth(pathname) && !hasClientSession()) {
    const redirect = encodeURIComponent(pathname);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  if (isSetupPath(pathname)) {
    if (!hasClientSession()) {
      return <Navigate to="/auth" replace />;
    }
    if (loaded && isProfileComplete(user)) {
      return <Navigate to="/markets" replace />;
    }
    return <Outlet />;
  }

  if (requiresAuth(pathname) && hasClientSession() && loaded && !isProfileComplete(user)) {
    return <Navigate to="/profile/setup" replace />;
  }

  return <Outlet />;
}