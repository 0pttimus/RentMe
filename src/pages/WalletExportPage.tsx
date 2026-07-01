import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldAlert, FileWarning, Copy, Check } from "lucide-react";
import { validatePin } from "@/lib/wallet/pin";
import { decryptWallet } from "@/lib/wallet/store";
import styles from "./WalletExportPage.module.scss";

type Step = "warn1" | "warn2" | "warn3" | "pin" | "reveal";

const WARNINGS = [
  {
    icon: AlertTriangle,
    title: "Your wallet recovery phrase",
    text: "This is the master key to your wallet. It is the only way to recover your funds if you lose access to your account. Without it, your money is gone forever.",
  },
  {
    icon: ShieldAlert,
    title: "Never share this phrase",
    text: "Anyone who has these words has full access to your wallet and can take everything. Not even RentMe staff will ever ask for it. If someone asks, they are trying to scam you. Do not share it. Period.",
  },
  {
    icon: FileWarning,
    title: "Final warning",
    text: "RentMe will record the date and time you view this phrase for compliance purposes. If your funds are compromised after viewing it, RentMe is not responsible.",
  },
];

export default function WalletExportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("warn1");
  const [warnIdx, setWarnIdx] = useState(0);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [revealed, setRevealed] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPin, setShowPin] = useState(false);

  function handleUnderstand() {
    if (warnIdx < WARNINGS.length - 1) {
      setWarnIdx((i) => i + 1);
    } else {
      setStep("pin");
    }
  }

  function handleJustChecking() {
    navigate(-1);
  }

  async function handlePinSubmit() {
    if (!validatePin(pin)) {
      setPinError("PIN must be exactly 4 digits.");
      return;
    }
    setPinError("");

    const wallet = await decryptWallet(pin);
    if (!wallet) {
      setPinError("Wrong PIN.");
      return;
    }
    setRevealed(wallet.mnemonic);
    setStep("reveal");
  }

  function handleCopy() {
    navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === "warn1" || step === "warn2" || step === "warn3") {
    const w = WARNINGS[warnIdx];
    const Icon = w.icon;
    return (
      <div className={styles.page}>
        <div className={styles.body}>
          <div className={styles.warnIcon}>
            <Icon size={36} strokeWidth={1.5} />
          </div>
          <h1 className={styles.title}>{w.title}</h1>
          <p className={styles.text}>{w.text}</p>
          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={handleUnderstand}
              type="button"
            >
              I understand
            </button>
            <button
              className={styles.ghostBtn}
              onClick={handleJustChecking}
              type="button"
            >
              I am just checking around
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "pin") {
    return (
      <div className={styles.page}>
        <div className={styles.body}>
          <h1 className={styles.title}>Enter your PIN</h1>
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

          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showPin}
              onChange={() => setShowPin(!showPin)}
            />
            Show PIN
          </label>

          {pinError && <p className={styles.error}>{pinError}</p>}

          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={() => setAgreed(!agreed)}
            />
            <span>
              I confirm that I am viewing my Mnemonic and I take full
              responsibility for my funds if I get scammed from doing this.
            </span>
          </label>

          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={handlePinSubmit}
              disabled={!pin || !agreed}
              type="button"
            >
              View my recovery phrase
            </button>
            <button
              className={styles.ghostBtn}
              onClick={() => navigate(-1)}
              type="button"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.body}>
        <h1 className={styles.title}>Your recovery phrase</h1>
        <p className={styles.text}>
          Write these words down and store them somewhere safe offline. Never
          share them with anyone.
        </p>
        <div className={styles.phraseBox}>
          {revealed.split(" ").map((word, i) => (
            <span key={i} className={styles.word}>
              <span className={styles.wordIdx}>{i + 1}</span>
              {word}
            </span>
          ))}
        </div>
        <button
          className={styles.primaryBtn}
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <>
              <Check size={16} strokeWidth={2} /> Copied
            </>
          ) : (
            <>
              <Copy size={16} strokeWidth={2} /> Copy to clipboard
            </>
          )}
        </button>
        <button
          className={styles.ghostBtn}
          onClick={() => navigate(-1)}
          type="button"
        >
          I have saved it
        </button>
      </div>
    </div>
  );
}
