import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef } from "react";
import { requestOtp } from "@/lib/api/otp";
import { getPostAuthPath } from "@/lib/auth/redirect";
import { useAppSelector } from "@/store/hooks";
import styles from "./AuthEmailPage.module.scss";

export default function AuthEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "signin" ? "signin" : "signup";
  const redirect = searchParams.get("redirect");
  const user = useAppSelector((s) => s.auth.user);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await requestOtp(email.trim());

    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "Could not send code.");
      return;
    }

    if (result.devCode) {
      sessionStorage.setItem("rentme_dev_otp", result.devCode);
    }

    const params = new URLSearchParams({ email: email.trim() });
    if (redirect) params.set("redirect", redirect);
    navigate(`/auth/verify?${params.toString()}`);
  }

  if (user) {
    return <Navigate to={getPostAuthPath(user, redirect)} replace />;
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back} aria-label="Back">
        <ArrowLeft size={20} strokeWidth={2} />
      </Link>

      <div className={styles.body}>
        <h1 className={styles.title}>
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className={styles.subtitle}>
          {mode === "signin"
            ? "Enter your email to sign in."
            : "Enter your email to get started."}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <input
              ref={inputRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              spellCheck="false"
              className={styles.input}
              enterKeyHint="go"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !email}
            className={styles.submitBtn}
          >
            {loading ? "Sending code" : "Continue"}
          </button>
        </form>

        <p className={styles.footer}>
          By continuing, you agree to the{" "}
          <Link to="/terms" className={styles.footerLink}>Terms of Service</Link>{" "}
          and{" "}
          <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
