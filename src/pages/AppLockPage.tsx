import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { unlockWithPin } from "@/lib/wallet/app-lock";
import { setAppLocked } from "@/lib/wallet/store";
import { validatePin } from "@/lib/wallet/pin";
import styles from "./AppLockPage.module.scss";

export default function AppLockPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePin(pin)) return;

    const result = await unlockWithPin(pin);
    if (result.ok) {
      setAppLocked(false);
      navigate("/markets", { replace: true });
    } else {
      setError("Wrong PIN.");
      setPin("");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.body}>
        <div className={styles.iconWrap}>
          <Lock size={28} strokeWidth={1.5} />
        </div>
        <h1 className={styles.title}>Enter PIN</h1>
        <p className={styles.text}>Enter your security PIN to unlock.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter PIN"
            className={styles.input}
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
