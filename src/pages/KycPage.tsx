import { useState } from "react";
import { SubPageHeader } from "@/components/SubPageHeader";
import { completeKycMock, sendPhoneOtp, startKyc, verifyPhoneOtp } from "@/lib/api/client";
import styles from "./KycPage.module.scss";

export default function KycPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"id" | "phone" | "done">("id");
  const [msg, setMsg] = useState("");

  async function handleStartKyc() {
    const res = await startKyc();
    if (res.error) {
      setMsg(res.error);
      return;
    }
    setStep("phone");
    setMsg("Identity check started. Verify your phone.");
  }

  async function sendPhone() {
    const res = await sendPhoneOtp(phone);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    if (res.data?.devCode) setMsg(`SMS sent. Dev code: ${res.data.devCode}`);
    else setMsg("SMS sent.");
  }

  async function verifyPhone() {
    const res = await verifyPhoneOtp(phone, code);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    await completeKycMock();
    setStep("done");
    setMsg("KYC complete!");
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="KYC" subtitle="Required before reservations" prevTitle="Profile" backHref="/profile" />
      <div className={styles.content}>
        {step === "id" && (
          <button type="button" onClick={handleStartKyc} className={styles.primaryBtn}>
            Start Verification
          </button>
        )}
        {step === "phone" && (
          <>
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles.input}
            />
            <button type="button" onClick={sendPhone} className={styles.ghostBtn}>
              Send SMS code
            </button>
            <input
              type="text"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={styles.input}
            />
            <button type="button" onClick={verifyPhone} className={styles.primaryBtn}>
              Verify &amp; complete
            </button>
          </>
        )}
        {step === "done" && (
          <p className={styles.done}>You&apos;re verified!</p>
        )}
        {msg && <p className={styles.msg}>{msg}</p>}
      </div>
    </div>
  );
}