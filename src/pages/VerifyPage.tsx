import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { OtpInput } from "@/components/OtpInput";
import { verifyOtp, type AuthUser } from "@/lib/api/client";
import { requestOtp } from "@/lib/api/otp";
import { getPostAuthPath } from "@/lib/auth/redirect";
import { setClientSession } from "@/lib/auth/session";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/slices/authSlice";
import styles from "./VerifyPage.module.scss";

function VerifyForm() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const redirect = searchParams.get("redirect");
  const user = useAppSelector((s) => s.auth.user);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("rentme_dev_otp");
    if (stored) {
      setDevCode(stored);
      sessionStorage.removeItem("rentme_dev_otp");
    }
  }, []);

  function afterAuth(user: AuthUser) {
    setClientSession();
    dispatch(setUser(user));
    navigate(getPostAuthPath(user, redirect), { replace: true });
  }

  async function handleVerify(submittedCode?: string) {
    const c = (submittedCode ?? code).trim();
    if (c.length !== 6) return;

    setError("");
    setLoading(true);

    const result = await verifyOtp({ email, code: c });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data?.user) {
      afterAuth(result.data.user);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleVerify();
  }

  function handleCodeChange(val: string) {
    setCode(val);
    if (val.length === 6) {
      handleVerify(val);
    }
  }

  async function handleResend() {
    setError("");
    setResending(true);

    const result = await requestOtp(email);

    setResending(false);

    if (!result.ok) {
      setError(result.error ?? "Could not resend code.");
      return;
    }

    if (result.devCode) {
      setDevCode(result.devCode);
    }
  }

  if (user) {
    return <Navigate to={getPostAuthPath(user, redirect)} replace />;
  }

  if (!email) {
    return (
      <p className={styles.missing}>
        Missing email.{" "}
        <Link to="/auth" className={styles.link}>
          Start over
        </Link>
      </p>
    );
  }

  return (
    <div className={styles.body}>
      <h1 className={styles.title}>Enter the code</h1>
      <p className={styles.subtitle}>
        Enter the 6-digit code sent to{" "}
        <span className={styles.emailLabel}>{email}</span>
      </p>

      {devCode && (
        <p className={styles.devCode}>
          Dev code: <strong>{devCode}</strong>
        </p>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <OtpInput value={code} onChange={handleCodeChange} disabled={loading} />

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className={styles.submitBtn}
        >
          {loading ? "Verifying" : "Verify"}
        </button>
      </form>

      <p className={styles.resend}>
        Didn&apos;t receive it?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className={styles.resendBtn}
        >
          {resending ? "Sending" : "Resend code"}
        </button>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className={styles.page}>
      <Link to="/auth" className={styles.back} aria-label="Back">
        <ArrowLeft size={20} strokeWidth={2} />
      </Link>
      <VerifyForm />
    </div>
  );
}
