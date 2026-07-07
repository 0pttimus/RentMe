import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { hasClientSession } from "@/lib/auth/session";
import { getPostAuthPath } from "@/lib/auth/redirect";
import styles from "./WelcomeScreen.module.scss";

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const loaded = useAppSelector((s) => s.auth.loaded);

  // If we already know the user is logged in, redirect immediately
  // without waiting for the server — hasClientSession covers the
  // case where auth state is still loading.
  useEffect(() => {
    if (hasClientSession() && loaded && user) {
      navigate(getPostAuthPath(user, null), { replace: true });
    }
  }, [loaded, user, navigate]);

  // Hard redirect once auth loads — covers the case where someone
  // navigates to "/" manually while already signed in.
  if (loaded && user) {
    return <Navigate to={getPostAuthPath(user, null)} replace />;
  }

  return (
    <div className={styles.page}>
      {/* decorative bg circle top-right */}
      <div className={styles.bgCircle} />

      {/* top section: logo + title + subtitle */}
      <div className={styles.top}>
        <img
          src="/rentme-logo.png"
          alt="RentMe"
          className={styles.appIcon}
          draggable={false}
        />

        <h1 className={styles.title}>
          <span className={styles.titleRent}>Rent</span>
          <span className={styles.titleMe}>Me</span>
        </h1>

        <p className={styles.subtitle}>
          The easiest way<br />to rent anything.
        </p>
      </div>

      {/* hero illustration */}
      <div className={styles.illustration}>
        <img
          src="/house-illustration.png"
          alt=""
          className={styles.illustrationImg}
          draggable={false}
        />
      </div>

      {/* bottom CTA buttons */}
      <div className={styles.footer}>
        <button
          className={styles.createBtn}
          onClick={() => navigate("/auth?mode=signup")}
          type="button"
        >
          Create Account
        </button>
        <button
          className={styles.signInBtn}
          onClick={() => navigate("/auth?mode=signin")}
          type="button"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
