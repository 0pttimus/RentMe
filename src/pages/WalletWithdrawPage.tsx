import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SubPageHeader } from "@/components/SubPageHeader";
import { useToast } from "@/components/ui/Toast";
import { listBanks, resolveAccount, withdrawNaira, withdrawUsdc } from "@/lib/api/client";
import { formatNaira } from "@/lib/format";
import styles from "./WalletWithdrawPage.module.scss";

type Tab = "ngn" | "usdc";

interface Bank { code: string; name: string }

export default function WalletWithdrawPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("ngn");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [usdcInputIsNgn, setUsdcInputIsNgn] = useState(true);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  const filteredBanks = banks.filter(
    (b) => b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );
  const selectedBankName = banks.find((b) => b.code === selectedBank)?.name ?? "";

  const usdcRate = 1500;

  useEffect(() => {
    listBanks().then((res) => {
      if (res.data?.banks) setBanks(res.data.banks);
    });
  }, []);

  const doResolve = useCallback(async (acctNum: string, bankCode: string) => {
    if (acctNum.length !== 10) return;
    setResolving(true);
    const res = await resolveAccount(acctNum, bankCode);
    setResolving(false);
    if (res.data?.accountName) {
      setAccountName(res.data.accountName);
    } else if (res.error) {
      setAccountName("");
      toast.show(res.error);
    }
  }, [toast]);

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      doResolve(accountNumber, selectedBank);
    } else {
      setAccountName("");
    }
  }, [accountNumber, selectedBank, doResolve]);

  function usdcSubmitAmount() {
    return usdcInputIsNgn ? Math.round(Number(amount) / usdcRate) : Number(amount);
  }

  async function handleNairaWithdraw() {
    if (!selectedBank || !accountNumber || !accountName) return;
    setLoading(true);
    const res = await withdrawNaira({
      amount: Number(amount),
      bankName: selectedBankName,
      accountNumber,
      accountName,
    });
    setLoading(false);
    if (res.data?.success) {
      setSuccess(res.data.message);
    } else {
      toast.show(res.error ?? "Withdrawal failed");
    }
  }

  async function handleUsdcWithdraw() {
    const ngnAmount = usdcInputIsNgn ? Number(amount) : usdcSubmitAmount() * usdcRate;
    setLoading(true);
    const res = await withdrawUsdc(ngnAmount);
    setLoading(false);
    if (res.data?.success) {
      setSuccess(`${res.data.usdcAmount} USDC sent to your wallet. ${formatNaira(res.data.balanceNgn)} remaining.`);
    } else {
      toast.show(res.error ?? "Withdrawal failed");
    }
  }

  if (success) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Withdraw" prevTitle="Wallet" backHref="/wallet" />
        <div className={styles.successCard}>
          <p className={styles.successTitle}>Withdrawal submitted</p>
          <p className={styles.successBody}>{success}</p>
          <button type="button" className={styles.submitBtn} onClick={() => navigate("/wallet")}>
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Withdraw" prevTitle="Wallet" backHref="/wallet" />

      <div className={styles.tabs}>
        <button className={[styles.tab, tab === "ngn" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("ngn")} type="button">Naira</button>
        <button className={[styles.tab, tab === "usdc" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("usdc")} type="button">USDC (Solana)</button>
      </div>

      {tab === "ngn" ? (
        <div className={styles.form}>
          <div className={styles.amountWrap}>
            <span className={styles.currency}>₦</span>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={styles.amountInput} placeholder="0" />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Bank</label>
            <button type="button" className={styles.pickerBtn} onClick={() => setBankPickerOpen(true)}>
              {selectedBankName || "Select bank"}
            </button>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Account number</label>
            <input type="text" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.slice(0, 10))} className={styles.textInput} placeholder="0123456789" maxLength={10} />
          </div>

          {resolving && <p className={styles.resolving}>Checking account...</p>}
          {accountName && !resolving && (
            <div className={styles.accountNameBox}>
              <p className={styles.accountNameLabel}>Account name</p>
              <p className={styles.accountNameValue}>{accountName}</p>
            </div>
          )}

          <button type="button" disabled={loading || !amount || Number(amount) < 100 || !selectedBank || !accountNumber || !accountName} className={styles.submitBtn} onClick={handleNairaWithdraw}>
            {loading ? "Processing..." : "Withdraw to Bank"}
          </button>
        </div>
      ) : (
        <div className={styles.form}>
          <div className={styles.amountWrap}>
            <button type="button" className={styles.currencyToggle} onClick={() => setUsdcInputIsNgn(!usdcInputIsNgn)}>
              {usdcInputIsNgn ? "₦" : "USDC"}
            </button>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={styles.amountInput} placeholder="0" />
          </div>

          {amount && Number(amount) > 0 && (
            <p className={styles.rate}>
              {usdcInputIsNgn ? `≈ ${(Number(amount) / usdcRate).toFixed(2)} USDC` : `≈ ${formatNaira(Number(amount) * usdcRate)}`}
            </p>
          )}

          <div className={styles.infoBox}>
            USDC will be sent to your Solana wallet on devnet. Admin processes the transfer and your NGN balance is deducted.
          </div>

          <button type="button" disabled={loading || !amount || Number(amount) < 100} className={styles.submitBtn} onClick={handleUsdcWithdraw}>
            {loading ? "Processing..." : "Withdraw to USDC"}
          </button>
        </div>
      )}

      {bankPickerOpen && (
        <>
          <div className={styles.scrim} onClick={() => setBankPickerOpen(false)} />
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <p className={styles.sheetTitle}>Select bank</p>
            </div>
            <input type="text" className={styles.sheetSearch} placeholder="Search banks..." value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} autoFocus />
            <div className={styles.sheetList}>
              {filteredBanks.map((b) => (
                <button key={b.code} type="button" className={[styles.bankOption, b.code === selectedBank ? styles.bankOptionActive : ""].join(" ")} onClick={() => { setSelectedBank(b.code); setBankSearch(""); setBankPickerOpen(false); }}>
                  {b.name}
                </button>
              ))}
              {filteredBanks.length === 0 && <p className={styles.noBanks}>No banks match</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
