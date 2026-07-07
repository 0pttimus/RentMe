import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, Check, MapPin, Navigation, X, ShieldCheck, Video, Image as ImageIcon, Lock } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { switchToTl } from "@/store/slices/accountSlice";
import { getFreelanceProfile, upsertFreelanceProfile } from "@/lib/api/client";
import { nigeriaLocations } from "@/lib/nigeria-locations";
import { useToast } from "@/components/ui/Toast";
import styles from "./WorkerEditPage.module.scss";

function fmt(n: string): string {
  if (!n) return "";
  return Number(n).toLocaleString("en-NG");
}

const ALL_CATEGORIES = [
  "Electrician", "Home Mechanic", "First Aid", "Home Baby Delivery",
  "Chef", "Plumber", "Furniture", "Cleaning Services", "Movers",
  "Home Decorations", "Painters", "Solar/Inverter Engineers",
  "Makeup Artists", "Hair Dresser", "Pedicure", "Private Massage",
  "Gardeners", "Security", "House Help", "Nanny",
];

export default function WorkerEditPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { show } = useToast();
  const user = useAppSelector((s) => s.auth.user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [pricingType, setPricingType] = useState<"fixed" | "negotiable">("fixed");
  const [fixedPrice, setFixedPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [portfolio, setPortfolio] = useState<{ type: "image" | "video"; src: string }[]>([]);
  const [available, setAvailable] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [gender, setGender] = useState("");
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [detectedLoc, setDetectedLoc] = useState<{ state: string; area: string; lat: number; lng: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string>("");
  const [bannerSrc, setBannerSrc] = useState<string>("");
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const res = await getFreelanceProfile();
      if (res.data?.profile) {
        const p = res.data.profile;
        setProfileId(p.id);
        setDisplayName(p.displayName);
        setCategories(p.categories);
        setBio(p.bio ?? "");
        setPricingType(p.pricingType as "fixed" | "negotiable");
        setFixedPrice(p.fixedPrice ? String(p.fixedPrice) : "");
        setMinPrice(p.minPrice ? String(p.minPrice) : "");
        setMaxPrice(p.maxPrice ? String(p.maxPrice) : "");
        setPortfolio(p.portfolio.map((item) => ({ type: item.type as "image" | "video", src: item.src })));
        setAvailable(p.isAvailable);
        if (p.gender) setGender(p.gender);
        if (p.locationState) setLocationState(p.locationState);
        if (p.locationArea) setLocationArea(p.locationArea);
        if (p.locationLat !== null) setLocationLat(p.locationLat);
        if (p.locationLng !== null) setLocationLng(p.locationLng);
        if (p.bannerUrl) setBannerSrc(p.bannerUrl);
      } else {
        setDisplayName("");
      }
      setAvatarSrc(user?.avatarUrl ?? "");
      setLoading(false);
    })();
  }, []);

  const locationSuggestions = useMemo(() => {
    if (!locationQuery.trim()) return [];
    const q = locationQuery.toLowerCase();
    const seen = new Set<string>();
    const out: { label: string; state: string; area: string }[] = [];
    for (const l of nigeriaLocations) {
      if (l.state.toLowerCase().includes(q) && !seen.has(l.state)) {
        seen.add(l.state);
        out.push({ label: l.state, state: l.state, area: "" });
      }
      for (const a of l.areas) {
        if (a.toLowerCase().includes(q) && !seen.has(`${l.state}|${a}`)) {
          seen.add(`${l.state}|${a}`);
          out.push({ label: `${a}, ${l.state}`, state: l.state, area: a });
        }
      }
    }
    return out.slice(0, 10);
  }, [locationQuery]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      show("Geolocation is not available in your browser.");
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`,
            { headers: { "User-Agent": "RentMe/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          // try to find a matching state + area in our location list
          let matchState = "";
          let matchArea = "";
          const addrState = (addr.state || addr.region || "").toLowerCase();
          const addrCity = (addr.city || addr.town || addr.village || addr.county || "").toLowerCase();
          for (const l of nigeriaLocations) {
            if (l.state.toLowerCase().includes(addrState) || addrState.includes(l.state.toLowerCase())) {
              matchState = l.state;
              // try to match area
              for (const a of l.areas) {
                if (a.toLowerCase().includes(addrCity) || addrCity.includes(a.toLowerCase())) {
                  matchArea = a;
                  break;
                }
              }
              break;
            }
          }
          if (!matchState) {
            // fallback: just use the raw geo data
            matchState = addrState.charAt(0).toUpperCase() + addrState.slice(1) || "Unknown";
          }
          if (!matchArea && addrCity) {
            matchArea = addrCity.charAt(0).toUpperCase() + addrCity.slice(1);
          }
          setDetectedLoc({ state: matchState, area: matchArea, lat: latitude, lng: longitude });
        } catch {
          // if reverse geocode fails, just save coords
          setDetectedLoc({ state: "", area: "", lat: latitude, lng: longitude });
        }
        setDetectingLoc(false);
      },
      () => {
        show("Could not detect location. Check your device location settings.");
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const confirmDetectedLoc = () => {
    if (!detectedLoc) return;
    setLocationState(detectedLoc.state);
    setLocationArea(detectedLoc.area);
    setLocationLat(detectedLoc.lat);
    setLocationLng(detectedLoc.lng);
    setLocationQuery(detectedLoc.area ? `${detectedLoc.area}, ${detectedLoc.state}` : detectedLoc.state);
    setDetectedLoc(null);
  };

  const dismissDetectedLoc = () => {
    setDetectedLoc(null);
  };

  // ponytail: close pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (pickerRef.current?.contains(e.target)) return;
      if (suggestRef.current?.contains(e.target)) return;
      setShowGenderPicker(false);
      setShowLocSuggestions(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleBannerPick = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBannerSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleAvatarPick = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleFilePick = (type: "image" | "video", file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPortfolio((prev) => [...prev, { type, src: String(reader.result) }]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePortfolio = (i: number) => {
    setPortfolio((prev) => prev.filter((_, idx) => idx !== i));
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      show("Display name is required.");
      return;
    }
    setSaving(true);
    const res = await upsertFreelanceProfile({
      displayName: displayName.trim(),
      categories,
      bio: bio.trim() || undefined,
      pricingType,
      fixedPrice: pricingType === "fixed" && fixedPrice ? Number(fixedPrice) : undefined,
      minPrice: pricingType === "negotiable" && minPrice ? Number(minPrice) : undefined,
      maxPrice: pricingType === "negotiable" && maxPrice ? Number(maxPrice) : undefined,
      portfolio,
      isAvailable: available,
      gender: gender || undefined,
      locationState: locationState || undefined,
      locationArea: locationArea || undefined,
      locationLat: locationLat ?? undefined,
      locationLng: locationLng ?? undefined,
      bannerUrl: bannerSrc || undefined,
      avatarUrl: avatarSrc || undefined,
    });
    setSaving(false);
    if (res.error) {
      show(res.error);
    } else {
      show("Profile saved.", "success");
      navigate("/freelance/home");
    }
  };

  const canGoOnline = !!(displayName && portfolio.length > 0);

  if (loading) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <div className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)} type="button">
            <ChevronLeft size={22} strokeWidth={3} />
            <span className={styles.backLabel}>Back</span>
          </button>
          <h1 className={styles.heading}>Edit Profile</h1>
        </div>
        <div className="spinnerWrap"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} type="button">
          <ChevronLeft size={22} strokeWidth={3} />
          <span className={styles.backLabel}>Back</span>
        </button>
        <h1 className={styles.heading}>{profileId ? "Edit Profile" : "Create Profile"}</h1>
      </div>

      <div className={styles.avatarSection}>
        <button className={styles.avatarBtn} onClick={() => avatarInputRef.current?.click()} type="button">
          <img
            src={avatarSrc || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || user?.fullName || "?")}&background=247a52&color=fff&size=192`}
            alt=""
            className={styles.avatar}
          />
          <span className={styles.avatarOverlay}>
            <ImageIcon size={18} strokeWidth={1.5} />
          </span>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={(e) => handleAvatarPick(e.target.files?.[0])} />
        <button className={styles.bannerBtn} onClick={() => bannerInputRef.current?.click()} type="button">
          {bannerSrc ? (
            <img src={bannerSrc} alt="" className={styles.bannerPreview} />
          ) : (
            <div className={styles.bannerPlaceholder}>
              <ImageIcon size={24} strokeWidth={1.5} />
              <span>Tap to set cover banner</span>
            </div>
          )}
        </button>
        <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={(e) => handleBannerPick(e.target.files?.[0])} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Real name (from ID verification)</label>
        <div className={styles.realNameRow}>
          <input className={[styles.input, styles.inputDisabled].join(" ")} value={user?.fullName ?? ""} disabled />
          <Lock size={14} className={styles.lockIcon} strokeWidth={2} />
        </div>
        <p className={styles.hint}>Verified through government ID. Update by completing KYC.</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Display name (what clients see)</label>
        <input className={styles.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Emeka, Chef Mike" />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Gender</label>
        <div className={styles.pickerWrap} ref={pickerRef}>
          <button className={styles.pickerButton} onClick={() => setShowGenderPicker(!showGenderPicker)} type="button">
            <span style={{ color: gender ? undefined : "var(--color-ink-faint)" }}>
              {gender || "Select gender"}
            </span>
            <ChevronDown size={16} strokeWidth={2.5} />
          </button>
          {showGenderPicker && (
            <div className={styles.pickerDropdown}>
              {["Male", "Female", "Rather not say"].map((g) => (
                <button
                  key={g}
                  className={[styles.pickerOption, g === gender ? styles.pickerOptionActive : ""].join(" ")}
                  onClick={() => { setGender(g); setShowGenderPicker(false); }}
                  type="button"
                >
                  {g === gender && <Check size={14} strokeWidth={3} className={styles.pickerCheck} />}
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.field} ref={locationRef}>
        <label className={styles.label}>Location</label>
        <div className={styles.locRow}>
          <div className={styles.locInputWrap}>
            <MapPin size={16} className={styles.locInputIcon} strokeWidth={1.5} />
            <input
              className={styles.input}
              value={locationQuery}
              onChange={(e) => { setLocationQuery(e.target.value); setShowLocSuggestions(true); }}
              onFocus={() => setShowLocSuggestions(true)}
              placeholder="Search city or area..."
            />
            {locationQuery && (
              <button className={styles.locClear} onClick={() => { setLocationQuery(""); setLocationState(""); setLocationArea(""); setLocationLat(null); setLocationLng(null); }} type="button">
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
          <button className={styles.detectBtn} onClick={handleDetectLocation} disabled={detectingLoc} type="button" title="Detect automatically">
            <Navigation size={16} strokeWidth={2} className={detectingLoc ? styles.detectSpin : ""} />
          </button>
        </div>
        {showLocSuggestions && locationSuggestions.length > 0 && (
          <div className={styles.locSuggestions} ref={suggestRef}>
            {locationSuggestions.map((s, i) => (
              <button
                key={i}
                className={styles.locSuggestion}
                onClick={() => {
                  setLocationQuery(s.label);
                  setLocationState(s.state);
                  setLocationArea(s.area);
                  setShowLocSuggestions(false);
                }}
                type="button"
              >
                <MapPin size={14} strokeWidth={1.5} />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Services you offer</label>
        <div className={styles.pillGrid}>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={[styles.catPill, categories.includes(cat) ? styles.catPillActive : ""].filter(Boolean).join(" ")}
              onClick={() => toggleCategory(cat)}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>About you</label>
        <textarea className={styles.textarea} value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} placeholder="Tell clients about yourself..." />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Charge type</label>
        <div className={styles.segmented}>
          <button
            className={pricingType === "fixed" ? styles.segActive : styles.seg}
            onClick={() => setPricingType("fixed")}
            type="button"
          >
            Fixed price
          </button>
          <button
            className={pricingType === "negotiable" ? styles.segActive : styles.seg}
            onClick={() => setPricingType("negotiable")}
            type="button"
          >
            Negotiable
          </button>
        </div>
      </div>

      {pricingType === "fixed" ? (
        <div className={styles.field}>
          <label className={styles.label}>Price (₦)</label>
          <input
            className={styles.input}
            inputMode="numeric"
            value={fmt(fixedPrice)}
            onChange={(e) => setFixedPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="8,000"
          />
        </div>
      ) : (
        <div className={styles.priceGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Min (₦)</label>
            <input
              className={styles.input}
              inputMode="numeric"
              value={fmt(minPrice)}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="5,000"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Max (₦)</label>
            <input
              className={styles.input}
              inputMode="numeric"
              value={fmt(maxPrice)}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="12,000"
            />
          </div>
        </div>
      )}

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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <span className={styles.typeLabel}>{item.type === "image" ? "📷" : "🎬"}</span>
            </div>
          ))}
          <button className={styles.addBtn} onClick={() => imageInputRef.current?.click()} type="button">
            <ImageIcon size={18} strokeWidth={1.75} />
          </button>
          <button className={styles.addBtn} onClick={() => videoInputRef.current?.click()} type="button">
            <Video size={18} strokeWidth={1.75} />
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(e) => handleFilePick("image", e.target.files?.[0])} />
          <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => handleFilePick("video", e.target.files?.[0])} />
        </div>
      </div>

      <div className={styles.idSection}>
        <div className={styles.idRow}>
          <ShieldCheck size={18} className={styles.idIcon} strokeWidth={1.75} />
          <div>
            <p className={styles.idLabel}>ID Verification</p>
            <p className={styles.idHint}>Verify your identity to unlock trust badges and more visibility. Your real name will automatically update from your ID.</p>
          </div>
        </div>
        {user?.kycStatus === "verified" ? (
          <span className={styles.idDone}>Verified ✓</span>
        ) : (
          <button className={styles.idUpload} onClick={() => navigate("/kyc")} type="button">
            Verify ID
          </button>
        )}
      </div>

      <div className={styles.toggleRow}>
        <div>
          <p className={styles.toggleLabel}>Available for work</p>
          <p className={styles.toggleHint}>{canGoOnline ? "Toggle off to hide from clients" : "Add a display name and portfolio to go online"}</p>
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

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving} type="button">
        {saving ? "Saving..." : "Save"}
      </button>

      {detectedLoc && (
        <div className={styles.sheetOverlay} onClick={dismissDetectedLoc}>
          <div className={styles.sheet} data-sheet onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetTitle}>Confirm location</div>
            <p className={styles.sheetDesc}>
              {detectedLoc.state}{detectedLoc.area ? `, ${detectedLoc.area}` : ""}
            </p>
            <div className={styles.sheetActions}>
              <button className={styles.sheetBtnPrimary} onClick={confirmDetectedLoc} type="button">
                Yes, that's correct
              </button>
              <button className={styles.sheetBtnSecondary} onClick={dismissDetectedLoc} type="button">
                No, I'll enter it manually
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.switchSection}>
        <button
          className={styles.switchBack}
          onClick={() => dispatch(switchToTl())}
          type="button"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Switch back to Tenant/Landlord
        </button>
      </div>
    </div>
  );
}
