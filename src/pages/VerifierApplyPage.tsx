import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SubPageHeader } from "@/components/SubPageHeader";
import { applyVerifier, getVerifierStatus } from "@/lib/api/client";
import { Camera, Check, ChevronRight } from "lucide-react";
import styles from "./VerifierApplyPage.module.scss";

export default function VerifierApplyPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "not_applied" | "pending" | "accepted">("loading");
  const [verifier, setVerifier] = useState<any>(null);
  const [idUrl, setIdUrl] = useState("");
  const [phonePhotoUrl, setPhonePhotoUrl] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getVerifierStatus().then((res) => {
      const v = res.data?.verifier;
      if (!v) { setStatus("not_applied"); return; }
      if (v.status === "pending") { setStatus("pending"); return; }
      if (v.status === "accepted") { setStatus("accepted"); setVerifier(v); return; }
      setStatus("not_applied");
    });
  }, []);

  function readFile(ref: React.RefObject<HTMLInputElement | null>, setter: (v: string) => void) {
    const file = ref.current?.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setter(String(r.result));
    r.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!idUrl || !phonePhotoUrl || !agreed) {
      setMsg("Please complete all fields and agree to the terms.");
      return;
    }
    const res = await applyVerifier({ idUrl, phonePhotoUrl, agreedTerms: agreed });
    if (res.error) { setMsg(res.error); return; }
    setDone(true);
    setMsg("Application submitted! Awaiting approval.");
  }

  if (status === "loading") {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Get paid to verify" prevTitle="Profile" backHref="/profile" />
        <div className="spinnerWrap"><div className="spinner" /></div>
      </div>
    );
  }

  if (status === "accepted") {
    const remaining = Math.max(0, 10 - (verifier?.daily_count ?? 0));
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Get paid to verify" prevTitle="Profile" backHref="/profile" />
        <div className={styles.content}>
          <div className={styles.row}>
            <div className={styles.statCard}>
              <p>₦{verifier?.total_earned_ngn?.toLocaleString() ?? 0}</p>
              <p>Earned</p>
            </div>
            <div className={styles.statCard}>
              <p>{remaining}</p>
              <p>Left today</p>
            </div>
          </div>
          <p className={styles.msg}>You're a verified verifier.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate("/verifier/dashboard")}>
            Go to Dashboard <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Get paid to verify" prevTitle="Profile" backHref="/profile" />
        <div className={styles.content}>
          <div className={styles.pending}>
            <p>Your application is pending review. We&apos;ll notify you once approved.</p>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Get paid to verify" prevTitle="Profile" backHref="/profile" />
        <div className={styles.content}>
          <div className={styles.card} style={{ textAlign: "center", padding: "40px 16px" }}>
            <Check size={40} strokeWidth={2} style={{ color: "var(--verified)", marginBottom: 12 }} />
            <p className={styles.success}>{msg}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Get paid to verify" prevTitle="Profile" backHref="/profile" />
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1>Earn ₦2,000 per property verification</h1>
          <p>Walk to nearby rental listings, record a short video walkthrough, and get paid. Up to 10 verifications per day.</p>
        </div>

        {/* How it works */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>How it works</p>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepBody}><span className={styles.stepLabel}>Apply</span> by submitting your ID and a photo of you holding your phone. We&apos;ll review and get back to you.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepBody}><span className={styles.stepLabel}>Find nearby listings</span> on your dashboard. You&apos;ll see properties within a 30-minute walk.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepBody}><span className={styles.stepLabel}>Walk to the property</span> and record a 30-second video walkthrough using the in-app camera. Your location is saved automatically.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>4</div>
            <div className={styles.stepBody}><span className={styles.stepLabel}>Get paid</span> ₦2,000 into your RentMe wallet for each approved verification. You can do up to 10 per day.</div>
          </div>
        </div>

        {/* Requirements */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>What you need</p>
          <div className={styles.step}>
            <div className={styles.stepNum}>✓</div>
            <div className={styles.stepBody}>A valid government-issued ID like a driver&apos;s license, national ID, passport, or voter&apos;s card.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>✓</div>
            <div className={styles.stepBody}>A smartphone with a working camera and GPS.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>✓</div>
            <div className={styles.stepBody}>You need to be physically close to listings so you can walk to the property yourself.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>✓</div>
            <div className={styles.stepBody}>Your video must clearly show the property inside and out, and be at least 10 seconds long.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>✓</div>
            <div className={styles.stepBody}>Don&apos;t share or fake any information. If you do, you&apos;ll be permanently banned from the program.</div>
          </div>
        </div>

        {/* Video tips */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Tips for a good verification video</p>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepBody}>Start outside so the building entrance and street are visible.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepBody}>Walk through each room slowly and show the walls, floor, and ceiling.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepBody}>Point out any damages, recent renovations, or special features.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>4</div>
            <div className={styles.stepBody}>Keep the camera steady. Landscape orientation works best.</div>
          </div>
        </div>

        {/* Apply form */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Upload ID</p>
          <div className={styles.uploadRow}>
            <div className={styles.uploadBox} onClick={() => idRef.current?.click()}>
              {idUrl ? <img src={idUrl} alt="ID" /> : <><Camera size={24} /><span>Government-issued ID</span></>}
            </div>
            <input ref={idRef} type="file" accept="image/*" hidden onChange={() => readFile(idRef, setIdUrl)} />
          </div>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Photo holding your phone</p>
          <div className={styles.uploadRow}>
            <div className={styles.uploadBox} onClick={() => phoneRef.current?.click()}>
              {phonePhotoUrl ? <img src={phonePhotoUrl} alt="Phone" /> : <><Camera size={24} /><span>You holding your phone</span></>}
            </div>
            <input ref={phoneRef} type="file" accept="image/*" hidden onChange={() => readFile(phoneRef, setPhonePhotoUrl)} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.checkRow}>
            <input type="checkbox" id="terms" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <label htmlFor="terms">I agree to the Verifier Terms of Service</label>
          </div>
          <p className={styles.terms}>
            By checking this box, you agree to conduct verifications in person, record accurate video walkthroughs, and not share or falsify information. RentMe may review your submissions and revoke your verifier status for violations.
          </p>
        </div>

        <button type="button" className={styles.primaryBtn} onClick={handleSubmit}>
          Apply Now
        </button>

        {msg && <p className={[styles.msg, msg.includes("error") ? styles.error : styles.success].join(" ")}>{msg}</p>}
      </div>
    </div>
  );
}
