import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { generateWallet } from "@/lib/wallet/keygen";
import { hashPin, validatePin } from "@/lib/wallet/pin";
import { encryptWallet, STORAGE_KEYS } from "@/lib/wallet/store";
import {
  encryptString,
  xorSplit,
  encodeB64,
} from "@/lib/wallet/crypto";
import { createWalletBackup } from "@/lib/api/wallet";
import { useAppSelector } from "@/store/hooks";
import styles from "./WalletCreatePage.module.scss";

type Step = "email-warn" | "pin-set" | "creating" | "done";

export default function WalletCreatePage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [step, setStep] = useState<Step>("email-warn");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [skipCount, setSkipCount] = useState(0);

  const handleCreate = useCallback(async () => {
    setStep("creating");
    setError("");

    try {
      if (!user?.email) throw new Error("No user email");

      const wallet = await generateWallet();
      const mnemonicStr = wallet.mnemonic.join(" ");

      await encryptWallet(wallet.privateKey, mnemonicStr, pin);

      const pinHashResult = await hashPin(pin);
      localStorage.setItem(
        STORAGE_KEYS.pinHash,
        pinHashResult.hash
      );

      const privateKeyHex = Array.from(wallet.privateKey)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const otpDerivedKey = user.email + "_rentme_wallet_recovery";

      const [share1, share2] = xorSplit(
        new TextEncoder().encode(privateKeyHex)
      );

      const passwordShare = await encryptString(
        encodeB64(share1),
        user.email + pin
      );
      const otpShare2 = await encryptString(
        encodeB64(share2),
        otpDerivedKey
      );
      const otpRecoveryShare1 = await encryptString(
        encodeB64(share1),
        otpDerivedKey
      );

      await createWalletBackup({
        passwordShare,
        otpShare2,
        otpRecoveryShare1,
      });

      setStep("done");
    } catch {
      setError("Failed to create wallet. Please try again.");
      setStep("pin-set");
    }
  }, [pin, user]);

  function handlePinSubmit() {
    if (!validatePin(pin)) {
      setPinError("PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== pinConfirm) {
      setPinError("PINs do not match.");
      return;
    }
    setPinError("");
    handleCreate();
  }

  function handleSkip() {
    if (skipCount >= 1) {
      navigate("/markets");
      return;
    }
    setSkipCount((c) => c + 1);
    setStep("email-warn");
  }

  if (step === "email-warn") {
    return (
      <div className={styles.page}>
        <div className={styles.body}>
          <div className={styles.iconWrap}>
            <Shield size={32} strokeWidth={1.5} />
          </div>
          <h1 className={styles.title}>Secure your account</h1>
          <p className={styles.text}>
            Your email is the master key to your wallet recovery.
            If someone takes over your email, they can take your funds.
          </p>
          <p className={styles.text}>
            Secure your email with a strong password and two-factor
            authentication (2FA). This is the most important step.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={() => setStep("pin-set")}
              type="button"
            >
              I understand
            </button>
            <button
              className={styles.ghostBtn}
              onClick={handleSkip}
              type="button"
            >
              I am just checking around
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "pin-set") {
    return (
      <div className={styles.page}>
        <div className={styles.body}>
          <div className={styles.iconWrap}>
            {showPin ? (
              <EyeOff size={32} strokeWidth={1.5} />
            ) : (
              <Eye size={32} strokeWidth={1.5} />
            )}
          </div>
          <h1 className={styles.title}>Set your security PIN</h1>
          <p className={styles.warning}>
            This 4-digit PIN locks your wallet and app. Do not share it.
            Forget it and you will need your email + mnemonic to recover.
          </p>

          <div className={styles.field}>
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter PIN"
              className={styles.pinInput}
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirm PIN"
              className={styles.pinInput}
            />
          </div>

          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showPin}
              onChange={() => setShowPin(!showPin)}
            />
            Show PIN
          </label>

          {pinError && <p className={styles.error}>{pinError}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={handlePinSubmit}
              disabled={!pin || !pinConfirm}
              type="button"
            >
              Continue
            </button>
            <button
              className={styles.ghostBtn}
              onClick={handleSkip}
              type="button"
            >
              I am just checking around
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "creating") {
    return (
      <div className={styles.page}>
        <div className={styles.body}>
          <Loader2 size={40} strokeWidth={1.5} className={styles.spinner} />
          <h1 className={styles.title}>Creating your wallet</h1>
          <p className={styles.text}>This will just take a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.body}>
        <div className={styles.iconWrap}>
          <Check size={32} strokeWidth={1.5} className={styles.checkIcon} />
        </div>
        <h1 className={styles.title}>Wallet ready</h1>
        <p className={styles.text}>
          Your RentMe wallet has been created. You can now rent, hire, and
          transact securely.
        </p>
        <p className={styles.textSecondary}>
          For maximum security, back up your wallet phrase in{" "}
          Settings &gt; Security. Never share it with anyone.
        </p>
        <div className={styles.actions}>
          <button
            className={styles.primaryBtn}
            onClick={() => navigate("/markets")}
            type="button"
          >
            Start browsing
          </button>
        </div>
      </div>
    </div>
  );
}
