import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeProfile } from "@/lib/api/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/slices/authSlice";
import styles from "./ProfileSetupPage.module.scss";

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await completeProfile({ fullName, phone });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data?.user) {
      dispatch(setUser(result.data.user));
    }

    navigate("/wallet/setup");
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <h1 className={styles.title}>Set up your profile</h1>
      <p className={styles.subtitle}>
        Finish this before browsing homes, wallet, or bookings.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div>
          <label className={styles.label}>Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Okafor"
            className={styles.input}
          />
        </div>

        <div>
          <label className={styles.label}>Phone number</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234 800 000 0000"
            className={styles.input}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={loading || !fullName || !phone} className={styles.submitBtn}>
          {loading ? "Saving…" : "Continue to RentMe"}
        </button>
      </form>
    </div>
  );
}