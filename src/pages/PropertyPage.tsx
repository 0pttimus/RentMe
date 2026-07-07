import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Bookmark, BookmarkCheck, Edit3, TrendingUp, Check, Bell, BellOff, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { VerifiedBadge, TrustBadge, Pill } from "@/components/ui/Badge";
import ImageCarousel from "@/components/ImageCarousel";
import FullscreenViewer from "@/components/FullscreenViewer";
import { formatNaira } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { getProperty, addBookmark, removeBookmark, getBookmarkStatus, getPriceHistory, subscribeAlert, unsubscribeAlert, getAlertStatus, getVerificationCount } from "@/lib/api/client";
import styles from "./PropertyPage.module.scss";

const PERIODS = ["any", "daily", "weekly", "monthly", "yearly"] as const;
const DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };

function calculatePrice(basePrice: number, basePeriod: string, targetPeriod: string, duration = 1): number {
  const baseDays = DAYS[basePeriod] ?? 365;
  const targetDays = (DAYS[targetPeriod] ?? 365) * duration;
  return Math.round((basePrice / baseDays) * targetDays);
}

export default function PropertyPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAppSelector((s) => s.auth.user);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [alertSubscribed, setAlertSubscribed] = useState(false);
  const [priceHistory, setPriceHistory] = useState<{ price: number; changed_at: string }[]>([]);
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [duration, setDuration] = useState(1);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [verificationCount, setVerificationCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProperty(id).then((res) => {
      if (res.data?.property) {
        const p = res.data.property;
        setProperty(p);
        setSelectedPeriod(p.rentPeriod);
        setDuration(p.rentDuration ?? 1);
        getBookmarkStatus(id).then((r) => setBookmarked(r.data?.bookmarked ?? false));
        getPriceHistory(id).then((r) => setPriceHistory(r.data?.history ?? []));
        getAlertStatus(id).then((r) => setAlertSubscribed(r.data?.subscribed ?? false));
        getVerificationCount(id).then((r) => setVerificationCount(r.data?.count ?? 0));
      }
      setLoading(false);
    });
  }, [id]);

  const toggleBookmark = async () => {
    if (!id) return;
    if (bookmarked) {
      await removeBookmark(id);
      setBookmarked(false);
    } else {
      await addBookmark(id);
      setBookmarked(true);
    }
  };

  const toggleAlert = async () => {
    if (!id) return;
    if (alertSubscribed) {
      await unsubscribeAlert(id);
      setAlertSubscribed(false);
    } else {
      await subscribeAlert(id);
      setAlertSubscribed(true);
    }
  };

  if (loading) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <div className="spinnerWrap"><div className="spinner" /></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <button type="button" onClick={() => navigate("/markets")} className={styles.back} aria-label="Back">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <p className={styles.loading}>Property not found.</p>
      </div>
    );
  }

  const mediaItems = [
    ...property.photos.map((src: string) => ({ type: "image" as const, src })),
  ];
  const isOwner = user?.id === property.landlordId;
  const displayPrice = selectedPeriod ? calculatePrice(property.rentAmountNgn, property.rentPeriod, selectedPeriod, selectedPeriod === "any" ? 1 : duration) : property.rentAmountNgn;

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <button type="button" onClick={() => navigate(-1)} className={styles.back} aria-label="Back">
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>

      {mediaItems.length > 0 ? (
        <ImageCarousel
          items={mediaItems}
          aspectRatio={16 / 9}
          className={styles.hero}
          onItemClick={(i) => setFullscreenIndex(i)}
        />
      ) : (
        <div className={styles.hero}>
          <div className={styles.heroPlaceholder}>No images</div>
        </div>
      )}

      <div className={styles.titleRow}>
        <h1 className={styles.title}>{property.title}</h1>
        <div className={styles.titleActions}>
          {isOwner && (
            <Link to={`/property/${id}/edit`} className={styles.iconBtn} aria-label="Edit">
              <Edit3 size={18} strokeWidth={1.75} />
            </Link>
          )}
          <button type="button" className={styles.iconBtn} onClick={toggleBookmark} aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}>
            {bookmarked ? <BookmarkCheck size={18} strokeWidth={1.75} fill="currentColor" /> : <Bookmark size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
      <p className={styles.address}>{property.address}, {property.city}, {property.state}</p>

      <div className={styles.priceBlock}>
        <p className={styles.price}>
          {formatNaira(displayPrice)}{" "}
          <span className={styles.priceUnit}>/ {selectedPeriod}{selectedPeriod !== "any" && duration > 1 ? ` (×${duration})` : ""}</span>
        </p>
        {selectedPeriod !== property.rentPeriod && (
          <p className={styles.priceNote}>
            {formatNaira(property.rentAmountNgn)} / {property.rentPeriod} base
          </p>
        )}
        <p className={styles.feeNote}>includes 0.5% platform fee</p>
      </div>

      {/* iOS-style period picker */}
      <div className={styles.periodPicker}>
        <button type="button" className={styles.periodPickerToggle} onClick={() => setPeriodPickerOpen(!periodPickerOpen)}>
          Rent by: <strong>{selectedPeriod === "any" ? "Any" : selectedPeriod}</strong>
          <ChevronLeft size={14} strokeWidth={2} className={periodPickerOpen ? styles.chevronDown : styles.chevronRight} />
        </button>
        {periodPickerOpen && (
          <div className={styles.periodPickerDropdown}>
            {PERIODS.map((p) => (
              <button key={p} type="button"
                className={[styles.periodOption, selectedPeriod === p ? styles.periodOptionActive : ""].join(" ")}
                onClick={() => { setSelectedPeriod(p); setPeriodPickerOpen(false); }}
              >
                <span>
                  <span className={styles.periodOptionLabel}>{p === "any" ? "Any" : p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  <span className={styles.periodOptionPrice}>{p === "any" ? "Flexible" : formatNaira(calculatePrice(property.rentAmountNgn, property.rentPeriod, p, duration))}</span>
                </span>
                {selectedPeriod === p && <Check size={16} strokeWidth={3} className={styles.periodCheck} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Duration selector */}
      {selectedPeriod && selectedPeriod !== "any" && (
        <div className={styles.durationRow}>
          <button type="button" className={styles.durationBtn} onClick={() => setDuration(Math.max(1, duration - 1))} disabled={duration <= 1}>–</button>
          <span className={styles.durationValue}>{duration} {selectedPeriod === "daily" ? "day" : selectedPeriod === "weekly" ? "week" : selectedPeriod === "monthly" ? "month" : "year"}{duration > 1 ? "s" : ""}</span>
          <button type="button" className={styles.durationBtn} onClick={() => setDuration(Math.min(selectedPeriod === "yearly" ? 2 : 365, duration + 1))} disabled={duration >= (selectedPeriod === "yearly" ? 2 : 365)}>+</button>
        </div>
      )}

      <div className={styles.badges}>
        {property.isVerified && <VerifiedBadge />}
        {verificationCount >= 5 ? (
          <Pill>✓ {verificationCount} verifications</Pill>
        ) : (
          <Pill>{verificationCount}/5 verified</Pill>
        )}
        <Pill>#{property.passportNumber ?? "N/A"}</Pill>
      </div>

      {priceHistory.length > 1 && (
        <div className={styles.priceHistorySection}>
          <button type="button" className={styles.priceHistoryToggle} onClick={() => setShowPriceHistory(!showPriceHistory)}>
            <TrendingUp size={14} strokeWidth={2} />
            Price history ({priceHistory.length})
            <ChevronLeft size={14} strokeWidth={2} className={showPriceHistory ? styles.chevronUp : ""} />
          </button>
          {showPriceHistory && (
            <div className={styles.priceHistoryList}>
              {priceHistory.slice(0, 10).map((h, i) => (
                <div key={i} className={styles.priceHistoryRow}>
                  <span>{formatNaira(h.price)}</span>
                  <span>{new Date(h.changed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {property.description && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>About this property</h2>
          <p className={styles.description}>{property.description}</p>
        </div>
      )}

      <Card className={styles.passport}>
        <p className={styles.passportTitle}>Property passport</p>
        <div className={styles.passportList}>
          <div className={styles.passportRow}>
            <span>Status</span>
            <span>{property.passportVerificationStatus}</span>
          </div>
          <div className={styles.passportRow}>
            <span>Prior tenancies</span>
            <span>{property.passportPriorTenancies}</span>
          </div>
          {property.passportLastInspection && (
            <div className={styles.passportRow}>
              <span>Last updated</span>
              <span>{new Date(property.passportLastInspection).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className={styles.landlord}>
        <div className={styles.landlordRow}>
          <div className={styles.landlordAvatar}>
            {property.landlordAvatar ? (
              <img src={property.landlordAvatar} alt="" className={styles.landlordAvatarImg} />
            ) : (
              property.landlordInitials
            )}
          </div>
          <div className={styles.landlordInfo}>
            <p className={styles.landlordName}>{property.landlordName}</p>
            <p className={styles.landlordMeta}>Landlord</p>
          </div>
          <TrustBadge level={property.trustScore >= 700 ? "Trusted" : property.trustScore >= 400 ? "Average" : "Risk"} />
        </div>
      </Card>

      {!isOwner && ["available", "pending_verification", "verified"].includes(property.status) && (
        <Link to={`/reserve/${property.id}`} state={{ period: selectedPeriod, duration }} className={styles.reserveBtn}>
          Reserve · ₦50,000 deposit
        </Link>
      )}
      {!isOwner && (property.status === "pending_reservation" || property.status === "reserved") && (
        <div className={styles.reservedBlock}>
          <div className={styles.reservedLabel}><Clock size={14} strokeWidth={2} /> Someone reserved this property</div>
          <button type="button" className={styles.alertBtn} onClick={toggleAlert}>
            {alertSubscribed ? <BellOff size={14} strokeWidth={2} /> : <Bell size={14} strokeWidth={2} />}
            {alertSubscribed ? "Notification set" : "Notify me of status"}
          </button>
        </div>
      )}

      {fullscreenIndex !== null && (
        <FullscreenViewer
          items={mediaItems}
          initialIndex={fullscreenIndex}
          onClose={() => setFullscreenIndex(null)}
        />
      )}
    </div>
  );
}
