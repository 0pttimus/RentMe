import { useState } from "react";
import { ArrowLeft, X, ShieldCheck, Video, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { switchToTl } from "@/store/slices/accountSlice";
import styles from "./WorkerEditPage.module.scss";

export default function WorkerEditPage() {
  const dispatch = useAppDispatch();
  const [profilePic] = useState("https://picsum.photos/seed/worker-emeka/400/400");
  const [name, setName] = useState("Emeka Okafor");
  const [nickname, setNickname] = useState("Emeka");
  const [location, setLocation] = useState("Lekki Phase 1, Lagos");
  const [bio, setBio] = useState("Licensed plumber with 8+ years experience. Fast response time.");
  const [chargeType, setChargeType] = useState<"fixed" | "negotiable">("fixed");
  const [fixedAmount, setFixedAmount] = useState("8000");
  const [minAmount, setMinAmount] = useState("5000");
  const [maxAmount, setMaxAmount] = useState("12000");
  const [idVerified, setIdVerified] = useState(false);
  const [portfolio, setPortfolio] = useState<{ type: "image" | "video"; src: string }[]>([
    { type: "image", src: "https://picsum.photos/seed/emeka-work-1/400/300" },
    { type: "image", src: "https://picsum.photos/seed/emeka-work-2/400/300" },
    { type: "image", src: "https://picsum.photos/seed/emeka-work-3/400/300" },
  ]);
  const [available, setAvailable] = useState(true);

  const handleAddPortfolio = (type: "image" | "video") => {
    const seed = `work-${Date.now()}`;
    const src = type === "image"
      ? `https://picsum.photos/seed/${seed}/400/300`
      : "https://www.w3schools.com/html/mov_bbb.mp4";
    setPortfolio((prev) => [...prev, { type, src }]);
  };

  const handleRemovePortfolio = (i: number) => {
    setPortfolio((prev) => prev.filter((_, idx) => idx !== i));
  };

  const canGoOnline = !!(profilePic && portfolio.length > 0 && idVerified);

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className={styles.header}>
        <Link to="/freelance/home" className={styles.back}>
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <h1 className={styles.heading}>Edit Profile</h1>
      </div>

      <div className={styles.avatarSection}>
        <img src={profilePic} alt="" className={styles.avatar} />
        <button className={styles.changePhoto} type="button">Change photo</button>
        {!profilePic && <p className={styles.hint}>Profile picture required to go online</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Real name (private)</label>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Nickname (what tenants see)</label>
        <input className={styles.input} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Emeka, Chef Mike" />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Location</label>
        <input className={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>About</label>
        <textarea className={styles.textarea} value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Charge type</label>
        <div className={styles.segmented}>
          <button
            className={chargeType === "fixed" ? styles.segActive : styles.seg}
            onClick={() => setChargeType("fixed")}
            type="button"
          >
            Fixed price
          </button>
          <button
            className={chargeType === "negotiable" ? styles.segActive : styles.seg}
            onClick={() => setChargeType("negotiable")}
            type="button"
          >
            Negotiable
          </button>
        </div>
      </div>

      {chargeType === "fixed" ? (
        <div className={styles.field}>
          <label className={styles.label}>Price (₦)</label>
          <input
            className={styles.input}
            inputMode="numeric"
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      ) : (
        <div className={styles.priceGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Min (₦)</label>
            <input
              className={styles.input}
              inputMode="numeric"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Max (₦)</label>
            <input
              className={styles.input}
              inputMode="numeric"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
      )}

      <div className={styles.idSection}>
        <div className={styles.idRow}>
          <ShieldCheck size={18} className={styles.idIcon} strokeWidth={1.75} />
          <div>
            <p className={styles.idLabel}>ID Verification</p>
            <p className={styles.idHint}>Upload a government-issued ID to build trust</p>
          </div>
        </div>
        {idVerified ? (
          <span className={styles.idDone}>Verified ✓</span>
        ) : (
          <button className={styles.idUpload} onClick={() => setIdVerified(true)} type="button">
            Upload ID
          </button>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Portfolio · pictures & videos ({portfolio.length})</label>
        <div className={styles.portfolioGrid}>
          {portfolio.map((item, i) => (
            <div key={i} className={styles.portfolioItem}>
              {item.type === "image" ? (
                <img src={item.src} alt="" />
              ) : (
                <div className={styles.videoBadge}>
                  <video src={item.src} preload="metadata" muted playsInline />
                  <span className={styles.playIcon}>▶</span>
                </div>
              )}
              <button className={styles.removeBtn} onClick={() => handleRemovePortfolio(i)} type="button">
                <X size={12} strokeWidth={2.5} />
              </button>
              <span className={styles.typeLabel}>{item.type === "image" ? "📷" : "🎬"}</span>
            </div>
          ))}
          <button className={styles.addBtn} onClick={() => handleAddPortfolio("image")} type="button">
            <ImageIcon size={18} strokeWidth={1.75} />
          </button>
          <button className={styles.addBtn} onClick={() => handleAddPortfolio("video")} type="button">
            <Video size={18} strokeWidth={1.75} />
          </button>
        </div>
        {!canGoOnline && (
          <p className={styles.hint}>
            {!profilePic && "Add a profile picture. "}
            {portfolio.length === 0 && "Add at least one picture or video. "}
            {!idVerified && "Verify your ID. "}
            All required to go online.
          </p>
        )}
      </div>

      <div className={styles.toggleRow}>
        <div>
          <p className={styles.toggleLabel}>Available for work</p>
          <p className={styles.toggleHint}>{canGoOnline ? "Toggle off to hide from clients" : "Complete requirements above to go online"}</p>
        </div>
        <button
          className={[styles.toggle, (available && canGoOnline) ? styles.toggleOn : ""].filter(Boolean).join(" ")}
          onClick={() => setAvailable((v) => !v)}
          disabled={!canGoOnline}
          type="button"
          role="switch"
          aria-checked={available && canGoOnline}
        >
          <span className={styles.thumb} />
        </button>
      </div>

      <button className={styles.saveBtn} type="button">Save changes</button>

      <div className={styles.switchSection}>
        <button
          className={styles.switchBack}
          onClick={() => dispatch(switchToTl())}
          type="button"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Switch back to Tenant/Landlord
        </button>
      </div>
    </div>
  );
}
