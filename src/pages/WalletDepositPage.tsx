import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { SubPageHeader } from "@/components/SubPageHeader";
import { useToast } from "@/components/ui/Toast";
import { depositFunds, initPaystack, initiateUsdcDeposit, verifyUsdcDeposit } from "@/lib/api/client";
import { formatNaira } from "@/lib/format";
import styles from "./WalletDepositPage.module.scss";

const quickNgn = [50_000, 100_000, 500_000, 1_000_000];
const quickUsdc = [10, 25, 50, 100];
type Tab = "ngn" | "usdc";
const SESSION_KEY = "rentme_usdc_deposit";

export default function WalletDepositPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("ngn");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "send" | "verifying" | "success" | "error">("form");
  const [depositInfo, setDepositInfo] = useState<{ walletAddress: string; amount: number } | null>(null);
  const [usdcInputIsNgn, setUsdcInputIsNgn] = useState(false);
  const [verifyErr, setVerifyErr] = useState("");
  const [balanceNgn, setBalanceNgn] = useState(0);
  const [copied, setCopied] = useState(false);

  const usdcRate = 1500;

  // Restore pending deposit from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const info = JSON.parse(saved);
        setDepositInfo(info);
        setStep("send");
        setAmount(String(info.amount));
        setTab("usdc");
      }
    } catch { /* ignore */ }
  }, []);

  function usdcSubmitAmount() {
    if (usdcInputIsNgn) return Math.round(Number(amount) / usdcRate);
    return Number(amount);
  }

  const quick = tab === "ngn" ? quickNgn : (usdcInputIsNgn ? [50_000, 100_000, 200_000, 500_000] : quickUsdc);

  async function handleDeposit() {
    if (tab === "ngn") {
      setLoading(true);
      const paystack = await initPaystack(Number(amount), `${window.location.origin}/wallet`);
      if (paystack.data?.authorizationUrl) {
        window.location.href = paystack.data.authorizationUrl;
        return;
      }
      if (paystack.data?.mock) {
        await depositFunds(Number(amount));
        navigate("/wallet");
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const res = await initiateUsdcDeposit(usdcSubmitAmount());
    setLoading(false);

    if (res.data) {
      setDepositInfo(res.data);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.data));
      setStep("send");
    } else {
      toast.show(res.error ?? "Failed to initiate deposit");
    }
  }

  async function handleSent() {
    setStep("verifying");
    setVerifyErr("");

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await verifyUsdcDeposit();
      if (res.data?.verified) {
        sessionStorage.removeItem(SESSION_KEY);
        setBalanceNgn(res.data.balanceNgn ?? 0);
        setStep("success");
        return;
      }
    }

    setVerifyErr("We are still checking. Your funds are safe. Come back and verify later.");
    setStep("error");
  }

  function handleCopy() {
    if (!depositInfo) return;
    navigator.clipboard.writeText(depositInfo.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Deposit" prevTitle="Wallet" backHref="/wallet" />

      <div className={styles.tabs}>
        <button className={[styles.tab, tab === "ngn" ? styles.tabActive : ""].join(" ")} onClick={() => { setTab("ngn"); setStep("form"); setDepositInfo(null); setAmount(""); }} type="button">
          Naira
        </button>
        <button className={[styles.tab, tab === "usdc" ? styles.tabActive : ""].join(" ")} onClick={() => { setTab("usdc"); setStep("form"); setDepositInfo(null); setAmount(""); }} type="button">
          USDC (Solana)
        </button>
      </div>

      {step === "send" && depositInfo && (
        <div className={styles.sendCard}>
          <p className={styles.sendLabel}>Send exactly</p>
          <p className={styles.sendAmount}>{depositInfo.amount} USDC</p>
          <p className={styles.sendLabel}>To this wallet</p>
          <p className={styles.sendHint}>This is your personal Solana wallet on devnet. Send USDC to this address from your external wallet.</p>
          <div className={styles.addressRow}>
            <code className={styles.addressText}>{depositInfo.walletAddress}</code>
            <button type="button" className={styles.copyBtn} onClick={handleCopy}>
              {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2} />}
            </button>
          </div>
          <button type="button" className={styles.submitBtn} onClick={handleSent}>
            I've sent it
          </button>
          <button type="button" className={styles.cancelBtn} onClick={() => setStep("form")}>
            Cancel
          </button>
        </div>
      )}

      {step === "verifying" && (
        <div className={styles.sendCard}>
          <p className={styles.verifyingTitle}>Checking the blockchain</p>
          <p className={styles.verifyingBody}>
            This can take up to a minute. We are looking for the incoming USDC balance.
          </p>
          <div className={styles.spinner} />
        </div>
      )}

      {step === "success" && (
        <div className={styles.backdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.iconWrap}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className={styles.modalHeading}>Deposit successful</h2>
            <p className={styles.modalBody}>
              {depositInfo?.amount} USDC deposited. You received {formatNaira(balanceNgn)}.
            </p>
            <button type="button" className={styles.modalBtn} onClick={() => navigate("/wallet")}>
              Back to Wallet
            </button>
          </div>
        </div>
      )}

      {step === "error" && (
        <div className={styles.sendCard}>
          <p className={styles.errorTitle}>Still checking</p>
          <p className={styles.errorBody}>{verifyErr}</p>
          <button type="button" className={styles.submitBtn} onClick={handleSent}>
            Check again
          </button>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate("/wallet")}>
            Back to Wallet
          </button>
        </div>
      )}

      {step === "form" && (
        <div className={styles.form}>
          <div className={styles.amountWrap}>
            {tab === "usdc" ? (
              <button type="button" className={styles.currencyToggle} onClick={() => setUsdcInputIsNgn(!usdcInputIsNgn)}>
                {usdcInputIsNgn ? "₦" : "USDC"}
              </button>
            ) : (
              <span className={styles.currency}>₦</span>
            )}
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={styles.amountInput}
              placeholder="0"
            />
          </div>

          {amount && Number(amount) > 0 && tab === "usdc" && (
            <p className={styles.rate}>
              {usdcInputIsNgn
                ? `≈ ${(Number(amount) / usdcRate).toFixed(2)} USDC`
                : `≈ ${formatNaira(Number(amount) * usdcRate)}`
              }
            </p>
          )}

          <div className={styles.quickGrid}>
            {quick.map((a) => (
              <button key={a} type="button" onClick={() => setAmount(String(a))} className={styles.quickBtn}>
                {tab === "ngn" ? formatNaira(a) : usdcInputIsNgn ? formatNaira(a) : `${a} USDC`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDeposit}
            disabled={loading || !amount || Number(amount) <= 0}
            className={styles.submitBtn}
          >
            {loading ? "Processing..." : tab === "ngn" ? "Deposit via Paystack" : "Deposit USDC (Devnet)"}
          </button>
        </div>
      )}
    </div>
  );
}
